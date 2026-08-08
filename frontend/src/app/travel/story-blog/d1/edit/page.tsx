// 🅒 2026-08-05 聖上拍板: D1 升級成 Supabase 共享編輯 (所有成員即時同步, 不再用 localStorage)
//   8/2 原本設計是 localStorage 私人草稿, 8/5 聖上說「所有用戶專注 D1」改為共用
//   realtime 同步, 但「D1 是焦點」原則不變 — D2-D8 仍不開放, 點進去只看到 stub

"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { fetchAllPhotos, type TravelPhoto } from "@/utils/travelPhotos";
import "./editor.css";
import {
  D1_PLACEHOLDER,
  parseBlocks,
  serializeBlocks,
  editingBlocksOnly,
  editingBlocksToText,
  renderBlocksHtml,
  type Block,
} from "../d1-shared";

// ── 時段 chip 定義 (依 D1 真實時段粗分) ──────────────────────────────
const TIME_SLOTS = [
  { key: "all", label: "全部", range: null },
  { key: "early", label: "🌅 清晨 4-8", range: [4, 7] },
  { key: "morning", label: "☀️ 上午 8-12", range: [8, 11] },
  { key: "noon", label: "🌞 中午 12-16", range: [12, 15] },
  { key: "afternoon", label: "⛅ 下午 16-20", range: [16, 19] },
  { key: "night", label: "🌙 晚上 20-24", range: [20, 23] },
];

// ── 草稿儲存 (Supabase — 共享給所有成員 realtime 同步) ─────────────────
// 🅒 8/5 改: 不再用 localStorage, 改寫 Supabase `story_blog_drafts` table
const DRAFT_ID = "d1"; // D1 是唯一開放編輯的 day
const SUPABASE_TABLE = "story_blog_drafts";

// � 2026-08-05 聖上拍板: 預覽 fallback — draft 空時用這個 placeholder,
//   讓聖上一進來就能看 Vogue 渲染效果 (不必先打字)
// 🅒 2026-08-05 聖上拍板: 抽 renderVogueMarkdown + D1_PLACEHOLDER 成 shared module
//   給 editor (編輯區 preview) 跟 read page (完稿閱讀) 共用

interface Draft {
  text: string;
  pinnedPhotos: string[]; // filename[]
  updatedAt: string;
  updatedBy?: string;
  // 🅒 8-5: 完稿區 — 潤稿完成後自動存這裡, 所有人都會看到
  polishedText?: string;
  polishedAt?: string;
  polishedBy?: string;
}

const EMPTY_DRAFT: Draft = {
  text: "",
  pinnedPhotos: [],
  updatedAt: "",
  updatedBy: "",
  polishedText: "",
  polishedAt: "",
  polishedBy: "",
};

// 從 Supabase 讀草稿 — 若不存在 (沒人寫過) 回傳預設空草稿
async function loadDraftFromSupabase(supabase: ReturnType<typeof createClient>): Promise<Draft> {
  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select("text, pinned_photos, updated_at, updated_by, polished_text, polished_at, polished_by")
      .eq("id", DRAFT_ID)
      .maybeSingle();
    if (error) {
      console.warn("[story-blog] loadDraft error:", error.message);
      return EMPTY_DRAFT;
    }
    if (!data) return EMPTY_DRAFT;
    return {
      text: data.text ?? "",
      pinnedPhotos: Array.isArray(data.pinned_photos) ? data.pinned_photos : [],
      updatedAt: data.updated_at ?? "",
      updatedBy: data.updated_by ?? "",
      polishedText: data.polished_text ?? "",
      polishedAt: data.polished_at ?? "",
      polishedBy: data.polished_by ?? "",
    };
  } catch (e) {
    console.warn("[story-blog] loadDraft exception:", e);
    return EMPTY_DRAFT;
  }
}

// 寫草稿到 Supabase — 用 upsert, row 不存在就 insert
async function saveDraftToSupabase(
  supabase: ReturnType<typeof createClient>,
  draft: Draft,
  updatedBy: string
): Promise<void> {
  try {
    const { error } = await supabase.from(SUPABASE_TABLE).upsert(
      {
        id: DRAFT_ID,
        text: draft.text,
        pinned_photos: draft.pinnedPhotos,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (error) console.warn("[story-blog] saveDraft error:", error.message);
  } catch (e) {
    console.warn("[story-blog] saveDraft exception:", e);
  }
}

// ── 簡單 Markdown → HTML (Vogue 風預覽用) ──────────────────────────────
// 不用 marked/remark 等 lib (避免多裝 dep), 手寫只支援 4 種: H1, H2, P, IMG
// 🅒 8/5 拍板用的 helper: 「X 秒前 / X 分前」時間格式
// 寫 polished_text 到 Supabase (完稿 = 所有人都會看到)
async function savePolishedToSupabase(
  supabase: ReturnType<typeof createClient>,
  polishedText: string,
  polishedBy: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from(SUPABASE_TABLE)
      .update({
        polished_text: polishedText,
        polished_at: new Date().toISOString(),
        polished_by: polishedBy,
      })
      .eq("id", DRAFT_ID);
    if (error) console.warn("[story-blog] savePolished error:", error.message);
  } catch (e) {
    console.warn("[story-blog] savePolished exception:", e);
  }
}

function timeAgo(iso: string): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - t);
  const sec = Math.floor(diff / 1000);
  if (sec < 5) return "剛剛";
  if (sec < 60) return `${sec} 秒前`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小時前`;
  const day = Math.floor(hr / 24);
  return `${day} 天前`;
}

// 🅒 2026-08-05 聖上拍板: 從 draft.text parse 出已插入的照片 URL list
//   (textarea 是純文字, 但 strip 顯示縮圖, 讓聖上寫字時眼睛看得到用了哪些照片)
interface EmbeddedPhoto {
  url: string;
  caption: string;
  index: number; // 順序
}

function extractEmbeddedPhotos(text: string): EmbeddedPhoto[] {
  const out: EmbeddedPhoto[] = [];
  // Markdown image: ![caption](url)
  const re = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({ caption: m[1] || "", url: m[2], index: out.length });
  }
  return out;
}

// 移除第 N 個 ![](url) 從 draft.text (含前後換行)
//   用 split + filter 避免 regex callback race condition
function removeNthPhoto(text: string, n: number): string {
  const re = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const parts: string[] = [];
  let last = 0;
  let count = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (count === n) {
      parts.push(text.slice(last, m.index));
      last = re.lastIndex;
    }
    count++;
  }
  parts.push(text.slice(last));
  return parts.join("").replace(/\n{3,}/g, "\n\n").trim();
}

// ── 潤稿機制 v1 (規則式, 保留聖上原文每一字) ──────────────────────────
// 邊界: 不刪不改聖上文字, 只在原文前後加 Vogue 殼
// 規則:
//   1. 取第一個 H1 → 拆中英文, 英文大標 italic, 中文章回小標
//   2. 保留所有聖上原文 (Markdown 已含的 # / > / ![] 全部走原樣)
//   3. 若沒有任何內容, 顯示空狀態
interface PolishBlock {
  type: "h1" | "kicker" | "deck" | "rule" | "p" | "quote" | "h2" | "fig";
  text?: string;
  cn?: string;
  en?: string;
  url?: string;
  caption?: string;
}

function polishBlocks(text: string): PolishBlock[] {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  if (!text.trim()) return [];

  const lines = text.split("\n");
  const out: PolishBlock[] = [];

  let firstH1 = "";
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("# ")) {
      firstH1 = t.slice(2);
      break;
    }
  }

  // Vogue 殼頭: kicker + H1 中英 + deck
  if (firstH1) {
    const en = firstH1.replace(/[\u4e00-\u9fa5]/g, "").trim() || "The Long Goodbye";
    const cn = firstH1.replace(/[A-Za-z\s]/g, "").trim() || "桃 園 啟 程";
    out.push({ type: "kicker", text: "Day One · Departure" });
    out.push({ type: "h1", en, cn });
    out.push({ type: "rule" });
  } else {
    out.push({ type: "kicker", text: "Day One · Departure" });
    out.push({ type: "h1", en: "The Long Goodbye", cn: "桃 園 啟 程" });
    out.push({ type: "rule" });
  }

  // 保留所有原文 (跳過第一個 H1, 避免重複)
  let skipFirstH1 = !!firstH1;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (skipFirstH1 && trimmed.startsWith("# ")) {
      skipFirstH1 = false;
      continue;
    }
    skipFirstH1 = false;

    if (trimmed.startsWith("# ")) {
      out.push({ type: "h1", en: trimmed.slice(2).replace(/[\u4e00-\u9fa5]/g, "").trim() });
    } else if (trimmed.startsWith("## ") || trimmed.startsWith("### ")) {
      // 接受 ## 或 ### (LLM 可能用三個)
      const text = trimmed.startsWith("### ") ? trimmed.slice(4) : trimmed.slice(3);
      out.push({ type: "h2", text });
    } else if (trimmed.startsWith("> ")) {
      out.push({ type: "quote", text: trimmed.slice(2) });
    } else if (trimmed.startsWith("![") && trimmed.includes("](")) {
      const m = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (m) {
        out.push({ type: "fig", caption: m[1] || "", url: m[2] });
      }
    } else {
      out.push({ type: "p", text: trimmed });
    }
  }

  return out;
}

export default function D1EditorPage() {
  const [photos, setPhotos] = useState<TravelPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft>({ text: "", pinnedPhotos: [], updatedAt: "" });
  // 🅒 8/5: 當前編輯者名字 (寫進 Supabase updated_by) — 簡單用一個自由輸入欄,
  //   13 位成員打開就能填自己名字, 之後所有 sync 都帶這個名稱
  const [updatedBy, setUpdatedBy] = useState<string>("");
  const [editingName, setEditingName] = useState(false);
  const [polishOpen, setPolishOpen] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [polishedText, setPolishedText] = useState<string | null>(null);
  const [originalDraftText, setOriginalDraftText] = useState<string | null>(null);
  const [polishError, setPolishError] = useState<string | null>(null);
  const [showCopied, setShowCopied] = useState(false);
  // 🅒 8-6 聖上拍板: 統一 toast state (送出完成區 / 採用 / 退回 等 action 都會觸發)
  //   - kind: 'locked' = 金色 (送出完成區) / 'success' = 綠 (採用潤稿) / 'copied' = 藍 (複製)
  //   - 3 秒後自動消失
  const [toast, setToast] = useState<{ msg: string; kind: "locked" | "success" | "copied" } | null>(null);
  const showToast = (msg: string, kind: "locked" | "success" | "copied" = "success") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3000);
  };
  const [slotKey, setSlotKey] = useState("all");
  const [uploaderFilter, setUploaderFilter] = useState<string>("all");
  const [modalPhoto, setModalPhoto] = useState<TravelPhoto | null>(null);
  const [hoverPhoto, setHoverPhoto] = useState<TravelPhoto | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const [photoUrlInput, setPhotoUrlInput] = useState("");
  const [addingPhoto, setAddingPhoto] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // � 8/5: 自動從 localStorage 讀上次填的名字, 避免每次開都要重打
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("story-blog-d1-member-name");
    if (saved) setUpdatedBy(saved);
  }, []);

  // 當 updatedBy 變更 → 寫回 localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (updatedBy) localStorage.setItem("story-blog-d1-member-name", updatedBy);
  }, [updatedBy]);

  // 載入 165 張 D1 Takeout + 從 Supabase 讀草稿 + realtime 訂閱
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const all = await fetchAllPhotos();
      setPhotos(all.filter((p) => p.day === 1));
      const loaded = await loadDraftFromSupabase(supabase);
      setDraft(loaded);
      setLoading(false);
      setMounted(true); // 標記 client mount 完成, 解 hydration date 不一致
    })();

    // Realtime: 別的成員更新時即時收到, 自動覆蓋本地 (避免互相覆蓋的最簡單方式)
    const channel = supabase
      .channel(`story-blog-d1-${DRAFT_ID}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: SUPABASE_TABLE, filter: `id=eq.${DRAFT_ID}` },
        (payload) => {
          const row = payload.new as { text?: string; pinned_photos?: string[]; updated_at?: string; updated_by?: string; polished_text?: string; polished_at?: string; polished_by?: string };
          setDraft({
            text: row.text ?? "",
            pinnedPhotos: Array.isArray(row.pinned_photos) ? row.pinned_photos : [],
            updatedAt: row.updated_at ?? "",
            updatedBy: row.updated_by ?? "",
            polishedText: row.polished_text ?? "",
            polishedAt: row.polished_at ?? "",
            polishedBy: row.polished_by ?? "",
          });
          // 🅒 8-5: 別人潤稿完 → 即時更新自己右側完稿區
          if (row.polished_text) {
            setPolishedText(row.polished_text);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 草稿變更 → debounce 500ms 後 upsert 到 Supabase (realtime 廣播給其他成員)
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      const supabase = createClient();
      saveDraftToSupabase(supabase, draft, updatedBy);
    }, 500);
    return () => clearTimeout(t);
  }, [draft, loading, updatedBy]);

  // 候選池: D1 全部 + 篩選 + pinned 優先排序
  const displayPhotos = useMemo(() => {
    const slot = TIME_SLOTS.find((s) => s.key === slotKey);
    const filtered = photos.filter((p) => {
      if (slot?.range) {
        if (p.hour < slot.range[0] || p.hour > slot.range[1]) return false;
      }
      if (uploaderFilter !== "all" && p.uploader_name !== uploaderFilter) return false;
      return true;
    });
    const pinned = filtered.filter((p) => draft.pinnedPhotos.includes(p.filename));
    const others = filtered.filter((p) => !draft.pinnedPhotos.includes(p.filename));
    return [...pinned, ...others];
  }, [photos, draft.pinnedPhotos, slotKey, uploaderFilter]);

  // uploader chip 列表 (從 photos 動態抽出)
  const uploaderList = useMemo(() => {
    const set = new Set<string>();
    photos.forEach((p) => p.uploader_name && set.add(p.uploader_name));
    return Array.from(set).sort();
  }, [photos]);

  // 🅒 8-5: 解析 draft.text 中所有 ![](url) — 給縮圖 strip 用
  // 🅒 8-5: 解析 draft.text → blocks (locked + editing)
  const blocks = useMemo<Block[]>(() => parseBlocks(draft.text), [draft.text]);
  // 編輯區 textarea 只放「未鎖定」區塊的內容, 鎖定的不污染使用者繼續寫的空間
  const editingText = useMemo(() => editingBlocksToText(editingBlocksOnly(blocks)), [blocks]);
  // 完稿區 — 只 locked blocks (新獨立顯示)
  const lockedBlocks = useMemo(() => blocks.filter((b) => b.status === "locked"), [blocks]);

  // 🅒 8-6 聖上拍板: 從「新的 editing text」重建 draft.text — preserve locked 段位置
  //   策略: 解析 newEditingText → 新 editing blocks, 然後跟既有 locked blocks 按原始位置交錯
  //   目前簡化策略: 把新 editing blocks append 在所有 locked blocks 之後 (locked 段都集中在前面)
  //   之後 Stage 2 Story Outline 階段會升級成「按原始位置交錯」
  const rebuildDraftFromEditing = (newEditingText: string) => {
    const newEditingBlocks = parseBlocks(newEditingText).map((b, i) => ({
      ...b,
      status: "editing" as const,
      // 編輯區 block 重新生成 id (避免跟 locked id 衝突)
      id: b.id.startsWith("e") ? b.id : `e${Date.now().toString(36)}${i}${Math.random().toString(36).slice(2, 5)}`,
    }));
    const merged: Block[] = [...lockedBlocks, ...newEditingBlocks];
    return serializeBlocks(merged);
  };

  // 聖上在編輯區打字 → 觸發重建 (locked 段不動, 只替換 editing 部分)
  const handleEditingTextChange = (newEditingText: string) => {
    // 🅒 8-6: 即時計算 embedded photos — 從 newEditingText 抽, 避免閃爍
    const newText = rebuildDraftFromEditing(newEditingText);
    setDraft({ ...draft, text: newText });
  };

  // 操作: 鎖定第 i 個 block → status: locked (包 LOCK marker)
  const lockBlock = (i: number) => {
    const newBlocks = blocks.map((b, idx) =>
      idx === i ? { ...b, status: "locked" as const, id: b.status === "editing" ? `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` : b.id } : b
    );
    setDraft({ ...draft, text: serializeBlocks(newBlocks) });
  };
  // 解鎖第 i 個 block → status: editing (移除 LOCK marker)
  const unlockBlock = (i: number) => {
    const newBlocks = blocks.map((b, idx) =>
      idx === i ? { ...b, status: "editing" as const, id: b.id } : b
    );
    setDraft({ ...draft, text: serializeBlocks(newBlocks) });
  };
  // 上下移動
  const moveBlock = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const newBlocks = [...blocks];
    [newBlocks[i], newBlocks[j]] = [newBlocks[j], newBlocks[i]];
    setDraft({ ...draft, text: serializeBlocks(newBlocks) });
  };

  // 🅒 8-8 聖上拍板: 「編輯時乾淨, 完工的不要干擾」— strip 只顯示 editing 段內的圖
  //   修前: extractEmbeddedPhotos(draft.text) 從全文抽,locked 段內的圖也顯示在 strip
  //         → 聖上看 strip 以為「這些照片還沒鎖定」實際已在完成區 (嚴重干擾)
  //   修後: 只從 editingText 抽 — strip 是「聖上正在編輯的照片」, 已送出的不顯示
  //   index 仍對應 editingText 內位置 (removeNthPhoto 也改吃 editingText)
  const editingEmbeddedPhotos = useMemo(() => extractEmbeddedPhotos(editingText), [editingText]);

  // ── 拖曳縮圖到 textarea → 插入 ![](url) 到游標 (純圖, 不含檔名) ──────────
  const handleDragStart = (e: React.DragEvent, photo: TravelPhoto) => {
    const md = `![](${photo.google_photos_thumb_url ?? ""})`;
    e.dataTransfer.setData("text/plain", md);
    e.dataTransfer.setData("text/markdown", md);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleTextareaDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const md = e.dataTransfer.getData("text/plain");
    const ta = textareaRef.current;
    if (!ta || !md) return;
    // 🅒 8-6: cursor 位置是 editingText 內, 要對應到 draft.text 內的位置
    //   策略: locked 段先序列化 → editingText 從後面開始; cursor 位置直接 append 到 editingText 末尾
    //   簡化: 拖到 cursor 位置 (editingText 範圍內)
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = editingText.slice(0, start);
    const after = editingText.slice(end);
    const insert = (before.endsWith("\n") || before === "" ? "" : "\n") + md + "\n";
    const newEditingText = before + insert + after;
    handleEditingTextChange(newEditingText);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + insert.length;
    });
  };

  const togglePin = (filename: string) => {
    setDraft((d) => ({
      ...d,
      pinnedPhotos: d.pinnedPhotos.includes(filename)
        ? d.pinnedPhotos.filter((f) => f !== filename)
        : [...d.pinnedPhotos, filename],
    }));
  };

  // 雙擊插入 = 也用純圖 ![](url), 不含檔名
  const insertPhotoAtCursor = (photo: TravelPhoto) => {
    const ta = textareaRef.current;
    const md = `![](${photo.google_photos_thumb_url ?? ""})`;
    if (!ta) {
      // 🅒 8-6: textarea 沒 ref 時, append 到 editing text 末尾
      const newEditingText = editingText + "\n" + md + "\n";
      handleEditingTextChange(newEditingText);
      return;
    }
    // 🅒 8-6: 用 editingText 的 cursor 位置 (locked 段不在 textarea 內)
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = editingText.slice(0, start);
    const after = editingText.slice(end);
    const insert = (before.endsWith("\n") || before === "" ? "" : "\n") + md + "\n";
    handleEditingTextChange(before + insert + after);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + insert.length;
    });
  };

  // 🅒 8-8 聖上拍板: 從 Google Photos lh3 URL 加照片進候選池
  //   流程: client 拿 lh3 URL → POST /api/photo-proxy 取 bytes → 上傳 Supabase Storage
  //         → 寫 travel_photo_meta row → 出現在候選池
  //   限制: Google Photos 不開放 API 批量抓單張 URL, 需手動從 Google 相簿右鍵複製 lh3 圖片網址
  const addPhotoByUrl = async () => {
    const url = photoUrlInput.trim();
    if (!url) {
      showToast("請貼 Google Photos lh3 圖片網址", "locked");
      return;
    }
    if (!url.includes("googleusercontent.com") && !url.includes("photos.google.com")) {
      showToast("URL 必須是 lh3.googleusercontent.com 或 photos.google.com", "locked");
      return;
    }
    setAddingPhoto(true);
    try {
      // Step 1: server-side proxy 取 bytes (避免 CORS)
      const proxyRes = await fetch("/api/photo-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!proxyRes.ok) {
        const errBody = await proxyRes.text();
        throw new Error(`proxy ${proxyRes.status}: ${errBody.slice(0, 100)}`);
      }
      const blob = await proxyRes.blob();
      const contentType = proxyRes.headers.get("Content-Type") || "image/jpeg";

      // Step 2: 上傳到 Supabase Storage (走 service_role server route)
      const ext = contentType.includes("png") ? "png" : "jpg";
      const filename = `lh3-${Date.now()}.${ext}`;
      const storagePath = `day1/${filename}`;
      const uploadRes = await fetch("/api/story-blog/upload-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: storagePath, contentType, base64: await blobToBase64(blob) }),
      });
      if (!uploadRes.ok) {
        const errBody = await uploadRes.text();
        throw new Error(`upload ${uploadRes.status}: ${errBody.slice(0, 100)}`);
      }
      const { publicUrl } = await uploadRes.json();

      // Step 3: 寫 travel_photo_meta row
      const sb = createClient();
      const now = new Date().toISOString();
      const { data: inserted, error: insertErr } = await sb
        .from("travel_photo_meta")
        .insert({
          filename,
          google_photos_thumb_url: publicUrl,
          day: 1,
          hour: parseInt(now.slice(11, 13), 10),
          datetime_original: now,
          uploader_name: updatedBy || "lh3-import",
          caption: "從 Google Photos lh3 URL 加入",
        })
        .select()
        .single();
      if (insertErr) throw new Error(`insert ${insertErr.code}: ${insertErr.message}`);

      // Step 4: 加進 photos state (候選池立即顯示)
      if (inserted) {
        setPhotos((prev) => [inserted, ...prev]);
        showToast(`✅ 已加入 ${filename}`, "success");
        setPhotoUrlInput("");
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      showToast(`❌ 加入失敗: ${err?.message ?? e}`, "locked");
    } finally {
      setAddingPhoto(false);
    }
  };

  // Blob → base64 (browser 原生 FileReader)
  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(",")[1] ?? "");
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const copyForLLM = async () => {
    await navigator.clipboard.writeText(draft.text);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  // ── 潤稿: 呼叫 /api/polish-d1 ──────────────────────────────────────
  const [polishWarning, setPolishWarning] = useState<string | null>(null);

  const handlePolish = async () => {
    // 🅒 8-5: 只潤「未鎖定」區塊, locked 區不送 LLM
    const editingBlocks = editingBlocksOnly(blocks);
    const editingRaw = editingBlocksToText(editingBlocks);
    if (!editingRaw.trim()) {
      setPolishError("編輯區是空的, 先打字才能潤稿 (或解鎖現有完稿區段落)");
      return;
    }
    setPolishing(true);
    setPolishError(null);
    setPolishWarning(null);
    setOriginalDraftText(editingRaw); // 保留原稿以便退回
    try {
      // 抓前 30 張 D1 照片 EXIF 作為 context
      // 🅒 8-8 UTC 污染 bug 修法: 預先算好 TPE 時間字串給 LLM (避免 LLM 把 raw UTC 當 TPE 寫進內文)
      const exifContext = photos.slice(0, 30).map((p) => {
        const tpeStr = p.datetime_original
          ? new Date(p.datetime_original).toLocaleString("zh-TW", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
              timeZone: "Asia/Taipei",
            })
          : null;
        return {
          filename: p.filename,
          hour: p.hour,
          datetime_original: p.datetime_original,
          datetime_local_tpe: tpeStr, // 預先算好 TPE (給 LLM 用)
          uploader_name: p.uploader_name ?? undefined,
          location_name: p.location_name ?? undefined,
        };
      });
      const res = await fetch("/api/polish-d1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalText: editingRaw, exifContext }),
      });
      const data = await res.json();
      // 🅒 8-5: 把潤稿結果 append 回 blocks (保留 locked 段)
      const newBlocks: Block[] = [
        ...blocks.filter((b) => b.status === "locked"),
        ...parseBlocks(data.polishedText).map((b) => ({ ...b, status: "editing" as const })),
      ];
      const mergedText = serializeBlocks(newBlocks);
      if (data.fallback) {
        // 配額爆或 API 5xx → fallback 用原文 + 警告
        setPolishWarning(data.warning ?? "已 fallback 用規則式 Vogue 殼渲染");
        setPolishedText(data.polishedText);
        // 🅒 8-6 聖上拍板: 不在潤稿當下 auto-save polished_text
        //   - 之前會覆寫整個 polished_text, 導致 read page 只看到最新一次潤稿
        //   - 新策略: polished_text 只在「送出完成區」時 append, 不再 auto-save
      } else if (!res.ok) {
        setPolishError(data.error || `API ${res.status}`);
        setPolishedText(null);
      } else {
        setPolishedText(data.polishedText);
        // 🅒 8-6 聖上拍板: 同上 — 不在潤稿當下覆寫 polished_text
        //   sendPolishedToLocked 才 append 累積
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      setPolishError(err?.message ?? "Unknown error");
      setPolishedText(null);
    } finally {
      setPolishing(false);
    }
  };

  // 🅒 8-5: 送出潤稿結果到「完成區」(locked) — append 到所有 locked 段之後
  const sendPolishedToLocked = async () => {
    if (polishedText === null) return;
    // 把 polishedText 拆 blocks (它可能含多個 h2/p/quote/image)
    const newLockedBlocks: Block[] = parseBlocks(polishedText).map((b, i) => ({
      ...b,
      id: `l${Date.now().toString(36)}${i.toString(36)}${Math.random().toString(36).slice(2, 5)}`,
      status: "locked" as const,
    }));
    // 合併: 原有 locked 段 + 新送出的 locked 段 (其餘 editing 段保留原位)
    const currentLocked = blocks.filter((b) => b.status === "locked");
    const merged: Block[] = [...currentLocked, ...newLockedBlocks];
    setDraft({ ...draft, text: serializeBlocks(merged) });
    setPolishedText(null);
    setOriginalDraftText(null);
    setPolishError(null);
    setPolishWarning(null);
    // 🅒 8-6 聖上拍板: 把新送出的 Vogue 潤稿段 append 到 polished_text (累積, 不覆寫)
    //   - 之前的邏輯: 潤稿當下就覆寫 polished_text → read page 只看到最新一次
    //   - 新策略: 只在「送出完成區」時 append, read page 才能看到所有送出段累積
    //   - 解析既有 polished_text blocks, append 新送出段, 再 serialize 回 polished_text
    const existingPolished = draft.polishedText ?? "";
    const existingPolishedBlocks = parseBlocks(existingPolished).map((b) => ({
      ...b,
      // 既有 polished_text 內的段視為已送出 (locked)
      status: "locked" as const,
    }));
    // 合併: 既有 polished (locked) + 新送出段
    // 注意: 新送出段的 raw 是 Vogue 風散文, parseBlocks 拆出的 blocks 已經是完整 Vogue 結構
    const accumulatedPolishedBlocks: Block[] = [
      ...existingPolishedBlocks,
      ...newLockedBlocks,
    ];
    const accumulatedPolishedText = serializeBlocks(accumulatedPolishedBlocks);
    await savePolishedToSupabase(createClient(), accumulatedPolishedText, updatedBy);
    // 🅒 8-6: 更新本地 polishedText state 讓其他 client 看到
    //   (Supabase realtime 會 broadcast, 但本地立即更新更可靠)
    // 🅒 8-6: 觸發金色 toast 通知聖上「已送出 N 段到完成區」
    showToast(`🎉 已送出 ${newLockedBlocks.length} 段到完成區 (累計 ${merged.length} 段)`, "locked");
  };

  const acceptPolished = () => {
    if (polishedText !== null) {
      setDraft({ ...draft, text: polishedText });
      setPolishedText(null);
      setOriginalDraftText(null);
      setPolishError(null);
      setPolishWarning(null);
      // 🅒 8-6: 採用潤稿 → 綠色 toast
      showToast("✓ 已採用潤稿, 寫回草稿", "success");
    }
  };

  const rejectPolished = () => {
    if (originalDraftText !== null) {
      setDraft({ ...draft, text: originalDraftText });
    }
    setPolishedText(null);
    setOriginalDraftText(null);
    setPolishError(null);
    setPolishWarning(null);
  };

  // ── 主編輯 UI ────────────────────────────────────────────────────────
  return (
    <div className="editor-root">
      <header className="ed-header">
        <div className="ed-header-left">
          <a href="/travel/story-blog" className="ed-back">
            ← Story Blog
          </a>
          <span className="ed-title">📝 D1 桃園啟程 — 編輯後台</span>
          <span className="ed-badge">🅒 Preview · 不寫進 git</span>
          {/* 🅒 8-8 聖上拍板: 顯示已完成段數提示 (點此跳到獨立完成區頁面)
              從原本「🏆 完成區 panel」簡化為 chip — 完整內容另開 /d1/complete 頁面 */}
          {lockedBlocks.length > 0 && (
            <a
              href="/travel/story-blog/d1/complete"
              className="ed-locked-count-chip"
              title="點此開新頁看完成區 (已送出的 Vogue 潤稿版)"
            >
              🏆 完成區 ({lockedBlocks.length} 段) →
            </a>
          )}
        </div>
        <div className="ed-header-right">
          {/* 🅒 8/5: 編輯者名稱 + 最後更新資訊 (realtime 共享編輯核心) */}
          <div className="ed-author-chip" title="所有成員共用此草稿, 填你的名字就會被標在更新記錄">
            {editingName ? (
              <input
                autoFocus
                className="ed-author-input"
                placeholder="你的名字"
                value={updatedBy}
                onChange={(e) => setUpdatedBy(e.target.value)}
                onBlur={() => setEditingName(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setEditingName(false);
                }}
              />
            ) : (
              <button
                className="ed-author-btn"
                onClick={() => setEditingName(true)}
              >
                {updatedBy ? `✏️ ${updatedBy}` : "👤 點我填名字"}
              </button>
            )}
            {draft.updatedBy && (
              <span className="ed-last-by">
                · 最後更新 <strong>{draft.updatedBy}</strong>
                {mounted && draft.updatedAt && (
                  <> · {timeAgo(draft.updatedAt)}</>
                )}
              </span>
            )}
          </div>
          <span className="ed-stats">
            {loading
              ? "載入中…"
              : `${photos.length} 張 · ${draft.pinnedPhotos.length} 精選 · ${draft.text.length} 字`}
            {draft.updatedAt && !loading && mounted && (
              <span className="ed-saved"> · 已存 {new Date(draft.updatedAt).toLocaleTimeString("zh-TW", { timeZone: "Asia/Taipei" })}</span>
            )}
          </span>
          <button
            className="ed-btn-secondary"
            onClick={() => {
              setPolishOpen((v) => !v);
              if (!polishOpen) handlePolish(); // 開啟時自動觸發潤稿
            }}
            disabled={polishing}
            title="聖上口述 → Vogue 編輯風散文 (LLM API)"
            style={{
              background: polishOpen ? "#c41e3a" : undefined,
              color: polishOpen ? "white" : undefined,
              borderColor: polishOpen ? "#c41e3a" : undefined,
              opacity: polishing ? 0.6 : 1,
            }}
          >
            {polishing ? "⏳ 潤稿中..." : `✨ 潤稿 ${polishOpen ? "ON" : ""}`}
          </button>
          <button className="ed-btn-secondary" onClick={copyForLLM} title="複製 Markdown 給臣潤稿">
            📋 複製給臣潤稿
          </button>
          {/* 🅒 8-8 聖上拍板: 「✅ Confirm 潤稿完成」 — 整篇潤稿版送至完成區
              流程: 聖上拉照片+寫字 → 按 [✨ 潤稿] → 右側 panel 顯示 Vogue 潤稿版
                  → 聖上看 OK → 按本按鈕 → 潤稿版進完成區 (append 到 Supabase polished_text)
              條件: 只有在「有潤稿結果」時才顯示 (polishedText !== null)
              取代: 之前亂做的 confirmAllEditing (那個直接送原始版, 違背聖上「先潤稿才 confirm」流程) */}
          {polishedText !== null && (
            <button
              className="ed-btn-confirm"
              onClick={sendPolishedToLocked}
              title="把 AI 潤稿版送出到完成區 — append 到 Supabase polished_text (讀者看的就是這版)"
            >
              ✅ Confirm 潤稿完成
            </button>
          )}
        </div>
      </header>

      {showCopied && <div className="ed-toast">✓ 已複製到剪貼簿 — 貼給臣</div>}
      {/* 🅒 8-6: 統一 toast UI (取代分散的 showCopied 等單一用途 toast) */}
      {toast && (
        <div className={`ed-toast ed-toast-${toast.kind}`}>{toast.msg}</div>
      )}

      {/* ── Hover 大圖浮層 (滑鼠跟著游標) ───────────────────────────── */}
      {hoverPhoto && (
        <div
          className="ed-hover-preview"
          style={{ left: hoverPos.x + 24, top: hoverPos.y + 24 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hoverPhoto.google_photos_thumb_url ?? ""} alt={hoverPhoto.filename} />
          <div className="ed-hover-info">
            <div>
              <strong>#{hoverPhoto.filename}</strong>
            </div>
            <div>
              {hoverPhoto.uploader_name ?? "未標"}
              {mounted &&
                ` · ${new Date(hoverPhoto.datetime_original).toLocaleTimeString("zh-TW", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Asia/Taipei",
                })}`}
            </div>
            {hoverPhoto.location_name && <div>📍 {hoverPhoto.location_name}</div>}
          </div>
        </div>
      )}

      {/* ── 點擊大圖 modal ──────────────────────────────────────────── */}
      {modalPhoto && (
        <div className="ed-modal-backdrop" onClick={() => setModalPhoto(null)}>
          <div className="ed-modal" onClick={(e) => e.stopPropagation()}>
            <button className="ed-modal-close" onClick={() => setModalPhoto(null)}>
              ✕
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={modalPhoto.google_photos_thumb_url ?? ""}
              alt={modalPhoto.filename}
              className="ed-modal-img"
            />
            <div className="ed-modal-info">
              <h3>#{modalPhoto.filename}</h3>
              <p suppressHydrationWarning>
                <strong>EXIF:</strong>{" "}
                {mounted && new Date(modalPhoto.datetime_original).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}
              </p>
              <p>
                <strong>拍攝者:</strong> {modalPhoto.uploader_name ?? "未標"}
              </p>
              {modalPhoto.location_name && (
                <p>
                  <strong>地點:</strong> {modalPhoto.location_name}
                </p>
              )}
              <p>
                <strong>GPS:</strong>{" "}
                {modalPhoto.lat?.toFixed(4)}, {modalPhoto.lng?.toFixed(4)}
              </p>
              <div className="ed-modal-actions">
                <button
                  className="ed-btn-primary"
                  onClick={() => {
                    insertPhotoAtCursor(modalPhoto);
                    setModalPhoto(null);
                  }}
                >
                  ✅ 插入到文字區
                </button>
                <button
                  className="ed-btn-secondary"
                  onClick={() => {
                    togglePin(modalPhoto.filename);
                  }}
                >
                  {draft.pinnedPhotos.includes(modalPhoto.filename) ? "⭐ 取消精選" : "☆ 標精選"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`ed-body ${polishOpen ? "is-polish" : ""}`}>
        {/* ── 候選照片池 (左) ─────────────────────────────────────────── */}
        <aside className="ed-pool">
          <div className="ed-pool-header">
            <h3>📸 候選照片池 (D1 真實 Takeout · {displayPhotos.length}/{photos.length})</h3>
            <span className="ed-pool-hint">
              點=看大圖 / 雙擊=插入文字 / ⭐=精選 / 拖到右邊=插入
            </span>
            {/* 🅒 8-8 聖上拍板: 從 Google Photos lh3 URL 加照片進候選池 */}
            <div className="ed-url-add">
              <input
                type="text"
                className="ed-url-input"
                placeholder="貼 lh3.googleusercontent.com URL..."
                value={photoUrlInput}
                onChange={(e) => setPhotoUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addPhotoByUrl();
                }}
                disabled={addingPhoto}
              />
              <button
                className="ed-url-btn"
                onClick={addPhotoByUrl}
                disabled={addingPhoto || !photoUrlInput.trim()}
              >
                {addingPhoto ? "⏳ 加入中..." : "➕ 加入"}
              </button>
            </div>
            <div className="ed-filter-row">
              <select
                className="ed-select"
                value={slotKey}
                onChange={(e) => setSlotKey(e.target.value)}
              >
                {TIME_SLOTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
              <select
                className="ed-select"
                value={uploaderFilter}
                onChange={(e) => setUploaderFilter(e.target.value)}
              >
                <option value="all">全部成員</option>
                {uploaderList.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {loading ? (
            <div className="ed-loading">載入 Supabase 中…</div>
          ) : photos.length === 0 ? (
            <div className="ed-empty">沒有 D1 照片 — 請檢查 Supabase</div>
          ) : (
            <div className="ed-grid">
              {displayPhotos.map((p) => {
                const isPinned = draft.pinnedPhotos.includes(p.filename);
                return (
                  <div
                    key={p.id}
                    className={`ed-cell ${isPinned ? "is-pinned" : ""}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, p)}
                    onClick={() => setModalPhoto(p)}
                    onDoubleClick={() => insertPhotoAtCursor(p)}
                    onMouseEnter={(e) => {
                      setHoverPhoto(p);
                      setHoverPos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseMove={(e) => setHoverPos({ x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setHoverPhoto(null)}
                    title={`#${p.filename} · ${p.uploader_name ?? "未標"} · 點=看大圖 / 雙擊=插入 / ⭐=精選`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.google_photos_thumb_url ?? ""}
                      alt={p.filename}
                      loading="lazy"
                      draggable={false}
                    />
                    <button
                      className="ed-pin"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePin(p.filename);
                      }}
                      title={isPinned ? "取消精選" : "標精選"}
                    >
                      {isPinned ? "⭐" : "☆"}
                    </button>
                    <div className="ed-cell-label">
                      #{p.filename} · {String(p.hour).padStart(2, "0")}:xx
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>

        {/* ── Markdown 文字區 (中) ─────────────────────────────────────── */}
        <main className="ed-editor">
          <div className="ed-editor-header">
            <h3>📝 編輯區 (聖上原始草稿)</h3>
            <span className="ed-hint">
              支援 <code># 一級標題</code> / <code>## 二級</code> / <code>&gt; 引用</code> /
              <code>![caption](url)</code>
            </span>
          </div>

          {/* 🅒 8-8 聖上拍板: 已插入照片縮圖 strip — 只顯示 editing 段內照片
                        locked 段內的照片已在「🏆 完成區」對應段預覽, 不再在 strip 重複顯示
                        聖上看 strip = 「我現在正在編輯的照片清單」— 完工的不來干擾 */}
                    {editingEmbeddedPhotos.length > 0 && (
                      <div className="ed-photo-strip">
                        <div className="ed-photo-strip-label">
                          📸 編輯中照片 <strong>{editingEmbeddedPhotos.length}</strong> 張 (locked 段照片不顯示)
                        </div>
                        <div className="ed-photo-strip-row">
                          {editingEmbeddedPhotos.map((p) => (
                            <div key={p.index} className="ed-photo-strip-item">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={p.url}
                                alt={p.caption || `photo ${p.index + 1}`}
                                className="ed-photo-strip-img"
                                loading="lazy"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.opacity = "0.2";
                                }}
                              />
                              <button
                                type="button"
                                className="ed-photo-strip-remove"
                                onClick={() => handleEditingTextChange(removeNthPhoto(editingText, p.index))}
                                title="從編輯區移除"
                              >
                                ✕
                              </button>
                              {p.caption && (
                                <div className="ed-photo-strip-cap">{p.caption}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

          {/* 🅒 8-8 聖上拍板: 完稿區另作一頁 — 不放在編輯後台
              此 panel 已抽出到獨立頁面 /travel/story-blog/d1/complete
              編輯後台保留連結 + 已送出數字提示, 避免畫面過擠 */}

          <textarea
            ref={textareaRef}
            className="ed-textarea"
            value={editingText}
            onChange={(e) => handleEditingTextChange(e.target.value)}
            onDrop={handleTextareaDrop}
            onDragOver={(e) => e.preventDefault()}
            placeholder={
              lockedBlocks.length > 0
                ? `繼續寫編輯區段落 (${lockedBlocks.length} 段已送出完成區)\n\n支援 # 一級標題 / ## 二級 / > 引用 / ![caption](url)`
                : D1_PLACEHOLDER
            }
          />

                    {/* 🅒 8-6 聖上拍板: 段落管理只顯示 editing 段 — locked 段已在「完成區」panel, 不重複
             - 修前: blocks.map 顯示全部 4 段 (4 locked + 0 editing) — 聖上看 4 個 locked 段干擾
             - 修後: 只 filter editing 段, 完全乾淨 (locked 段從此 panel 完全消失) */}
          {editingBlocksOnly(blocks).length > 0 && (
            <div className="ed-block-controls">
              <div className="ed-block-controls-header">
                📚 段落管理 ({editingBlocksOnly(blocks).length} 段待潤稿)
              </div>
              <div className="ed-block-controls-list">
                {editingBlocksOnly(blocks).map((b) => {
                  // 找 b 在原 blocks 陣列的 index (moveBlock 用)
                  const originalIndex = blocks.findIndex((orig) => orig.id === b.id);
                  return (
                    <div key={b.id} className="ed-block-row is-editing">
                      <span className="ed-block-num">{originalIndex + 1}</span>
                      <span className="ed-block-type">{b.type}</span>
                      <span className="ed-block-preview">
                        {b.raw.length > 40 ? b.raw.slice(0, 40) + "..." : b.raw}
                      </span>
                      <span className="ed-block-status">✏️ 編輯中</span>
                      <button
                        type="button"
                        className="ed-block-btn"
                        onClick={() => moveBlock(originalIndex, -1)}
                        disabled={originalIndex === 0}
                        title="上移"
                      >
                        ⬆
                      </button>
                      <button
                        type="button"
                        className="ed-block-btn"
                        onClick={() => moveBlock(originalIndex, 1)}
                        disabled={originalIndex === blocks.length - 1}
                        title="下移"
                      >
                        ⬇
                      </button>
                      <button
                        type="button"
                        className="ed-block-btn ed-block-lock-btn"
                        onClick={() => lockBlock(originalIndex)}
                        title="鎖定到完稿區"
                      >
                        🔒 鎖定
                      </button>
                    </div>
                  );
                })}
                {editingBlocksOnly(blocks).length === 0 && (
                  <div className="ed-block-empty">textarea 是空的, 開始打字 → 按 🔒 鎖定段落</div>
                )}
              </div>
            </div>
          )}
          <details className="ed-raw">
            <summary>查看純文字 raw (給臣潤稿用)</summary>
            <pre>{draft.text}</pre>
          </details>
        </main>

        {/* ── 潤稿預覽欄 (右, polishOpen 時展開) ────────────────────── */}
        {polishOpen && (
          <aside className="ed-polish">
            <div className="ed-polish-header">
              <h3>✨ Vogue 風 LLM 潤稿</h3>
              <small>聖上原文 → 臣 Vogue 散文</small>
            </div>
            <div className="ed-polish-content">
              {polishing ? (
                <div className="pl-empty">
                  ⏳ 臣正在潤稿中...
                  <br />
                  <small style={{ marginTop: 12, display: "block", color: "#8a8a8a" }}>
                    把聖上口述 + EXIF 真實拍攝時間餵給 LLM
                    <br />
                    約需 8-30 秒
                  </small>
                </div>
              ) : polishError ? (
                <div className="pl-empty" style={{ color: "#c41e3a" }}>
                  ❌ 潤稿失敗
                  <br />
                  <small style={{ marginTop: 12, display: "block", color: "#8a8a8a", wordBreak: "break-all" }}>
                    {polishError}
                  </small>
                  <button
                    className="ed-btn-secondary"
                    onClick={handlePolish}
                    style={{ marginTop: 16 }}
                  >
                    🔄 重試
                  </button>
                </div>
              ) : polishedText === null ? (
                <div className="pl-empty">
                  按 [✨ 潤稿] 按鈕開始潤稿
                </div>
              ) : (
                <>
                  {polishWarning && (
                    <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", color: "#92400e", padding: "10px 14px", borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
                      ⚠️ {polishWarning}
                    </div>
                  )}
                  {/* 照片數量 chip + scroll to first image */}
                  {(() => {
                    const imgCount = polishedText.match(/!\[[^\]]*\]\([^)]+\)/g)?.length ?? 0;
                    if (imgCount === 0) return null;
                    return (
                      <button
                        onClick={() => {
                          const content = document.querySelector('.ed-polish-content');
                          const firstImg = content?.querySelector('figure img');
                          firstImg?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        style={{
                          background: '#fef3c7', border: '1px solid #f59e0b',
                          color: '#92400e', padding: '8px 14px', borderRadius: 20,
                          marginBottom: 16, fontSize: 12, fontWeight: 700,
                          cursor: 'pointer', fontFamily: 'inherit',
                          display: 'inline-flex', alignItems: 'center', gap: 6
                        }}
                      >
                        📷 本頁含 {imgCount} 張照片 — 點此跳到第一張 ↓
                      </button>
                    );
                  })()}
                  <div style={{ display: "flex", gap: 8, marginBottom: 20, padding: "12px 16px", background: "white", borderRadius: 6, border: "1px solid #d4d4d4" }}>
                    <button
                      onClick={acceptPolished}
                      style={{ flex: 1, background: "#059669", color: "white", border: "none", padding: "10px", borderRadius: 4, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      ✓ 採用潤稿 (寫回草稿)
                    </button>
                    {/* 🅒 8-8 聖上拍板: 「✓✓ 送出到完成區」按鈕已移除
                        統一從頂部「✅ Confirm 潤稿完成」按鈕送完成區, 避免聖上看兩個一樣功能的按鈕 */}
                    <button
                      onClick={rejectPolished}
                      style={{ flex: 1, background: "white", color: "#1e293b", border: "1px solid #d4d4d4", padding: "10px", borderRadius: 4, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      ✕ 退回原稿
                    </button>
                  </div>
                  <div className="pl-masthead">
                    <div className="pl-meta">江南水鄉 · 八日 · 2026</div>
                  </div>
                  {polishBlocks(polishedText).map((b, i) => {
                    if (b.type === "kicker") return <div key={i} className="pl-kicker">{b.text}</div>;
                    if (b.type === "h1") return (
                      <div key={i}>
                        <div className="pl-h1">{b.en}</div>
                        {b.cn && <span className="pl-h1-cn">{b.cn}</span>}
                      </div>
                    );
                    if (b.type === "deck") return <p key={i} className="pl-deck">{b.text}</p>;
                    if (b.type === "rule") return <div key={i} className="pl-rule"></div>;
                    if (b.type === "h2") return <h2 key={i} style={{ fontFamily: '"Noto Serif TC", "PingFang TC", serif', fontWeight: 700, fontSize: 22, letterSpacing: 4, margin: "40px 0 16px", padding: "8px 0", borderTop: "1px solid #d4d4d4", borderBottom: "1px solid #d4d4d4", color: "#0a0a0a" }}>{b.text}</h2>;
                    if (b.type === "quote") return <blockquote key={i} className="pl-quote">{b.text}</blockquote>;
                    if (b.type === "p") return <p key={i} className="pl-p">{b.text}</p>;
                    if (b.type === "fig") return (
                      <figure key={i} style={{ margin: "24px 0" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={b.url} alt={b.caption} style={{ width: "100%", borderRadius: 4 }} />
                        {b.caption && (
                          <figcaption style={{ fontStyle: "italic", fontSize: 12, color: "#8a8a8a", marginTop: 8 }}>
                            {b.caption}
                          </figcaption>
                        )}
                      </figure>
                    );
                    return null;
                  })}
                </>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

