"use client";

/**
 * 🆕 2026-10-20 聖上指示: 公開預覽頁 (用 share_slug)
 *
 * 路徑: /story-blog-custom/preview/[slug]
 *
 * 流程:
 *   1. 從 params.slug 讀 8 碼
 *   2. GET /api/story-books?slug=<slug> → 拿到 book + posts + is_owner
 *   3. 顯示書封面 + 作者 + 版型 + 章節 + 「輸出 PDF」按鈕
 *   4. 若 is_owner → 多一個「編輯」按鈕 (帶 token 跳回 /story-blog-custom?book_id=...#token=...)
 *   5. 「輸出 PDF」→ POST /api/story-blog/print-pdf?slug=<slug>&range=1-N
 *
 * 設計:
 *   - 聖上 USER 偏好:別人看見的是「完整書本視覺」, 而不是後台編輯介面
 *   - 即時頁數顯示, 跟 custom 頁一致
 */

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { estimatePageCount } from "@/utils/story-books/page-math";
import {
  planPairLayout,
  photoBaseMm,
  type PairLayoutResult,
} from "@/utils/story-books/pair-layout";
import {
  useAdaptiveFontSize,
  allFontSizesReadyPredicate,
  MIN_PT_PAIR,
  MAX_PT_PAIR,
  MIN_PT_SINGLE,
  MAX_PT_SINGLE,
} from "@/utils/story-books/adaptive-font-size";
import "../../custom-book.css";
// 🆕 10-20: 印刷模式直接 reuse /story-blog-print 的排版 token
import "../../../story-blog-print/print-book.css";
import "./print-mode.css";

type PostRow = {
  id: string;
  day_number: number;
  sort_order: number;
  title: string | null;
  content: string;
  image_url: string | null;
  layout_type: "left-image" | "right-image" | "top-image";
  frame_style: "vermilion" | "polaroid" | "ink" | "wash";
};

type Book = {
  book_id: string;
  author_name: string;
  share_slug: string;
  is_public: boolean;
  title: string;
  layout_mode: "A" | "B" | "C";
  selected_post_ids: string[];
  page_count_estimate: number;
  view_count: number;
  author_token?: string;
  updated_at?: string;
  created_at?: string;
};

/** 一個章節 = 一個 Day + 本章文章(順序 = 作者編輯的相對順序) */
type Chapter = {
  day: number;
  posts: PostRow[];
  /** 本章第一篇在全書的篇序(0-based) */
  start: number;
};

/**
 * 🆕 2026-11-18 移除 emoji 的 ZWJ (U+200D) 連接符。
 *
 * 為什麼：正式 PDF 第 14 頁標題「…能上崗？ 🙋‍♂」的 🙋‍♂ 顯示成
 * 「方框內有叉號」（.notdef）。原因是自帶的 Noto Emoji（單色 glyf）
 * **沒有 ZWJ ligature**（GSUB 只有 ccmp），Chromium 把整個 grapheme
 * cluster 當成一個字串做 font fallback → 找不到能渲染整串的字型
 * → 整串落到 .notdef。
 *
 * 實測（scripts/font/test-zwj-render.mjs）：
 *   "🙋\u200d♂\uFE0F"  寬度 40.0px（= 一個 .notdef 方框）
 *   "🙋♂\uFE0F"       寬度 90.8px（= 兩個正常 glyph）
 *
 * 解法：拿掉 ZWJ → 變成兩個各自有字型的 glyph（🙋 與 ♂），視覺正常。
 * 這是跨平台最穩的做法：macOS 的系統 emoji 字型本來就支援 ZWJ 合成，
 * 但線上 Linux 只會用我們自帶的子集 → 兩邊行為一致更重要。
 *
 * ⚠️ 只影響「顯示層」，不動資料庫內容。
 */
function stripZwj(text: string | null | undefined): string {
  if (!text) return "";
  // eslint-disable-next-line no-control-regex
  return text.replace(/‍/g, "");
}

const DAY_LABEL: Record<number, string> = {
  0: "序章",
  1: "Day 01 · 搭乘春秋航空抵達上海",
  2: "Day 02 · 體會上海魔都",
  3: "Day 03 · 西塘古鎮體搖擼船",
  4: "Day 04 · 烏鎮西柵沈浸式體驗",
  5: "Day 05 · 烏鎮早茶客體驗",
  6: "Day 06 · 杭州宋城千古情",
  7: "Day 07 · 杭州宮宴遊西湖",
  8: "Day 08 · 遊南宋御街後返台",
  9: "後記",
};

export default function PreviewBookPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const router = useRouter();
  const sp = useSearchParams();

  // 🆕 10-20: Puppeteer PDF mode — 切換為 A5 印刷排版
  const isPrintMode = sp?.get("print") === "1";
  // 🆕 2026-11-15: 公開閱讀模式 — 跟 PDF 同一套 A5 排版,
  //   但在螢幕上加「上一頁 / 下一頁 / 下載 PDF」工具列,給訪客線上看書用。
  //   ⚠️ 與 print=1 分開:print=1 會被 Puppeteer 拍進 PDF,
  //      工具列不能出現在 PDF 裡,所以分成兩個模式。
  const isReadMode = sp?.get("read") === "1";

  const [book, setBook] = useState<Book | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [printing, setPrinting] = useState(false);
  const [pdfRange, setPdfRange] = useState("full");

  // 🆕 2026-11-15: 公開閱讀模式(讀=1)的翻頁狀態
  const [readPage, setReadPage] = useState(1);
  const [readPageTotal, setReadPageTotal] = useState(1);
  const [readerDownloading, setReaderDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  // ============================================================
  // 🆕 2026-11-14: mode B「一頁 2 則」版面配置 (瀏覽器實測 → 動態格高)
  // ============================================================
  // 流程:
  //   1) 先以「planning」模式渲染 (cell 高度 auto + 文字鎖 9pt)
  //   2) 等所有照片 load 完 (比例已知 → 文字繞排寬度才準)
  //   3) planPairLayout() 量每一格的真實需求 → 必要時縮照片級距
  //   4) 依需求比例把每頁可用高度分給兩格 → 移除 planning 模式
  //      → adaptive-font-size hook 依新格高重新放大字級填滿
  const printRootRef = useRef<HTMLElement | null>(null);
  const [pairPlan, setPairPlan] = useState<PairLayoutResult | null>(null);
  const [pairPlanDone, setPairPlanDone] = useState(false);

  // 🆕 2026-11-15: read mode 也要跑 mode B 的版面配置引擎,
  //   否則讀者看到的格高是未配置的原始狀態(照片沒縮、字級沒對齊)。
  const isModeB = (isPrintMode || isReadMode) && book?.layout_mode === "B";

  // ── 執行配置:等所有照片 load 完 → 量測 → 配置 ──
  useEffect(() => {
    if (!isModeB || pairPlanDone) return;
    const root = printRootRef.current;
    if (!root) return;

    let cancelled = false;
    const timer = setInterval(() => {
      if (cancelled) return;
      const imgs = Array.from(
        root.querySelectorAll<HTMLImageElement>(".print-book-b-cell img"),
      );
      const ready =
        imgs.length === 0 ||
        imgs.every((i) => i.complete && i.naturalWidth > 0);
      if (!ready) return;

      // 🆕 2026-11-14:等 webfont(思源宋體子集)載完再量測。
      //   字型沒到位就量 → 用 fallback 字型算出錯誤的行高/字級需求,
      //   結果就是照片被縮、字級被壓。document.fonts.ready 是 async,
      //   所以不能在這個 interval 裡直接量,改成 promise 鏈。
      //
      // 🆕 2026-11-18:明確 fonts.load() 兩份自帶字型。
      //   `document.fonts.ready` 只保證「已被觸發載入」的字型完成;
      //   沒被任何元素用到的字型不會載入 → 必須明確要求。
      //   標題用 PrintSansTC(思源黑體子集),內文用 PrintSerifTC(宋體子集)。
      //   少了這步,線上冷啟動時字型還沒到位就量測 → 豆腐字 + 版面算錯。
      clearInterval(timer);
      void (async () => {
        try {
          if (typeof document !== "undefined" && document.fonts) {
            await Promise.all([
              document.fonts.load('400 16px "PrintSerifTC"', "測試中文"),
              document.fonts.load('700 16px "PrintSerifTC"', "測試中文"),
              document.fonts.load('400 16px "PrintSansTC"', "測試中文"),
              document.fonts.load('700 16px "PrintSansTC"', "測試中文"),
              // 🆕 2026-11-18 補丁字型（emoji / 簡體 / 數學花體 / 符號）
              //   這幾個 family 只含少數字，沒明確 load 會在拍版後才到位 → 方框。
              document.fonts.load('400 16px "PrintEmoji"', "✈️⏱✅🎬📍"),
              document.fonts.load('400 16px "PrintSansSC"', "刚围应栅标缝阖静"),
              document.fonts.load('400 16px "PrintSansMath"', "𝓓𝓪𝔂"),
              document.fonts.load('400 16px "PrintSansSymbols2"', "➔➕❗❤"),
            ]);
            await document.fonts.ready;
          }
        } catch {
          /* 字型 API 不可用 → 略過 */
        }
        if (cancelled) return;
        const res = planPairLayout(root);
        if (cancelled) return;
        if (typeof window !== "undefined") {
          (window as unknown as { __pairPlan?: PairLayoutResult }).__pairPlan =
            res;
        }
        setPairPlan(res);
        setPairPlanDone(true);
      })();
    }, 250);

    // ── 保險:照片有的是壞的 / 慢,最多等 12 秒就照現況配置 ──
    const fallback = setTimeout(() => {
      if (cancelled) return;
      clearInterval(timer);
      void (async () => {
        try {
          if (typeof document !== "undefined" && document.fonts) {
            await document.fonts.ready;
          }
        } catch {
          /* 字型 API 不可用 → 略過 */
        }
        if (cancelled) return;
        setPairPlan(planPairLayout(root));
        setPairPlanDone(true);
      })();
    }, 12000);

    return () => {
      cancelled = true;
      clearInterval(timer);
      clearTimeout(fallback);
    };
  }, [isModeB, pairPlanDone]);

  // ── 版面定稿訊號(PDF route 等這個才開拍) ──
  useEffect(() => {
    if (!isModeB || !pairPlanDone) return;
    const root = printRootRef.current;
    if (!root) return;
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.setAttribute("data-layout-ready", "1");
      });
    });
    return () => cancelAnimationFrame(t);
  }, [isModeB, pairPlanDone]);

  // ============================================================
  // 1b. 瀏覽次數 +1（背景 function，fire-and-forget）
  // ============================================================
  // 🆕 2026-11-17: 計數改由 standalone background function `story-view-count`
  //   寫入 Netlify Blobs（不再用 Supabase RPC —— 正式站會全回 402
  //   exceed_cached_egress_quota，每個預覽請求都噴錯）。
  //
  //   為什麼在前端觸發而不是 GET /api/story-books 裡做：
  //   Blob 的 compare-and-swap 讀寫各約 500ms，放進 GET 路徑會讓
  //   每次預覽多等約 1 秒；併發時重試還可能撞 function 時間上限。
  //
  //   為什麼不在 print=1 時計數：
  //   print=1 是 Puppeteer 拍 PDF 用的，會被背景 function 載入同一頁。
  //   那是機器讀取，不是訪客瀏覽，不該計入。
  useEffect(() => {
    if (!slug) return;
    if (isPrintMode) return; // PDF 生成不算瀏覽
    // fire-and-forget：不 await、不阻塞、不影響預覽
    void fetch(
      `/.netlify/functions/story-view-count?slug=${encodeURIComponent(slug)}`,
      { method: "POST" },
    ).catch(() => {
      /* 計數失敗不影響預覽 */
    });
  }, [slug, isPrintMode]);

  // ============================================================
  // 1. 載入 (URL hash 帶 token 就順便校驗)
  // ============================================================
  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const token = window.location.hash.startsWith("#")
          ? new URLSearchParams(window.location.hash.slice(1)).get("token") || ""
          : "";
        const url = `/api/story-books?slug=${encodeURIComponent(slug)}`;
        const res = await fetch(url, token ? { headers: { "x-author-token": token } } : {});
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const json = await res.json();
        setBook(json.book);
        setPosts(json.posts || []);
        setIsOwner(!!json.is_owner);
      } catch (e) {
        setError(`載入失敗: ${(e as Error).message}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  // ============================================================
  // 2. 派生
  // ============================================================
  const postsByDay = useMemo(() => {
    const m: Record<number, PostRow[]> = {};
    for (const p of posts) {
      if (!m[p.day_number]) m[p.day_number] = [];
      m[p.day_number].push(p);
    }
    return m;
  }, [posts]);

  // ============================================================
  // 2.1 章節結構(2026-11-17 重組)
  //
  // 為什麼要重組:
  //   舊版把所有 Day 的扉頁連續排在前面,再把全部文章集中在最後 →
  //   讀者翻過 Day 03~Day 08 的扉頁才看得到 Day 02 的文章。
  //
  // 組法:
  //   - 章的順序:day_number 由小到大(序章 → Day 01 → … → 後記)
  //   - 章內順序:保留 selected_post_ids 的相對順序
  //     ⚠️ 這是作者在編輯器用「上移/下移」排好的意圖,不能被 sort_order 覆蓋。
  //       實例:3skc6sdm 章內 sort_order = 1000,2000,3000,19000,18000,17000…
  //             明顯是人工反向排的,覆蓋它等於推翻作者編輯。
  //   - start:本章第一篇在全書的篇序(第 N 篇的 N 要跨章連續)
  // ============================================================
  const chapters = useMemo<Chapter[]>(() => {
    const days = Object.keys(postsByDay)
      .map((k) => Number(k))
      .sort((a, b) => a - b);
    let start = 0;
    return days.map((day) => {
      const ps = postsByDay[day] || [];
      const ch: Chapter = { day, posts: ps, start };
      start += ps.length;
      return ch;
    });
  }, [postsByDay]);

  const pageEst = useMemo(
    () =>
      book
        ? estimatePageCount(posts.length, book.layout_mode, posts)
        : 0,
    [book, posts],
  );

  // ============================================================
  // 2.5 blob 下載 helper
  // ============================================================
  const saveBlob = useCallback((blob: Blob, b: Book) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 10);
    // 🆕 2026-11-14: 檔名加上 mode 標示。
    //   之前只印「書名-日期」,mode A(每頁1則)與 mode B(每頁2則)的檔完全同名,
    //   下載多本時無法分辨 → 檔名帶「1則/2則」。
    const perPage = b.layout_mode === "A" ? "1則" : "2則";
    a.download = `${b.title.replace(/[^\w一-龥]/g, "_") || "custom"}-${perPage}-${stamp}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
  }, []);

  // ============================================================
  // 3. 輸出 PDF — 🆕 10-20 加 AbortController 5 分鐘 timeout + 大檔友善錯誤
  // ============================================================
  const handlePrint = useCallback(async () => {
    if (!book) return;
    const startedAt = Date.now();
    const TIMEOUT_MS = 5 * 60 * 1000; // 5 分鐘 (對應 print-pdf route maxDuration 10 分鐘的 1/2)
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    setPrinting(true);
    try {
      const url = `/api/story-blog/print-pdf?slug=${encodeURIComponent(
        book.share_slug,
      )}&range=${encodeURIComponent(pdfRange)}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const e = new Error(err.error || `HTTP ${res.status}`) as Error & {
          code?: string;
        };
        e.code = err.code;
        throw e;
      }

      // 邊讀邊報進度(用 reader + Content-Length)
      const totalStr = res.headers.get("Content-Length");
      const total = totalStr ? parseInt(totalStr, 10) : 0;
      const reader = res.body?.getReader();
      if (!reader) {
        // 後備:不支援 stream reader 就直接 blob
        const blob = await res.blob();
        saveBlob(blob, book);
        return;
      }
      const chunks: Uint8Array[] = [];
      let received = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          // 用 console 報進度 (UI 由 PDF 按鈕文字 disabled 鎖住)
          if (total > 0) {
            const pct = Math.round((received / total) * 100);
            console.log(`[pdf-download] ${pct}% (${received}/${total})`);
          }
        }
      }
      clearTimeout(timer);

      const blob = new Blob(chunks as BlobPart[], { type: "application/pdf" });
      saveBlob(blob, book);
      console.log(
        `[pdf-download] 收到 ${blob.size} bytes, 全程 ${Math.round((Date.now() - startedAt) / 1000)}s`,
      );
    } catch (e) {
      clearTimeout(timer);
      const msg = e instanceof Error ? e.message : String(e);
      const code = (e as (Error & { code?: string })).code || "";
      if (code === "PDF_NOT_PREBUILT" || /沒有排版引擎|尚未產生/i.test(msg)) {
        // ⚠️ 2026-11-16: 線上沒有 Chromium 時,不要只丟錯。
        //    改用「列印 → 另存為 PDF」,版面與 PDF 相同。
        const goPrint = confirm(
          `${msg}\n\n要改用「列印 → 另存為 PDF」取得 A5 檔案嗎？\n（版面與下載的 PDF 完全相同）`
        );
        if (goPrint) {
          window.open(
            `/story-blog-custom/preview/${encodeURIComponent(
              book.share_slug
            )}?print=1`,
            "_blank"
          );
        }
      } else if (msg === "The user aborted a request" || msg.includes("aborted")) {
        alert(
          `⏱️ PDF 下載逾時 (5 分鐘)。Puppeteer 拍攝中,請到終端機看進度:` +
            ` tail -f /tmp/nextdev.log`,
        );
      } else if (msg.includes("Failed to fetch")) {
        alert(
          `❌ 連線中斷 — 可能是 dev server 重啟或 PDF 太大 (此書 ~${posts.length} 篇)。` +
            `建議:縮勾選篇數、或檢查終端機 dev server 是否在跑。`,
        );
      } else {
        alert(`PDF 輸出失敗: ${msg}`);
      }
    } finally {
      clearTimeout(timer);
      setPrinting(false);
    }
  }, [book, pdfRange, posts.length]);

  // ============================================================
  // 4. 編輯跳轉(帶 token)
  // ============================================================
  const gotoEdit = useCallback(() => {
    if (!book?.author_token) return;
    const token = book.author_token;
    const editUrl = `/story-blog-custom?book_id=${encodeURIComponent(
      book.book_id,
    )}#token=${encodeURIComponent(token)}`;
    router.push(editUrl);
  }, [book, router]);

  // ============================================================
  // 4.5 直接在預覽頁切換版面模式
  //
  // 🆕 2026-11-14: 使用者下載到「一頁 1 則」的 mode A PDF,回報「不符合需求」。
  //   根因:mode 只能在編輯頁改,改完還要回來重新載入預覽,流程太迂迴 → 容易忘。
  //   這裡直接在預覽頁給擁有者一個 mode 切換器,改完立刻套用並重跑版面配置。
  // ============================================================
  const [modeSaving, setModeSaving] = useState(false);
  const changeMode = useCallback(
    async (nextMode: "A" | "B" | "C") => {
      if (!book || nextMode === book.layout_mode) return;
      // 用 URL hash 裡的 token(有帶才是作者),不要只靠 book.author_token
      const hashToken =
        typeof window !== "undefined" && window.location.hash.startsWith("#")
          ? new URLSearchParams(window.location.hash.slice(1)).get("token") || ""
          : "";
      const token = hashToken || book.author_token || "";
      if (!token) return;
      setModeSaving(true);
      try {
        const res = await fetch("/api/story-books", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-author-token": token,
          },
          body: JSON.stringify({
            book_id: book.book_id,
            author_token: token,
            title: book.title,
            layout_mode: nextMode,
            author_name: book.author_name,
            selected_post_ids: book.selected_post_ids,
            is_public: book.is_public,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        // 立刻套用新 mode,不用重新載入整頁
        setBook({ ...book, ...data, layout_mode: nextMode });
        setPairPlanDone(false);
        setPairPlan(null);
        printRootRef.current?.removeAttribute("data-layout-ready");
      } catch (e) {
        alert(`切換版面模式失敗: ${(e as Error).message}`);
      } finally {
        setModeSaving(false);
      }
    },
    [book, setPairPlanDone, setPairPlan],
  );

  // ============================================================
  // 🆕 2026-11-15: 公開閱讀模式 — 翻頁 + 下載
  // ============================================================

  // 追蹤目前看到第幾頁(以捲動位置判斷)
  useEffect(() => {
    if (!isReadMode) return;
    const root = printRootRef.current;
    if (!root) return;
    const pages = Array.from(
      root.querySelectorAll<HTMLElement>(".print-book-page"),
    );
    if (pages.length === 0) return;
    setReadPageTotal(pages.length);

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const mid = window.innerHeight / 2;
        let best = 1;
        let bestDist = Infinity;
        pages.forEach((el, i) => {
          const r = el.getBoundingClientRect();
          const d = Math.abs(r.top + r.height / 2 - mid);
          if (d < bestDist) {
            bestDist = d;
            best = i + 1;
          }
        });
        setReadPage(best);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isReadMode, pairPlanDone]);

  // 跳到指定頁
  const gotoReadPage = useCallback((n: number) => {
    const root = printRootRef.current;
    if (!root) return;
    const pages = Array.from(
      root.querySelectorAll<HTMLElement>(".print-book-page"),
    );
    const target = pages[Math.max(0, Math.min(pages.length - 1, n - 1))];
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    setReadPage(Math.max(1, Math.min(pages.length, n)));
  }, []);

  // 鍵盤左右翻頁
  useEffect(() => {
    if (!isReadMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        gotoReadPage(readPage + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        gotoReadPage(readPage - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isReadMode, readPage, gotoReadPage]);

  // 🆕 2026-11-16 線上即時生成 A5 PDF
  //
  // 背景:本來線上只能下載「本機預生成後上傳 Blobs」的 PDF,
  //      新建的書必須回到本機跑 script 才有線上 PDF。
  //      現在背景 function 能在線上用 Chromium 現拍 → 存 Blobs。
  //
  // 流程:
  //   1. 先照舊下載(命中快取 → 秒完成)
  //   2. 沒有 → POST /api/story-books/pdf-generate 觸發背景生成
  //   3. 輪詢 /api/story-books/pdf-status → ready 後重試下載
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfGenNote, setPdfGenNote] = useState<string | null>(null);

  const pollUntilReady = useCallback(
    async (slug: string, timeoutMs: number): Promise<boolean> => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 4000));
        try {
          const res = await fetch(
            `/api/story-books/pdf-status?slug=${encodeURIComponent(
              slug
            )}&range=full`,
            { cache: "no-store" }
          );
          if (!res.ok) continue;
          const st = await res.json();
          if (st?.ready) return true;
          if (st?.state === "error") {
            setPdfGenNote(`線上生成失敗: ${st.error || "未知錯誤"}`);
            return false;
          }
        } catch {
          /* 繼續輪詢 */
        }
      }
      return false;
    },
    []
  );

  const handleReaderDownload = useCallback(async () => {
    if (!book) return;
    setReaderDownloading(true);
    setPdfGenNote(null);
    try {
      const url = `/api/story-books/pdf?slug=${encodeURIComponent(
        book.share_slug,
      )}&range=full`;
      let res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const e = new Error(err.error || `HTTP ${res.status}`) as Error & {
          code?: string;
        };
        e.code = err.code;
        // ── 沒有預生成 PDF → 改成線上現拍 ──
        if (e.code === "PDF_NOT_PREBUILT" || /尚未產生/i.test(e.message)) {
          setPdfGenerating(true);
          setPdfGenNote("正在線上生成 A5 PDF（首次需要約 1-2 分鐘）...");
          const trig = await fetch(
            `/api/story-books/pdf-generate?slug=${encodeURIComponent(
              book.share_slug
            )}&range=full`,
            { method: "POST" }
          );
          if (!trig.ok) {
            const tErr = await trig.json().catch(() => ({}));
            setPdfGenNote(tErr.error || `觸發線上生成失敗 (HTTP ${trig.status})`);
            setPdfGenerating(false);
            return;
          }
          const trigJson = await trig.json().catch(() => ({}));
          if (trigJson.alreadyExists) {
            // 已經有人生成了 → 直接重試下載
          } else {
            const ok = await pollUntilReady(book.share_slug, 12 * 60 * 1000);
            if (!ok) {
              setPdfGenNote(
                "線上生成逾時或失敗，可以稍後再試，或改用「列印 → 另存為 PDF」。"
              );
              setPdfGenerating(false);
              return;
            }
          }
          setPdfGenerating(false);
          setPdfGenNote(null);
          res = await fetch(url);
          if (!res.ok) {
            const err2 = await res.json().catch(() => ({}));
            throw new Error(err2.error || `HTTP ${res.status}`);
          }
        } else {
          throw e;
        }
      }
      const blob = await res.blob();
      const stamp = new Date().toISOString().slice(0, 10);
      const perPage = book.layout_mode === "A" ? "1則" : "2則";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${
        book.title.replace(/[^\w一-龥]/g, "_") || "custom"
      }-${perPage}-${stamp}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
    } catch (e) {
      // ⚠️ 2026-11-16: 線上缺預生成 PDF 時（503 PDF_NOT_PREBUILT），
      //    與其只丟一個錯誤 alert，不如直接帶使用者去「列印成 PDF」——
      //    print=1 頁面跟 PDF 用的是同一份版面 JSX，
      //    使用者按「另存為 PDF」就能拿到同樣的 A5 檔案。
      const msg = (e as Error).message || "";
      const code = (e as (Error & { code?: string })).code || "";
      if (code === "PDF_NOT_PREBUILT" || /尚未產生/i.test(msg)) {
        const goPrint = confirm(
          `${msg}\n\n要直接用「列印 → 另存為 PDF」取得 A5 檔案嗎？\n（版面與下載的 PDF 完全相同）`
        );
        if (goPrint) {
          window.open(
            `/story-blog-custom/preview/${encodeURIComponent(
              book.share_slug
            )}?print=1`,
            "_blank"
          );
        }
        return;
      }
      alert(`下載失敗: ${msg}`);
    } finally {
      setReaderDownloading(false);
      setPdfGenerating(false);
    }
  }, [book, pollUntilReady]);

  // ============================================================
  // 5. render
  // ============================================================
  if (loading) {
    return (
      <main className="custom-book-root p-12 text-center text-jn-ink/60">
        <p>⏳ 載入客製書中...</p>
      </main>
    );
  }
  if (error || !book) {
    return (
      <main className="custom-book-root p-12 text-center">
        <p className="text-rose-700">❌ {error || "找不到這本書"}</p>
        <Link href="/story-blog-custom" className="custom-book-btn-ghost mt-4 inline-block">
          ← 自己來做一本
        </Link>
      </main>
    );
  }

  // ============================================================
  // 🆕 10-20: Puppeteer 拍攝模式 — A5 印刷排版(.print-book-page 結構)
  // ============================================================
  // ============================================================
  // 🆕 2026-11-15: 全書頁面內容(共用的 JSX)
  //   print=1 (Puppeteer 拍 PDF) 與 read=1 (訪客線上閱讀) 用同一份版面,
  //   確保「讀者看到的」與「PDF 印出來的」完全一致。
  // ============================================================
  // ============================================================
  // 5.1 章節內文章(mode A / B / C)
  //
  //   ⚠️ 配對只在「本章之內」進行:
  //      一頁若同時裝兩個章節的故事,章節邊界又會錯位
  //      (Day 02 的故事跟 Day 03 的故事擠同一頁 → 讀者對不上章節)。
  //      跨章一律拆成兩頁,各歸各章。
  // ============================================================
  const renderChapterPages = (chapter: Chapter): ReactNode => {
    const chapterMode = book.layout_mode;
    const list = chapter.posts;
      if (chapterMode === "C") {
        // === Mode C:左右並排(沿用既有 .print-book-paired-container) ===
        const pairs: PostRow[][] = [];
        for (let i = 0; i < list.length; i += 2) {
          pairs.push(list.slice(i, i + 2));
        }
        return pairs.map((pair, pairIdx) => (
          <section
            key={`c-pair-${chapter.day}-${pairIdx}`}
            className="print-book-page print-book-mode-c-page"
          >
            <div className="print-book-paired-container">
              {pair.map((p, idx) => (
                <article
                  key={p.id}
                  className="print-book-post print-book-mode-c-cell"
                >
                  <header className="print-book-post-header">
                    <span className="print-book-post-day">
                      {DAY_LABEL[p.day_number]?.split(" · ")[0] ?? `D${p.day_number}`}
                    </span>
                    <h3 className="print-book-post-title">{stripZwj(p.title) || "（無標題）"}</h3>
                  </header>
                  {p.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image_url}
                      alt=""
                      className="print-book-post-image"
                      loading="eager"
                      fetchPriority="high"
                    />
                  )}
                  {/* 2026-11-14: 內文開頭與標題重複時不重複印一次 (見 TimelineStory 相同處理) */}
                  {(() => {
                    const raw = p.content || "";
                    const title = (p.title || "").trim();
                    let body = raw;
                    if (title) {
                      if (raw.trim() === title) body = "";
                      else if (raw.trimStart().startsWith(title))
                        body = raw.trimStart().slice(title.length).replace(/^\n+/, "");
                    }
                    return body ? (
                      <p className="print-book-post-text">{stripZwj(body)}</p>
                    ) : null;
                  })()}
                </article>
              ))}
            </div>
          </section>
        ));
      }
      if (chapterMode === "B") {
        // === Mode B (10-21 聖上拍板「彈性密度」) ===
        //
        // 🆕 2026-11-14 重大修正(使用者要求:「PDF 一頁要有 2 個故事」):
        //
        //   舊版有「字數 > 220 → 獨立整頁」的硬門檻,結果 113 則裡
        //   35 頁只有 1 則故事(實測 74 頁 / 113 格)。
        //   這個門檻是「猜」的常數,不是量測出來的 → 整個拿掉。
        //
        //   現在:一律「一頁 2 則」(篇數為奇數時,最後一頁 1 則)。
        //   放不放得下 → 不猜,交給實測:
        //     planPairLayout() 在瀏覽器量每一格的真實需求高度
        //     (標題 + max(照片, 文字繞排區塊)),量測時文字鎖 9pt。
        //     同頁兩格加總超出可用高度 → 縮小照片級距
        //     (照片窄 → 文字欄寬 → 行數少 → 需求下降)直到塞得下。
        //     最後把該頁可用高度依需求比例分配給兩格 → 整頁滿版、
        //     不留大空白,剩下的空間由既有的 adaptive-font-size hook
        //     在各格內放大字級(9~13pt)填滿。
        //
        //   ⚠️ 字級下限仍是 9pt(實體書可讀),不用縮小字來塞。
        const pairs: PostRow[][] = [];
        for (let i = 0; i < list.length; i += 2) {
          pairs.push(list.slice(i, i + 2));
        }
        return pairs.map((pair, pairIdx) => {
          const isSingle = pair.length === 1;
          const cells: PostRow[] = pair;
          const pageClass = isSingle
            ? "print-book-page print-book-mode-b-pair-page is-single"
            : "print-book-page print-book-mode-b-pair-page has-two";
          // 🆕 2026-11-14: 同頁兩則若為同一天 → day header 只在頁頂顯示一次,
          //   底下兩格共用(省掉重複的紅色標籤,版面乾淨)。
          const sameDay =
            cells.length === 2 && cells[0].day_number === cells[1].day_number;
          const pageDayHdr = sameDay
            ? DAY_HEADER[cells[0].day_number] || {
                label: `Day ${cells[0].day_number}`,
                title: "",
              }
            : null;
          return (
            <section key={`b-pair-${chapter.day}-${pairIdx}`} className={pageClass}>
              {pageDayHdr && (
                <header className="print-book-pair-day-header">
                  <div className="print-book-pair-day-label">
                    {pageDayHdr.label}
                  </div>
                  {pageDayHdr.title && (
                    <div className="print-book-pair-day-title">
                      {stripZwj(pageDayHdr.title)}
                    </div>
                  )}
                </header>
              )}
              {cells.map((p, cellIdx) => (
                <BPairCell
                  key={p.id}
                  post={p}
                  isFirst={cellIdx === 0}
                  postIdx={chapter.start + pairIdx * 2 + cellIdx}
                  hideDayHeader={!!pageDayHdr}
                  isSinglePage={isSingle}
                  plannedHeight={pairPlan?.heights[p.id]}
                  plannedPhotoScale={pairPlan?.photoScale[p.id]}
                  plannedSinglePhotoMm={pairPlan?.singlePhotoMm[p.id]}
                />
              ))}
            </section>
          );
        });
      }
      // === Mode A:每篇獨立全頁,大圖為主(既有) ===
      return list.map((p, idx) => (
        <section
          key={p.id}
          className="print-book-page print-book-post-page print-book-mode-a"
        >
          <SinglePost post={p} postIdx={chapter.start + idx} book={book} />
        </section>
      ));
  };

  const bookPages = (
    <>
        {/* 封面 */}
        <section className="print-book-page print-book-cover">
          <img
            src="/print-cover-q-version-2k.jpg"
            alt="封面"
            className="print-book-cover-image"
          />
          <h1 className="print-book-cover-title">{stripZwj(book.title)}</h1>
          <p className="print-book-cover-meta">{book.author_name} · 客製紀念版</p>
        </section>

        {/* 扉頁 */}
        <section className="print-book-page print-book-frontispiece">
          <div className="print-book-frontispiece-line">C U S T O M · 2 0 2 6</div>
          <div className="print-book-frontispiece-line">{stripZwj(book.title)}</div>
          <div className="print-book-frontispiece-divider" />
          <div className="print-book-frontispiece-line">
            {book.author_name}
          </div>
          <div className="print-book-frontispiece-line" style={{ fontSize: "10pt", opacity: 0.65 }}>
            模式 🅍{book.layout_mode} · 共 {posts.length} 篇文章
          </div>
        </section>

        {/* 目錄 */}
        <section className="print-book-page print-book-toc">
          <h2 className="print-book-toc-heading">目 錄</h2>
          <div className="print-book-frontispiece-divider" style={{ marginBottom: "10mm" }} />
          <ul className="print-book-toc-list">
            {Object.keys(postsByDay)
              .map((k) => Number(k))
              .sort((a, b) => a - b)
              .map((day) => (
                <li key={day} className="print-book-toc-item">
                  <span className="print-book-toc-number">
                    {DAY_LABEL[day]?.split(" · ")[0] ?? `Day ${day}`}
                  </span>
                  <span className="print-book-toc-title">
                    {DAY_LABEL[day]?.split(" · ")[1] ?? DAY_LABEL[day]}
                  </span>
                </li>
              ))}
          </ul>
        </section>

        {/* 🆕 2026-11-17: 章節結構 —— 章節扉頁「緊接」本章文章
            (使用者回報:先前是所有 Day 的扉頁排成一排、整本內文全部堆在最後,
             讀者對不上「本章 N 篇」到底是哪 N 篇。)

            ⚠️ 配對改成「章內配對」(不跨章):
               一頁兩則若跨章,「Day 03 的文章」會出現在「Day 02 的扉頁」之後
               —— 章節邊界又錯位。章內配對後,一頁最多只屬於一個 Day。 */}
        {chapters.map((chapter) => (
          <Fragment key={`chapter-${chapter.day}`}>
            {/* ① 章節扉頁 */}
            <section className="print-book-page print-book-chapter-intro">
              <div className="print-book-chapter-label">
                {DAY_LABEL[chapter.day]?.split(" · ")[0] ?? `Day ${chapter.day}`}
              </div>
              <h2 className="print-book-chapter-title">
                {DAY_LABEL[chapter.day]?.split(" · ")[1] ?? DAY_LABEL[chapter.day]}
              </h2>
              <div className="print-book-frontispiece-divider" />
              <p className="print-book-chapter-meta">
                本章 {chapter.posts.length} 篇
              </p>
            </section>

            {/* ② 本章文章(mode A/B/C 各自排法) */}
            {renderChapterPages(chapter)}
          </Fragment>
        ))}

        {/* 本章文章由 chapters.map 逐章呼叫 renderChapterPages 渲染 */}


        {/* 末頁:後記 */}
        <section className="print-book-page print-book-back-cover">
          <div className="print-book-back-cover-mark">
            客製書 · {book.title}
          </div>
          <p className="print-book-back-cover-text">
            全書以愛與回憶印製 · {new Date(book.created_at ?? Date.now()).toLocaleDateString()}
          </p>
        </section>
    </>
  );

  if (isPrintMode) {
    return (
      <main
        ref={printRootRef}
        className="print-book-screen print-book-custom-mode"
      >
        {bookPages}
      </main>
    );
  }

  // 🆕 2026-11-15: 公開閱讀模式 — 訪客在螢幕上一頁一頁翻,
  //   隨時可下載 A5 列印版 PDF。
  if (isReadMode) {
    return (
      <div className="print-book-reader">
        <div className="print-book-reader-bar">
          <div className="print-book-reader-bar-left">
            <Link
              href={`/story-blog-custom/preview/${book.share_slug}`}
              className="print-book-reader-btn"
            >
              ← 書的資訊
            </Link>
            <span className="print-book-reader-title">{book.title}</span>
          </div>
          <div className="print-book-reader-bar-center">
            <button
              type="button"
              className="print-book-reader-btn"
              onClick={() => gotoReadPage(readPage - 1)}
              disabled={readPage <= 1}
              aria-label="上一頁"
            >
              ‹
            </button>
            <span className="print-book-reader-counter">
              {readPage} / {readPageTotal}
            </span>
            <button
              type="button"
              className="print-book-reader-btn"
              onClick={() => gotoReadPage(readPage + 1)}
              disabled={readPage >= readPageTotal}
              aria-label="下一頁"
            >
              ›
            </button>
          </div>
          <div className="print-book-reader-bar-right">
            {pdfGenNote ? (
              <span className="print-book-reader-gen-note">{pdfGenNote}</span>
            ) : null}
            <button
              type="button"
              className="print-book-reader-btn is-primary"
              onClick={handleReaderDownload}
              disabled={readerDownloading || pdfGenerating}
            >
              {readerDownloading || pdfGenerating
                ? "⏳ 產生中..."
                : "⬇️ 下載 A5 列印版 PDF"}
            </button>
          </div>
        </div>

        <main
          ref={printRootRef}
          className="print-book-screen print-book-custom-mode print-book-read-screen"
        >
          {bookPages}
        </main>
      </div>
    );
  }

  // ============================================================
  // 一般瀏覽模式 (跟聖上看見的預覽 UI 一樣)
  // ============================================================

  return (
    <main className="custom-book-root">
      <header className="custom-book-header">
        <div className="custom-book-header-inner">
          <div className="flex items-center gap-3 justify-center mb-2 text-sm">
            <Link href="/story-blog-custom" className="text-jn-ink/50 hover:text-jn-ink">
              ← 做自己的書
            </Link>
            <span className="text-jn-ink/30">·</span>
            <span className="text-jn-ink/40">公開預覽</span>
          </div>
          <h1 className="custom-book-title">📖 {book.title}</h1>
          <p className="custom-book-subtitle">
            作者:{book.author_name} · 👁️ {book.view_count} 次瀏覽 · 模式 🅍{book.layout_mode}
          </p>
        </div>
      </header>

      {/* 🆕 2026-11-15: 公開分享面板
          訪客(非作者)最想要的就是兩件事:「看這本書」與「下載 A5 PDF」。
          這裡把兩個入口放最前面,作者也看得到(自己下載自己的書)。 */}
      <div className="custom-book-share-panel">
        <div className="custom-book-share-panel-head">
          <span className="custom-book-share-panel-label">📖 {book.title}</span>
          <span className="custom-book-share-panel-meta">
            {book.author_name} · {posts.length} 篇 · 每頁{" "}
            {book.layout_mode === "A" ? "1 則" : "2 則"} · ~{pageEst} 頁
          </span>
        </div>
        <div className="custom-book-share-panel-actions">
          <Link
            href={`/story-blog-custom/preview/${book.share_slug}?read=1`}
            className="custom-book-btn-primary"
          >
            👁️ 線上閱讀
          </Link>
          <button
            type="button"
            className="custom-book-btn-primary"
            onClick={handleReaderDownload}
            disabled={readerDownloading}
          >
            {readerDownloading
              ? "⏳ 產生中..."
              : "⬇️ 下載 A5 列印版 PDF"}
          </button>
          <button
            type="button"
            className="custom-book-btn-ghost"
            onClick={() => {
              const url = `${window.location.origin}/story-blog-custom/preview/${book.share_slug}`;
              navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? "✅ 已複製" : "🔗 複製分享連結"}
          </button>
        </div>
        {readerDownloading && (
          <p className="custom-book-share-panel-note">
            第一次產生整本 PDF 需要約 30 秒,完成後會自動開始下載;之後再點會快很多。
          </p>
        )}
      </div>

      <div className="custom-book-grid">
        <section className="custom-book-left">
          {/* 控制列 */}
          <div className="custom-book-controls">
            <input
              className="custom-book-input"
              readOnly
              value={`📊 ${posts.length} 篇, ~${pageEst} 頁 (聖上 120-150 頁目標)`}
            />
            {isOwner && (
              <button onClick={gotoEdit} className="custom-book-btn-primary">
                ✏️ 編輯
              </button>
            )}
            {/* 🆕 2026-11-14: 直接切換版面模式。
                每個選項都標明「每頁幾則」,避免下載到與預期不同的 PDF。
                只有作者看得到/用得到 → 非作者不會誤觸。 */}
            {isOwner && (
              <select
                className="custom-book-select"
                value={book.layout_mode}
                onChange={(e) =>
                  changeMode(e.target.value as "A" | "B" | "C")
                }
                disabled={modeSaving}
                title="版面模式（每頁幾則故事）"
              >
                <option value="A">🅐 攝影雜誌 · 每頁 1 則</option>
                <option value="B">🅑 故事閱讀 · 每頁 2 則（字級自適應）</option>
                <option value="C">🅒 高密度 · 每頁 2 則（固定 8pt）</option>
              </select>
            )}
            {/* 🆕 2026-11-15: 頁碼範圍 + 輸出 PDF 改為作者專用。
                訪客要的下載入口在上方分享面板(線上閱讀 / 下載 A5 PDF),
                這裡是作者自己分段輸出時用的。 */}
            {isOwner && (
              <>
                <select
                  className="custom-book-select"
                  value={pdfRange}
                  onChange={(e) => setPdfRange(e.target.value)}
                  disabled={printing}
                >
                  <option value="full">整本輸出</option>
                  <option value="1-30">1-30 頁</option>
                  <option value="31-60">31-60 頁</option>
                  <option value="61-90">61-90 頁</option>
                  <option value="91-120">91-120 頁</option>
                  <option value="121-150">121-150 頁</option>
                </select>
                <button
                  onClick={handlePrint}
                  disabled={printing}
                  className="custom-book-btn-primary"
                >
                  {printing ? "⏳ Puppeteer 拍攝中..." : "🖨️ 輸出 PDF"}
                </button>
              </>
            )}
          </div>

          {/* 章節樹 */}
          {Object.keys(postsByDay)
            .map((k) => Number(k))
            .sort((a, b) => a - b)
            .map((day) => (
              <section key={day} className="custom-book-day">
                <header className="custom-book-day-header">
                  <span className="custom-book-day-title">
                    {DAY_LABEL[day] ?? `Day ${day}`}
                  </span>
                  <span className="custom-book-day-count">
                    {(postsByDay[day] || []).length} 篇
                  </span>
                </header>
                <ul className="custom-book-post-list">
                  {(postsByDay[day] || []).map((p) => (
                    <li key={p.id} className="custom-book-post">
                      <div className="flex items-start gap-3">
                        {p.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.image_url}
                            alt=""
                            className="w-14 h-14 object-cover rounded border border-jn-ink/15"
                            loading="lazy"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-jn-ink">
                            {p.title || "（無標題）"}
                          </p>
                          <p className="text-xs text-jn-ink/55 line-clamp-2 mt-1">
                            {/* 2026-11-14: 摘要也去掉與標題重複的開頭 */}
                            {(() => {
                              const raw = p.content || "";
                              const title = (p.title || "").trim();
                              let body = raw;
                              if (title) {
                                if (raw.trim() === title) body = "";
                                else if (raw.trimStart().startsWith(title))
                                  body = raw.trimStart().slice(title.length).replace(/^\n+/, "");
                              }
                              return body.slice(0, 80);
                            })()}
                            {p.content.length > 80 ? "…" : ""}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </section>

        <aside className="custom-book-right">
          <div className="custom-book-panel">
            <h2 className="custom-book-panel-title">📖 書本資訊</h2>
            <ul className="text-sm text-jn-ink/80 space-y-2">
              <li>
                <strong>書名:</strong> {book.title}
              </li>
              <li>
                <strong>作者:</strong> {book.author_name}
              </li>
              <li>
                <strong>模式:</strong> 🅍{book.layout_mode}
                {book.layout_mode === "A" && " · 攝影雜誌"}
                {book.layout_mode === "B" && " · 故事閱讀"}
                {book.layout_mode === "C" && " · 高密度"}
              </li>
              <li>
                <strong>已選篇數:</strong> {posts.length}
              </li>
              <li>
                <strong>頁數估算:</strong> ~{pageEst}
                {pageEst > 150
                  ? " (超出 150)"
                  : pageEst < 100
                  ? " (少於 100)"
                  : " ✅"}
              </li>
              <li>
                <strong>分享碼:</strong> <code className="text-xs">{book.share_slug}</code>
              </li>
              <li>
                <strong>瀏覽數:</strong> {book.view_count}
              </li>
              <li>
                <strong>更新時間:</strong>{" "}
                <span className="text-xs text-jn-ink/50">
                  {new Date(book.updated_at ?? Date.now()).toLocaleString()}
                </span>
              </li>
            </ul>
          </div>

          {isOwner && book.author_token && (
            <div className="custom-book-panel">
              <h2 className="custom-book-panel-title">🔑 作者工具</h2>
              <p className="text-xs text-jn-ink/55 mb-2">
                Token 是你的編輯權。把它複製到本地或加到書籤,避免遺失編輯權。
              </p>
              <code className="custom-book-share-url text-xs">
                {book.author_token}
              </code>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

// ============================================================
// 🆕 2026-10-20: 模式 B 配對頁 cell 元件
//   - 自己當 grid container (1fr 1fr, areas "img text" 或反轉)
//   - 圖直接子 (.print-book-post-image,grid-area "img")
//   - 文包在 .print-book-post-text-wrap (grid-area "text")
//   - 字級由 useAdaptiveFontSize hook 控
// ============================================================
/* 🆕 10-20: Day stamp chip — 聖上 USER 偏好視覺:
   "DAY 01 · 搭乘春秋航空抵達上海" 紅色 serif 寬字距 + 紅色細線 */
/** 🆕 2026-11-14: 落單整頁照片高度的分級門檻(依內文字數)
 *  ≤120 字 → 照片 100mm(照片當主角)
 *  ≤200 字 → 74mm
 *  ≤300 字 → 60mm
 *  >300 字 → 44mm(文字當主角)
 *  分級值經實測回歸確認 0 文字溢出 / 0 頁面溢出。 */
const SINGLE_IMG_H_BY_CHARS: Array<[number, number]> = [
  [120, 100],
  [200, 74],
  [300, 60],
  [Infinity, 44],
];
const DAY_HEADER: Record<number, { label: string; title: string }> = {
  0: { label: "序章", title: "緣起" },
  1: { label: "Day 01", title: "搭乘春秋航空抵達上海" },
  2: { label: "Day 02", title: "體會上海魔都" },
  3: { label: "Day 03", title: "西塘古鎮體搖擼船" },
  4: { label: "Day 04", title: "烏鎮西柵沈浸式體驗" },
  5: { label: "Day 05", title: "烏鎮早茶客體驗" },
  6: { label: "Day 06", title: "杭州宋城千古情" },
  7: { label: "Day 07", title: "杭州宮宴遊西湖" },
  8: { label: "Day 08", title: "遊南宋御街後返台" },
  9: { label: "後記", title: "完程" },
};

function BPairCell({
  post,
  isFirst,
  postIdx,
  hideDayHeader = false,
  isSinglePage = false,
  plannedHeight,
  plannedPhotoScale,
  plannedSinglePhotoMm,
}: {
  post: PostRow;
  isFirst: boolean;
  postIdx: number;
  hideDayHeader?: boolean;
  isSinglePage?: boolean;
  /** 🆕 2026-11-14: 配置引擎算好的格高 (px) */
  plannedHeight?: number;
  /** 🆕 2026-11-14: 配置引擎決定的照片縮放級距 */
  plannedPhotoScale?: number;
  /** 🆕 2026-11-14: 落單整頁(奇數尾頁)的照片尺寸 (mm) */
  plannedSinglePhotoMm?: { w: number; h: number };
}) {
  const textRef = useRef<HTMLParagraphElement | null>(null);
  const cellRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // 🆕 2026-11-14: 依圖片原始比例決定版面形狀
  //   直式照片 → 圖片欄窄一點(文字欄寬),讓照片不被裁太多
  //   橫式照片 → 圖片欄寬一點(高度矮),文字欄窄一點,圖完整呈現
  //   比例未知(還沒 load)→ 預設直式
  const [imgShape, setImgShape] = useState<"portrait" | "landscape" | "square">(
    "portrait",
  );
  // 🆕 2026-11-14: 記錄原始寬高比,讓落單整頁能「等比完整呈現」照片
  //   (舊版 object-fit:cover + 固定高 → 直式照片被上下切掉一大截)
  const [imgRatio, setImgRatio] = useState<number>(0);

  const onImgLoad = useCallback(() => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth || !img.naturalHeight) return;
    const ratio = img.naturalWidth / img.naturalHeight;
    // 🆕 2026-11-14: 標記比例已量測,給 PDF route 等版面定稿用
    img.dataset.imgRatio = ratio.toFixed(4);
    setImgRatio(ratio);
    if (ratio > 1.15) setImgShape("landscape");
    else if (ratio < 0.87) setImgShape("portrait");
    else setImgShape("square");
  }, []);

  // 🆕 10-21: mode B 圖文 float 並列 → 圖不吃垂直空間,字級區間用 pair 版
  // 🆕 2026-11-14: 落單整頁 (is-single) cell 高 172mm,容量是半頁的 2.3 倍,
  //   該用較大的字級上限,否則 13pt 上限會浪費整頁留白 (實測 fill ratio 僅 0.57~0.76)
  useAdaptiveFontSize(
    () => textRef.current,
    cellRef as React.RefObject<HTMLElement | null>,
    [post.id, imgRatio],
    isSinglePage
      ? { minPt: MIN_PT_SINGLE, maxPt: MAX_PT_SINGLE, lineHeight: 1.75 }
      : // 🆕 2026-11-14: 雙故事格用緊湊緩衝 → 兩則之間的視覺距離縮到最小
        { minPt: MIN_PT_PAIR, maxPt: MAX_PT_PAIR, lineHeight: 1.65, tight: true },
  );

  // 🆕 2026-11-14: 超長篇 (>300 字) 落單整頁時,圖要更小,
  //   否則文字空間不夠 (實測 371 字仍溢出 12px)。
  const isVeryLong = (post.content?.length ?? 0) > 300;

  // 🆕 2026-11-14: 極短文的 title 與 content 可能是同一句(實測 113 篇中有 1 篇)。
  //   直接印兩次會讓讀者看到重複段落 → 正文留白,只印標題那一行。
  //   這是「版面層」處理,不動資料庫。
  const bodyText = useMemo(() => {
    const content = post.content ?? "";
    const title = (post.title ?? "").trim();
    const trimmed = content.trim();
    if (title && trimmed && trimmed === title) return "";
    // 🆕 2026-11-14: 內容「以標題開頭 + 換行」(實測 113 篇中有 1 篇:
    //   「豫園雖為上海名園…」標題 + 正文,標題被印了兩次)。
    //   → 剝掉開頭那行標題,只留真正的正文。
    //   ⚠️ 只剝「完全等於標題的那一行」,不做模糊比對,避免誤刪正文。
    if (title && trimmed.startsWith(title)) {
      const rest = trimmed.slice(title.length);
      // 標題後面必須是換行(或是直接結束)才算重複
      if (rest === "") return "";
      if (rest.startsWith("\n") || rest.startsWith("\r")) {
        return rest.replace(/^[\r\n]+/, "");
      }
    }
    return content;
  }, [post.content, post.title]);

  // 🆕 2026-11-14: 落單整頁的照片「等比完整呈現」+「依內文長度分級」。
  //   舊版是 width:100% + 固定 height 62mm + object-fit:cover →
  //     (a) 直式照片被上下切掉一大截(視覺分析:「照片主體被切」)
  //     (b) 照片偏小、頁面底部留一大片空白(實測最多 82mm)
  //
  //   現在:
  //     - 高度依「內文長度」分級:短文讓照片當主角、長文讓文字當主角
  //       (內文越長 → 照片越矮 → 文字可用高度越大 → 兩者都不溢出)
  //     - 寬度 = 高 × 原始比例,上限 = 內容寬 120mm(超出則等比縮回)
  //     - object-fit:contain → 照片永遠完整、比例正確、不裁切
  //   分級值經實測回歸(0 文字溢出 / 0 頁面溢出)確認。
  const singleImgStyle = useMemo(() => {
    if (!isSinglePage || !imgRatio) return undefined;
    // 🆕 2026-11-14: 配置引擎實測後給的照片尺寸(等比、剛好填滿頁面)
    //   → 優先採用,尾頁不會再留一大片空白。
    if (plannedSinglePhotoMm) {
      return {
        width: `${plannedSinglePhotoMm.w.toFixed(2)}mm`,
        height: `${plannedSinglePhotoMm.h.toFixed(2)}mm`,
        objectFit: "contain" as const,
      };
    }
    const chars = bodyText.length;
    let h =
      SINGLE_IMG_H_BY_CHARS.find(([limit]) => chars <= limit)?.[1] ?? 46;
    const contentW = 120; // mm,A5 內容寬 (148 - 14 - 14)
    let w = h * imgRatio;
    if (w > contentW) {
      w = contentW;
      h = w / imgRatio;
    }
    return {
      width: `${w.toFixed(2)}mm`,
      height: `${h.toFixed(2)}mm`,
      objectFit: "contain" as const,
    };
  }, [isSinglePage, imgRatio, post.content, plannedSinglePhotoMm]);

  // 🆕 2026-11-14: 雙故事格的照片也等比完整呈現(不再被 cover 裁切)。
  //   高度沿用已驗證的舊版數值(直式 62 / 橫式 27 / 方形 48mm),
  //   寬度 = 高 × 原始比例(上限 48mm)→ 照片完整、且圖欄不變寬,
  //   文字欄寬度因此在所有頁面一致(120 - 48 - 3 = 69mm)→ 字級容量一致。
  //
  //   plannedPhotoScale:配置引擎在量測後決定要縮到多少(內容太長時)。
  //   公式與 pair-layout.ts 的 photoBaseMm 完全一致 → 量測與渲染一致。
  const pairImgStyle = useMemo(() => {
    if (isSinglePage || !imgRatio) return undefined;
    const shape =
      imgShape === "landscape"
        ? "landscape"
        : imgShape === "square"
          ? "square"
          : "portrait";
    const base = photoBaseMm(imgRatio, shape);
    const s = plannedPhotoScale ?? 1;
    return {
      width: `${(base.w * s).toFixed(2)}mm`,
      height: `${(base.h * s).toFixed(2)}mm`,
      objectFit: "contain" as const,
    };
  }, [isSinglePage, imgRatio, imgShape, plannedPhotoScale]);

  const cellClass = [
    "print-book-b-cell",
    isFirst ? "print-book-b-cell-first" : "print-book-b-cell-second",
    `is-${imgShape}`,
    isVeryLong ? "is-very-long" : "",
  ].join(" ");

  // 🆕 2026-11-14: 配置引擎算好的格高 → 以 inline style 覆蓋 CSS 的固定 80mm。
  //   (CSS 保留 80mm 作為「配置尚未完成」時的預設值)
  const cellStyle = useMemo(() => {
    if (isSinglePage || !plannedHeight) return undefined;
    return { height: `${plannedHeight}px` };
  }, [isSinglePage, plannedHeight]);

  const dayHdr = DAY_HEADER[post.day_number] || { label: `Day ${post.day_number}`, title: "" };

  return (
    <article
      ref={cellRef}
      className={cellClass}
      data-post-id={post.id}
      style={cellStyle}
    >
      {/* Day stamp — 聖上 USER 偏好:紅色 serif letter-spacing 0.5em + 紅色細線
          🆕 2026-11-14: 同頁同日時由頁頂統一顯示,這裡就省略 */}
      {!hideDayHeader && (
        <header className="print-book-day-header">
          <div className="print-book-day-header-label">{dayHdr.label}</div>
          {dayHdr.title && (
            <div className="print-book-day-header-title">{stripZwj(dayHdr.title)}</div>
          )}
        </header>
      )}
      {/* 🆕 2026-11-14 结构调整:標題移到圖片之前,滿寬一行。
          原本 title 在 text-wrap 內、位於 float 圖之後 → 標題的行盒被
          float 擠成窄欄(~54mm)、高度暴增(實測 52~90px),
          hook 把這些高度當成「被保留」→ textMaxH 嚴重不足(實測只剩 83px)
          → 文字溢出被裁。
          現在:標題滿寬 → 圖 float → 文字繞排,容量與視覺都正確。 */}
      <h3 className="print-book-post-title">{stripZwj(post.title) || "（無標題）"}</h3>
      {/* 圖(無圖時省略) */}
      {post.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={post.image_url}
          alt=""
          className="print-book-post-image"
          loading="eager"
          fetchPriority="high"
          onLoad={onImgLoad}
          style={isSinglePage ? singleImgStyle : pairImgStyle}
        />
      ) : null}
      <div className="print-book-post-text-wrap">
        <p ref={textRef} className="print-book-post-text">
          {stripZwj(bodyText)}
        </p>
        <footer className="print-book-post-footer">
          {/* 🆕 2026-11-14 (使用者:「每頁故事的下面都寫名字,這都重覆不需要」):
              原本每則故事下方都印一次作者名(全書同一個名字,重覆且浪費版面)。
              → 改成只印篇序「第 N 篇」:不是重複資訊,而且保留「這是第幾篇」的線索,
                 PDF 層級稽核也能靠它數出每頁的故事數。 */}
          <span>第 {postIdx + 1} 篇</span>
        </footer>
      </div>
    </article>
  );
}

// ============================================================
// 🆕 2026-10-20: 共用 post 內文元件 + 字體自適應 hook (Mode A/C 用)
// ============================================================
function SinglePost({
  post,
  postIdx,
  book,
}: {
  post: PostRow;
  postIdx: number;
  book: Book;
}) {
  const containerRef = useRef<HTMLElement | null>(null);
  const textRef = useRef<HTMLParagraphElement | null>(null);

  // 🆕 模式 B 自動塞字:二分搜尋最大可塞字體
  useAdaptiveFontSize(
    () => textRef.current,
    containerRef as React.RefObject<HTMLElement | null>,
    [post.id, book.layout_mode],
  );

  return (
    <article
      ref={containerRef}
      className="print-book-post-article"
      data-post-id={post.id}
      data-post-idx={postIdx}
    >
      <header className="print-book-post-header">
        <span className="print-book-post-day">
          {DAY_LABEL[post.day_number]?.split(" · ")[0] ?? `D${post.day_number}`}
        </span>
        <h3 className="print-book-post-title">{stripZwj(post.title) || "（無標題）"}</h3>
      </header>
      <div className="print-book-post-body">
        {post.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.image_url}
            alt=""
            className="print-book-post-image"
            loading="eager"
            fetchPriority="high"
          />
        )}
        <p ref={textRef} className="print-book-post-text">
          {stripZwj(post.content)}
        </p>
      </div>
      <footer className="print-book-post-footer">
        {/* 🆕 2026-11-14: 拿掉重複的作者名(全書同一個名字,每頁重複印一次)。
            改用篇序,PDF 稽核也靠它數故事數。 */}
        <span>第 {postIdx + 1} 篇</span>
      </footer>
    </article>
  );
}
