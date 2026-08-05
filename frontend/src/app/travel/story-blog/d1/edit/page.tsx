// 🅒 2026-08-05 聖上拍板: D1 升級成 Supabase 共享編輯 (所有成員即時同步, 不再用 localStorage)
//   8/2 原本設計是 localStorage 私人草稿, 8/5 聖上說「所有用戶專注 D1」改為共用
//   realtime 同步, 但「D1 是焦點」原則不變 — D2-D8 仍不開放, 點進去只看到 stub

"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { fetchAllPhotos, type TravelPhoto } from "@/utils/travelPhotos";
import "./editor.css";

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
import { D1_PLACEHOLDER, renderVogueMarkdown } from "../d1-shared";

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
    out.push({ type: "deck", text: "聖上口述 · 臣潤稿" });
    out.push({ type: "rule" });
  } else {
    out.push({ type: "kicker", text: "Day One · Departure" });
    out.push({ type: "h1", en: "The Long Goodbye", cn: "桃 園 啟 程" });
    out.push({ type: "deck", text: "聖上口述 · 臣潤稿" });
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [polishOpen, setPolishOpen] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [polishedText, setPolishedText] = useState<string | null>(null);
  const [originalDraftText, setOriginalDraftText] = useState<string | null>(null);
  const [polishError, setPolishError] = useState<string | null>(null);
  const [showCopied, setShowCopied] = useState(false);
  const [slotKey, setSlotKey] = useState("all");
  const [uploaderFilter, setUploaderFilter] = useState<string>("all");
  const [modalPhoto, setModalPhoto] = useState<TravelPhoto | null>(null);
  const [hoverPhoto, setHoverPhoto] = useState<TravelPhoto | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
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
  const embeddedPhotos = useMemo(() => extractEmbeddedPhotos(draft.text), [draft.text]);

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
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = draft.text.slice(0, start);
    const after = draft.text.slice(end);
    const insert = (before.endsWith("\n") || before === "" ? "" : "\n") + md + "\n";
    setDraft({ ...draft, text: before + insert + after });
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
      setDraft({ ...draft, text: draft.text + "\n" + md + "\n" });
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = draft.text.slice(0, start);
    const after = draft.text.slice(end);
    const insert = (before.endsWith("\n") || before === "" ? "" : "\n") + md + "\n";
    setDraft({ ...draft, text: before + insert + after });
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + insert.length;
    });
  };

  const copyForLLM = async () => {
    await navigator.clipboard.writeText(draft.text);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  // ── 潤稿: 呼叫 /api/polish-d1 ──────────────────────────────────────
  const [polishWarning, setPolishWarning] = useState<string | null>(null);

  const handlePolish = async () => {
    if (!draft.text.trim()) {
      setPolishError("textarea 是空的, 先打字才能潤稿");
      return;
    }
    setPolishing(true);
    setPolishError(null);
    setPolishWarning(null);
    setOriginalDraftText(draft.text); // 保留原稿以便退回
    try {
      // 抓前 30 張 D1 照片 EXIF 作為 context
      const exifContext = photos.slice(0, 30).map((p) => ({
        filename: p.filename,
        hour: p.hour,
        datetime_original: p.datetime_original,
        uploader_name: p.uploader_name ?? undefined,
        location_name: p.location_name ?? undefined,
      }));
      const res = await fetch("/api/polish-d1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalText: draft.text, exifContext }),
      });
      const data = await res.json();
      if (data.fallback) {
        // 配額爆或 API 5xx → fallback 用原文 + 警告
        setPolishWarning(data.warning ?? "已 fallback 用規則式 Vogue 殼渲染");
        setPolishedText(data.polishedText);
        // 🅒 8-5: fallback 也算完稿 (起碼原文 + Vogue 殼), 寫進 Supabase
        savePolishedToSupabase(createClient(), data.polishedText, updatedBy);
      } else if (!res.ok) {
        setPolishError(data.error || `API ${res.status}`);
        setPolishedText(null);
      } else {
        setPolishedText(data.polishedText);
        // 🅒 8-5: 潤稿成功 → 自動寫完稿到 Supabase (所有人都會看到)
        savePolishedToSupabase(createClient(), data.polishedText, updatedBy);
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      setPolishError(err?.message ?? "Unknown error");
      setPolishedText(null);
    } finally {
      setPolishing(false);
    }
  };

  const acceptPolished = () => {
    if (polishedText !== null) {
      setDraft({ ...draft, text: polishedText });
      setPolishedText(null);
      setOriginalDraftText(null);
      setPolishError(null);
      setPolishWarning(null);
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

  // ── Vogue 風全屏預覽 ─────────────────────────────────────────────────
  if (previewOpen) {
    const firstHeading =
      draft.text.split("\n").find((l) => l.trim().startsWith("# "))?.replace(/^#\s+/, "") ??
      "桃 園 啟 程";
    const englishTitle =
      draft.text
        .split("\n")
        .find((l) => l.trim().startsWith("# "))
        ?.replace(/^#\s+/, "")
        .replace(/[\u4e00-\u9fa5]/g, "")
        .trim() || "The Long Goodbye";

    return (
      <div className="vd-root">
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&display=swap"
          rel="stylesheet"
        />
        <button className="vd-close" onClick={() => setPreviewOpen(false)}>
          ✕ 關閉預覽
        </button>
        <header className="vd-masthead">
          <div className="vd-container" style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
            <div className="vd-logo">VOGUE</div>
            <div className="vd-meta">江南水鄉 · 八日 · 2026</div>
          </div>
        </header>
        <section className="vd-hero">
          <div className="vd-container">
            <div className="vd-kicker">Day One · Departure</div>
            <h1 className="vd-h1">
              {englishTitle || "The Long Goodbye"}
              <span className="vd-h1-cn">{firstHeading}</span>
            </h1>
            <p className="vd-deck">聖上的 D1 故事草稿即時預覽</p>
          </div>
        </section>
        <section className="vd-content">
          <div className="vd-container">
            <div
              className="vd-rendered"
              dangerouslySetInnerHTML={{ __html: renderVogueMarkdown(draft.text.trim() ? draft.text : D1_PLACEHOLDER) }}
            />
          </div>
        </section>
      </div>
    );
  }

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
              <span className="ed-saved"> · 已存 {new Date(draft.updatedAt).toLocaleTimeString()}</span>
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
          <button className="ed-btn-primary" onClick={() => setPreviewOpen(true)}>
            👁 Vogue 預覽
          </button>
        </div>
      </header>

      {showCopied && <div className="ed-toast">✓ 已複製到剪貼簿 — 貼給臣</div>}

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
                {mounted && new Date(modalPhoto.datetime_original).toLocaleString("zh-TW")}
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

          {/* � 8-5 聖上拍板: 已插入照片縮圖 strip — 寫字時眼睛看得到用了哪些 */}
          {embeddedPhotos.length > 0 && (
            <div className="ed-photo-strip">
              <div className="ed-photo-strip-label">
                📸 已插入 <strong>{embeddedPhotos.length}</strong> 張
              </div>
              <div className="ed-photo-strip-row">
                {embeddedPhotos.map((p) => (
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
                      onClick={() => setDraft({ ...draft, text: removeNthPhoto(draft.text, p.index) })}
                      title="從 draft 移除"
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

          <textarea
            ref={textareaRef}
            className="ed-textarea"
            value={draft.text}
            onChange={(e) => setDraft({ ...draft, text: e.target.value })}
            onDrop={handleTextareaDrop}
            onDragOver={(e) => e.preventDefault()}
            placeholder={D1_PLACEHOLDER}
          />
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
                    <button
                      onClick={rejectPolished}
                      style={{ flex: 1, background: "white", color: "#1e293b", border: "1px solid #d4d4d4", padding: "10px", borderRadius: 4, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      ✕ 退回原稿
                    </button>
                  </div>
                  <div className="pl-masthead">
                    <div className="pl-logo">VOGUE</div>
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

