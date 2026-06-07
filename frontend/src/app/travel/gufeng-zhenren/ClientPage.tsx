"use client";

/**
 * /travel/gufeng-zhenren — 古風寫真
 *
 * 4 個 section:
 *  1. 上傳照片 (drag & drop) + 從景點選底圖
 *  2. 選服飾 (30 chip, 女/男切換, 預設仕女)
 *  3. 按下「穿越」→ spinner → 完成
 *  4. 已生成 grid + 大圖 modal (按讚/留言/刪除)
 *
 * localStorage: 'gufeng-fingerprint' UUID
 * API: /api/time-travel/{generate,list,[id]/rate,[id]}
 * Realtime: user_attraction_photos table
 */

import React, { useState, useEffect, useRef, useCallback, forwardRef } from "react";
import { useSearchParams } from "next/navigation";
import html2canvas from "html2canvas";
import { ALL_ATTRACTIONS } from "../data";
import { createClient } from "@/utils/supabase/client";
import { toast } from "@/components/GlobalToastHost";
import ShareButtons from "@/components/ShareButtons";

// ── Costume 30 種 (15 女 + 15 男) ────────────────────────────────────────────
type Gender = "female" | "male";
interface Costume {
  key: string;
  name: string;
  emoji: string;
  gender: Gender;
  desc: string;
}

export const COSTUME_STYLES: Costume[] = [
  // 女 (15)
  { key: "song_shinu",       name: "宋代仕女",     emoji: "👘", gender: "female", desc: "典雅端莊, 經典宋代女子" },
  { key: "dajia_guixiu",     name: "大家閨秀",     emoji: "🏛️", gender: "female", desc: "名門望族千金" },
  { key: "jiangnan_xiunu",   name: "江南繡娘",     emoji: "🧵", gender: "female", desc: "繡藝精湛的繡娘" },
  { key: "chayi_shi",        name: "茶藝師",       emoji: "🍵", gender: "female", desc: "優雅泡茶的女子" },
  { key: "tanqin_shinu",     name: "彈琴仕女",     emoji: "🎼", gender: "female", desc: "撫琴雅致的女子" },
  { key: "shufa_shinu",      name: "書法仕女",     emoji: "🖌️", gender: "female", desc: "揮毫潑墨的女子" },
  { key: "gongting_guifei",  name: "宮廷貴妃",     emoji: "👑", gender: "female", desc: "雍容華貴的貴妃" },
  { key: "gongting_gongzhu", name: "宮廷公主",     emoji: "🌸", gender: "female", desc: "金枝玉葉的公主" },
  { key: "yahuan_binu",      name: "丫鬟婢女",     emoji: "🌺", gender: "female", desc: "機靈伶俐的婢女" },
  { key: "yujia_nv",         name: "漁家女",       emoji: "🐟", gender: "female", desc: "江南水鄉漁家女子" },
  { key: "huansha_nv",       name: "浣紗女",       emoji: "💧", gender: "female", desc: "西施浣紗經典場景" },
  { key: "cailian_nv",       name: "採蓮女",       emoji: "🪷", gender: "female", desc: "江南採蓮的女子" },
  { key: "xihu_chuanniang",  name: "西湖船娘",     emoji: "⛵", gender: "female", desc: "西湖搖船的女子" },
  { key: "longjing_cha_nv",  name: "龍井採茶女",   emoji: "🍃", gender: "female", desc: "龍井茶園採茶女子" },
  { key: "xiqu_huadan",      name: "戲曲花旦",     emoji: "🎭", gender: "female", desc: "京劇/崑曲花旦" },
  // 男 (15)
  { key: "song_shusheng",    name: "宋代書生",     emoji: "📚", gender: "male", desc: "風雅書生, 進京趕考" },
  { key: "jiangnan_wenren",  name: "江南文人",     emoji: "✒️", gender: "male", desc: "吟詩作對的文人" },
  { key: "jianke_xiashi",    name: "劍客俠士",     emoji: "🗡️", gender: "male", desc: "仗劍走天涯的俠客" },
  { key: "jiangjun_wujiang", name: "將軍武將",     emoji: "🛡️", gender: "male", desc: "沙場點兵的將軍" },
  { key: "huangdi",          name: "皇帝",         emoji: "👑", gender: "male", desc: "九五之尊" },
  { key: "taijian",          name: "太監",         emoji: "🪭", gender: "male", desc: "宮廷太監" },
  { key: "cha_nong",         name: "茶農",         emoji: "🍵", gender: "male", desc: "龍井茶園的茶農" },
  { key: "yufu",             name: "漁夫",         emoji: "🎣", gender: "male", desc: "江南水鄉漁夫" },
  { key: "chuanfu",          name: "船夫",         emoji: "⛵", gender: "male", desc: "搖櫓船的船夫" },
  { key: "yinshi",           name: "隱士",         emoji: "🏔️", gender: "male", desc: "歸隱山林的智者" },
  { key: "daoshi",           name: "道士",         emoji: "☯️", gender: "male", desc: "道家修行者" },
  { key: "heshang",          name: "和尚",         emoji: "🪷", gender: "male", desc: "佛門僧侶" },
  { key: "xiqu_xiaosheng",  name: "戲曲小生",     emoji: "🎭", gender: "male", desc: "京劇/崑曲小生" },
  { key: "shangren",         name: "商人",         emoji: "💰", gender: "male", desc: "富甲一方的商人" },
  { key: "zhuangyuan_zhu",   name: "莊園主",       emoji: "🏯", gender: "male", desc: "江南大莊園主" },
];

// ── Types ────────────────────────────────────────────────────────────────────
// 對齊 Supabase user_attraction_photos 實際欄位 (snake_case)
// costume_emoji 不在 DB — render 時從 COSTUME_STYLES 查
// user_my_vote 不在 DB (在 photo_votes join table) — 預設 0, 投票時更新
interface GufengPhoto {
  id: string;
  generated_photo_url: string | null;
  original_photo_url: string;
  source_attraction_name: string | null;
  costume_style_key: string;
  costume_style: string;
  costume_emoji?: string;
  like_count: number;
  dislike_count: number;
  comment_count: number;
  user_fingerprint: string;
  user_my_vote?: 1 | -1 | 0 | null;
  created_at: string;
  status: "pending" | "ready" | "failed";
}

// 從 costume_style_key 查 emoji + name (DB 沒存, 用 lookup table 補)
function getCostumeMeta(styleKey: string) {
  return (
    COSTUME_STYLES.find((c) => c.key === styleKey) ?? { emoji: "👘", name: "古風" }
  );
}

interface CommentItem {
  id: string;
  comment: string;
  user_fingerprint: string;
  created_at: string;
}

// ── Fingerprint helpers ──────────────────────────────────────────────────────
const FP_KEY = "gufeng-fingerprint";
function getOrCreateFingerprint(): string {
  if (typeof window === "undefined") return "";
  let fp = localStorage.getItem(FP_KEY);
  if (!fp) {
    fp = (typeof crypto !== "undefined" && "randomUUID" in crypto)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(FP_KEY, fp);
  }
  return fp;
}

function uuid(): string {
  return (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function GufengZhenrenClientPage() {
  // Section 1: 上傳 / 底圖
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(null);
  const [pickedAttraction, setPickedAttraction] = useState<{ id: string; name: string; cover: string; category: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Section 2: 服飾
  const [gender, setGender] = useState<Gender>("female");
  const [costumeKey, setCostumeKey] = useState<string>(COSTUME_STYLES[0].key);

  // Section 3: 生成中
  const [generating, setGenerating] = useState(false);
  const [generatingMsg, setGeneratingMsg] = useState("");

  // Section 4: 已生成
  const [photos, setPhotos] = useState<GufengPhoto[]>([]);
  const [openPhoto, setOpenPhoto] = useState<GufengPhoto | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  // 通用
  const [fingerprint, setFingerprint] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const realtimeRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [downloadingJpg, setDownloadingJpg] = useState(false);

  // 下載 JPG (html2canvas 抓 shareCardRef)
  const handleDownloadJpg = useCallback(async () => {
    if (!shareCardRef.current || !openPhoto?.generated_photo_url || downloadingJpg) return;
    setDownloadingJpg(true);
    try {
      toast.info("🎎 正在生成 JPG...");
      // 等圖片完全載入 (避免抓到空白)
      const img = shareCardRef.current.querySelector("img");
      if (img && !img.complete) {
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("圖片載入失敗"));
        });
      }
      const canvas = await html2canvas(shareCardRef.current, {
        scale: 2,
        backgroundColor: "#fafaf9",
        useCORS: true,
        width: 1080,
        height: 1440,
        logging: false,
      });
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      const a = document.createElement("a");
      a.download = `gufeng-${openPhoto.costume_style_key}-${openPhoto.id.slice(0, 8)}.jpg`;
      a.href = dataUrl;
      a.click();
      toast.success("✅ JPG 已下載! 可分享到 LINE/IG/FB");
    } catch (e: any) {
      console.error("[gufeng] download jpg failed:", e);
      toast.error("下載失敗: " + (e?.message ?? "未知錯誤"));
    } finally {
      setDownloadingJpg(false);
    }
  }, [openPhoto, downloadingJpg]);

  const handleCopyShareLink = useCallback(async () => {
    if (!openPhoto) return;
    const url = `${window.location.origin}/travel/gufeng-zhenren?photo=${openPhoto.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("🔗 連結已複製!");
    } catch {
      toast.error("複製失敗, 請手動複製: " + url);
    }
  }, [openPhoto]);

  // 啟動: 取 fingerprint + 載入列表
  useEffect(() => {
    const fp = getOrCreateFingerprint();
    setFingerprint(fp);
    void loadList();
    setLoading(false);
  }, []);

  // 處理 ?photo=ID deep link: 載入完列表後, 自動開 modal 顯示那張
  const searchParams = useSearchParams();
  useEffect(() => {
    if (loading) return;
    const photoId = searchParams.get("photo");
    if (!photoId || photos.length === 0) return;
    const target = photos.find((p) => p.id === photoId);
    if (target && (!openPhoto || openPhoto.id !== photoId)) {
      setOpenPhoto(target);
      void openPhotoModal(target);
    }
  }, [loading, searchParams, photos, openPhoto]);

  // Realtime 訂閱 user_attraction_photos
  useEffect(() => {
    if (!fingerprint) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`gufeng-photos-${fingerprint}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_attraction_photos" },
        (payload) => {
          const row = (payload.new ?? payload.old) as Partial<GufengPhoto> | undefined;
          if (!row) return;
          if (payload.eventType === "INSERT") {
            setPhotos((prev) => {
              if (prev.some((p) => p.id === row.id)) return prev;
              return [row as GufengPhoto, ...prev];
            });
          } else if (payload.eventType === "UPDATE") {
            // row 是 DB row (snake_case, 對齊新 GufengPhoto); 用 row spread 完全覆蓋 p
            // 但保留 p.user_my_vote (DB 沒這欄位, 在 photo_votes join table)
            setPhotos((prev) => prev.map((p) => (p.id === row.id ? ({ ...row, user_my_vote: p.user_my_vote } as GufengPhoto) : p)));
            setOpenPhoto((cur) => (cur && cur.id === row.id ? ({ ...row, user_my_vote: cur.user_my_vote } as GufengPhoto) : cur));
          } else if (payload.eventType === "DELETE") {
            setPhotos((prev) => prev.filter((p) => p.id !== (payload.old as GufengPhoto).id));
            setOpenPhoto((cur) => (cur && cur.id === (payload.old as GufengPhoto).id ? null : cur));
          }
        }
      )
      .subscribe();
    realtimeRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fingerprint]);

  // 載入照片列表
  const loadList = useCallback(async () => {
    try {
      const res = await fetch("/api/time-travel/list?status=ready&limit=120");
      if (!res.ok) return;
      const json = (await res.json()) as { photos?: GufengPhoto[] };
      setPhotos(json.photos || []);
    } catch (e) {
      console.warn("[gufeng] load list failed:", e);
    }
  }, []);

  // ── File upload ────────────────────────────────────────────────────────────
  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("請上傳圖片檔 (jpg/png/webp)");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("檔案太大 (>8MB), 請壓縮後再上傳");
      return;
    }
    // 2026-06-07: 壓縮到 max 800px wide, jpeg 0.7 quality
    //   - 之前不壓縮, 手機照片 404KB dataURL → MiniMax 跑 28-30s → 撞 30s cap → 504
    //   - 壓縮後 dataURL 預期 50-100KB → MiniMax 跑 10-15s → 大 buffer
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 800;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          toast.error("瀏覽器不支援 canvas, 請改用其他瀏覽器");
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);
        const origKB = Math.round(file.size / 1024);
        const newKB = Math.round(compressedDataUrl.length / 1024);
        console.log(`[gufeng] upload compressed: ${origKB}KB → ${newKB}KB (dataURL, ${canvas.width}x${canvas.height})`);
        setUploadedDataUrl(compressedDataUrl);
        setPickedAttraction(null); // 改成自己上傳 → 取消景點底圖
        toast.success(`照片上傳成功 (${origKB}KB → ${newKB}KB)`);
      };
      img.onerror = () => toast.error("圖片解碼失敗");
      img.src = reader.result as string;
    };
    reader.onerror = () => toast.error("讀取檔案失敗");
    reader.readAsDataURL(file);
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  // ── Section 3: 穿越 ────────────────────────────────────────────────────────
  async function handleGenerate() {
    if (generating) return;
    // 2026-06-07: 修 1.0s fail row (西湖船娘 + 河坊街) 顯示 original_photo_url=空字串還送 POST
    // 之前只驗 uploadedDataUrl || pickedAttraction, 但 pickedAttraction.cover="" 會被當 truthy
    if (!uploadedDataUrl && !pickedAttraction?.cover) {
      toast.error("請先上傳照片 或 選一個景點底圖");
      return;
    }
    const costume = COSTUME_STYLES.find((c) => c.key === costumeKey);
    if (!costume) return;

    setGenerating(true);
    setGeneratingMsg("排隊中 · 等待 worker...");

    try {
      const fp = getOrCreateFingerprint();
      // 4 個必填欄位對應 API (api/time-travel/generate/route.ts):
      //   userFingerprint / originalPhotoUrl / costumeStyle / costumeStyleKey
      // (原 ClientPage 拼成 fingerprint / costumeKey / uploadedDataUrl / pickedAttraction → 400)
      const originalPhotoUrl = uploadedDataUrl || pickedAttraction?.cover || "";
      const res = await fetch("/api/time-travel/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userFingerprint: fp,
          originalPhotoUrl,
          costumeStyle: costume.name,        // 中文名 (給 prompt 用)
          costumeStyleKey: costume.key,      // 英文 key
          sourceAttractionId: pickedAttraction?.id ?? null,
          sourceAttractionName: pickedAttraction?.name ?? null,
          sourceAttractionCategory: pickedAttraction?.category ?? null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "生成失敗");

      setGeneratingMsg("🖌️ MiniMax 繪畫中... (約 5-15 秒)");
      toast.info("穿越請求已送出, 完成時自動通知");

      // 樂觀插入: 從 list reload, 但若 list 還沒 ready, 顯示 generating hint
      // Realtime 收到 ready 狀態會自動更新 grid
      await loadList();
    } catch (e: any) {
      console.error("[gufeng] generate failed:", e?.message, "full:", e);
      toast.error(e?.message || "穿越失敗, 請重試");
    } finally {
      // 2026-06-07: 修 8s 太早 reset (4 ready 都 27-29.6s 才完成, USER 8s 後重按會撞 cold start)
      // 改 30s 對齊 Netlify function maxDuration, server 跑完才能再按
      setTimeout(() => {
        setGenerating(false);
        setGeneratingMsg("");
        void loadList();
      }, 30000);
    }
  }

  // ── Modal: 載入 comments + 評價 ────────────────────────────────────────────
  async function openPhotoModal(photo: GufengPhoto) {
    setOpenPhoto(photo);
    setNewComment("");
    setComments([]);
    try {
      const res = await fetch(`/api/time-travel/${photo.id}/comments`);
      if (res.ok) {
        const json = (await res.json()) as { comments?: CommentItem[] };
        setComments(json.comments || []);
      }
    } catch (e) {
      console.warn("[gufeng] load comments failed:", e);
    }
  }

  async function handleVote(value: 1 | -1) {
    if (!openPhoto) return;
    try {
      const res = await fetch(`/api/time-travel/${openPhoto.id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint: getOrCreateFingerprint(), value }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "投票失敗");
      }
      // 本地樂觀更新
      setOpenPhoto((cur) => {
        if (!cur) return cur;
        const prevVote = cur.user_my_vote ?? 0;
        const newVote = prevVote === value ? 0 : value;
        let likeDelta = 0;
        let dislikeDelta = 0;
        if (prevVote === 1) likeDelta -= 1;
        if (prevVote === -1) dislikeDelta -= 1;
        if (newVote === 1) likeDelta += 1;
        if (newVote === -1) dislikeDelta += 1;
        return {
          ...cur,
          like_count: cur.like_count + likeDelta,
          dislike_count: cur.dislike_count + dislikeDelta,
          user_my_vote: newVote as 1 | -1 | 0,
        };
      });
      // 同步更新 grid
      setPhotos((prev) => prev.map((p) => (p.id === openPhoto.id ? {
        ...p,
        like_count: p.like_count + (openPhoto.user_my_vote === 1 ? -1 : 0) + (value === 1 && openPhoto.user_my_vote !== 1 ? 1 : 0) + (openPhoto.user_my_vote === -1 && value === 1 ? 1 : 0),
        dislike_count: p.dislike_count + (openPhoto.user_my_vote === -1 ? -1 : 0) + (value === -1 && openPhoto.user_my_vote !== -1 ? 1 : 0) + (openPhoto.user_my_vote === 1 && value === -1 ? 1 : 0),
      } : p)));
    } catch (e: any) {
      toast.error(e?.message || "投票失敗");
    }
  }

  async function handlePostComment() {
    if (!openPhoto || !newComment.trim() || postingComment) return;
    const text = newComment.trim().slice(0, 280);
    setPostingComment(true);
    try {
      const res = await fetch(`/api/time-travel/${openPhoto.id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint: getOrCreateFingerprint(), value: 0, comment: text }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "留言失敗");
      }
      // 樂觀插入
      const newItem: CommentItem = {
        id: uuid(),
        comment: text,
        user_fingerprint: getOrCreateFingerprint(),
        created_at: new Date().toISOString(),
      };
      setComments((prev) => [...prev, newItem]);
      setNewComment("");
      setOpenPhoto((cur) => cur ? ({ ...cur, comment_count: cur.comment_count + 1 }) : cur);
      setPhotos((prev) => prev.map((p) => p.id === openPhoto.id ? ({ ...p, comment_count: p.comment_count + 1 }) : p));
      toast.success("留言成功");
    } catch (e: any) {
      toast.error(e?.message || "留言失敗");
    } finally {
      setPostingComment(false);
    }
  }

  async function handleDelete() {
    if (!openPhoto) return;
    if (!confirm("確定要刪除這張古風寫真?")) return;
    try {
      const res = await fetch(`/api/time-travel/${openPhoto.id}`, {
        method: "DELETE",
        headers: { "x-user-fingerprint": getOrCreateFingerprint() },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "刪除失敗");
      }
      toast.success("已刪除");
      setOpenPhoto(null);
      void loadList();
    } catch (e: any) {
      toast.error(e?.message || "刪除失敗");
    }
  }

  // ── UI ─────────────────────────────────────────────────────────────────────
  const filteredCostumes = COSTUME_STYLES.filter((c) => c.gender === gender);
  const selectedCostume = COSTUME_STYLES.find((c) => c.key === costumeKey);

  return (
    <main className="relative min-h-screen text-gray-800"
          style={{ background: "linear-gradient(180deg,#fdf6e3 0%,#f5e6c8 50%,#e8d5a8 100%)" }}>
      <div className="absolute top-4 right-4 z-10">
        <ShareButtons
          title="古風寫真"
          text="2026 江南水鄉八日 🎎 古風寫真 · 30 種宋代服飾任你穿越"
          variant="icon"
        />
      </div>

      {/* ── Header ── */}
      <header className="px-4 sm:px-8 pt-10 pb-6 max-w-6xl mx-auto text-center">
        <h1 className="text-3xl sm:text-5xl font-black tracking-wider"
            style={{
              background: "linear-gradient(90deg,#8b0000 0%,#c8102e 50%,#8b0000 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "0 2px 4px rgba(139,0,0,0.15)",
              fontFamily: "'Noto Serif TC','PingFang TC','Microsoft JhengHei',serif",
            }}>
          🎎 古風寫真
        </h1>
        <p className="mt-3 text-sm sm:text-base text-amber-900/80 font-medium">
          30 種宋代 / 江南水鄉服飾任你選 · 一鍵穿越古今
        </p>
        <div className="mt-2 flex justify-center gap-1.5 text-2xl">
          <span>👘</span><span>🏯</span><span>🌸</span><span>⛵</span><span>🍵</span><span>🪷</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 pb-24 space-y-10">
        {/* ══════ Section 1: 上傳 / 底圖 ══════ */}
        <section className="bg-white/80 backdrop-blur rounded-2xl shadow-lg border-2 border-amber-200 p-5 sm:p-7">
          <h2 className="text-xl sm:text-2xl font-black text-amber-900 mb-1 flex items-center gap-2">
            <span className="inline-flex w-8 h-8 rounded-full bg-red-700 text-white items-center justify-center font-black">壹</span>
            上傳照片 · 選底圖
          </h2>
          <p className="text-xs sm:text-sm text-amber-800/80 mb-4">兩種方式任選一種: 自己上傳照片 或 從景點選底圖</p>

          <div className="grid md:grid-cols-2 gap-5">
            {/* Drag & drop */}
            <div>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all p-5 text-center min-h-[180px] flex flex-col items-center justify-center
                  ${dragging ? "border-red-500 bg-red-50" : "border-amber-400 bg-amber-50/50 hover:bg-amber-50"}`}
              >
                <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileInputChange} className="hidden" />
                {uploadedDataUrl ? (
                  <>
                    <img src={uploadedDataUrl} alt="uploaded" className="max-h-40 mx-auto rounded-lg shadow" />
                    <p className="mt-2 text-xs text-amber-700">✓ 已上傳 · 點擊更換</p>
                  </>
                ) : (
                  <>
                    <div className="text-4xl mb-2">📤</div>
                    <p className="font-bold text-amber-900">拖曳照片到此 或 點擊上傳</p>
                    <p className="text-xs text-amber-700/70 mt-1">支援 jpg / png / webp · 最大 8MB</p>
                  </>
                )}
              </div>
            </div>

            {/* 景點底圖 */}
            <div>
              <p className="text-xs font-bold text-amber-900 mb-2">🏯 或從景點選底圖 ({ALL_ATTRACTIONS.length} 個)</p>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-56 overflow-y-auto pr-1">
                {ALL_ATTRACTIONS.map((a) => {
                  const cover = a.images?.[0];
                  if (!cover) return null;
                  const isPicked = pickedAttraction?.name === a.name;
                  return (
                    <button
                      key={a.name}
                      type="button"
                      onClick={() => {
                        setPickedAttraction({ id: a.name, name: a.name, cover, category: a.category });
                        setUploadedDataUrl(null);
                      }}
                      className={`relative aspect-square rounded-md overflow-hidden border-2 transition-all
                        ${isPicked ? "border-red-600 ring-2 ring-red-400 scale-95" : "border-amber-200 hover:border-amber-500"}`}
                      title={a.name}
                    >
                      <img src={cover} alt={a.name} className="w-full h-full object-cover" />
                      {isPicked && <div className="absolute inset-0 bg-red-600/30 flex items-center justify-center text-white text-xl">✓</div>}
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] px-1 py-0.5 truncate">{a.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {(uploadedDataUrl || pickedAttraction) && (
            <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-amber-100/70 border border-amber-300">
              <span className="text-amber-900 font-bold text-sm">✓ 已選:</span>
              {uploadedDataUrl && <span className="text-sm text-amber-800">📷 用戶照片</span>}
              {pickedAttraction && <span className="text-sm text-amber-800">🏯 {pickedAttraction.name}</span>}
            </div>
          )}
        </section>

        {/* ══════ Section 2: 選服飾 ══════ */}
        <section className="bg-white/80 backdrop-blur rounded-2xl shadow-lg border-2 border-amber-200 p-5 sm:p-7">
          <h2 className="text-xl sm:text-2xl font-black text-amber-900 mb-1 flex items-center gap-2">
            <span className="inline-flex w-8 h-8 rounded-full bg-red-700 text-white items-center justify-center font-black">貳</span>
            選服飾
          </h2>
          <p className="text-xs sm:text-sm text-amber-800/80 mb-4">15 種女裝 + 15 種男裝, 預設仕女</p>

          {/* 性別切換 */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => { setGender("female"); setCostumeKey(COSTUME_STYLES.filter(c => c.gender === "female")[0].key); }}
              className={`px-4 py-2 rounded-full font-bold text-sm transition-all ${gender === "female" ? "bg-pink-600 text-white shadow" : "bg-pink-100 text-pink-700 hover:bg-pink-200"}`}
            >
              👩 女 (15)
            </button>
            <button
              type="button"
              onClick={() => { setGender("male"); setCostumeKey(COSTUME_STYLES.filter(c => c.gender === "male")[0].key); }}
              className={`px-4 py-2 rounded-full font-bold text-sm transition-all ${gender === "male" ? "bg-blue-600 text-white shadow" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}
            >
              👨 男 (15)
            </button>
          </div>

          {/* 15 chip grid */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {filteredCostumes.map((c) => {
              const active = costumeKey === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCostumeKey(c.key)}
                  className={`p-2.5 rounded-lg border-2 transition-all text-left
                    ${active
                      ? "border-yellow-500 bg-gradient-to-br from-yellow-50 to-amber-100 shadow-md ring-2 ring-yellow-400"
                      : "border-amber-200 bg-white hover:border-amber-400 hover:bg-amber-50"}`}
                >
                  <div className="text-2xl mb-0.5">{c.emoji}</div>
                  <div className="text-xs font-bold text-amber-900 truncate">{c.name}</div>
                  <div className="text-[10px] text-amber-700/70 line-clamp-1">{c.desc}</div>
                </button>
              );
            })}
          </div>

          {selectedCostume && (
            <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-yellow-100 to-amber-100 border border-yellow-400 flex items-center gap-3">
              <span className="text-3xl">{selectedCostume.emoji}</span>
              <div>
                <div className="font-black text-amber-900">已選: {selectedCostume.name}</div>
                <div className="text-xs text-amber-800">{selectedCostume.desc}</div>
              </div>
            </div>
          )}
        </section>

        {/* ══════ Section 3: 穿越按鈕 ══════ */}
        <section className="text-center">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || (!uploadedDataUrl && !pickedAttraction)}
            className="relative inline-flex items-center justify-center px-10 py-5 rounded-2xl font-black text-xl sm:text-2xl tracking-widest text-white shadow-2xl transition-all
              disabled:opacity-50 disabled:cursor-not-allowed
              enabled:hover:scale-105 enabled:active:scale-95"
            style={{
              background: generating
                ? "linear-gradient(135deg,#92400e 0%,#b45309 100%)"
                : "linear-gradient(135deg,#dc2626 0%,#b91c1c 50%,#991b1b 100%)",
              boxShadow: generating ? "0 0 0 0 rgba(220,38,38,0)" : "0 8px 24px rgba(220,38,38,0.4), 0 0 0 4px rgba(255,215,0,0.3)",
              fontFamily: "'Noto Serif TC','PingFang TC',serif",
            }}
          >
            {generating ? (
              <span className="flex items-center gap-3">
                <span className="inline-block w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                {generatingMsg || "生成中..."}
              </span>
            ) : (
              <>⚔️ 穿 越 · 一 鍵 生 成</>
            )}
          </button>
          <p className="mt-3 text-xs text-amber-800/70">⚠️ 每次穿越耗時 5-15 秒, 請勿重複點擊</p>
        </section>

        {/* ══════ Section 4: 已生成 grid ══════ */}
        <section className="bg-white/80 backdrop-blur rounded-2xl shadow-lg border-2 border-amber-200 p-5 sm:p-7">
          <h2 className="text-xl sm:text-2xl font-black text-amber-900 mb-1 flex items-center gap-2">
            <span className="inline-flex w-8 h-8 rounded-full bg-red-700 text-white items-center justify-center font-black">參</span>
            已生成 · 大家都在穿越
            <span className="ml-auto text-sm font-bold text-amber-700">({photos.length})</span>
          </h2>
          <p className="text-xs sm:text-sm text-amber-800/80 mb-4">點開看大圖 · 按讚 / 留言 / 刪除</p>

          {loading ? (
            <div className="text-center py-12 text-amber-700">
              <span className="inline-block w-6 h-6 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mr-2" />
              載入中...
            </div>
          ) : photos.length === 0 ? (
            <div className="text-center py-12 text-amber-700/70">
              <div className="text-5xl mb-2">🎴</div>
              <p className="font-bold">還沒有人穿越過, 來當第一個吧!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {photos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => openPhotoModal(p)}
                  className="group text-left bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl overflow-hidden border-2 border-amber-200 hover:border-red-500 hover:shadow-xl transition-all"
                >
                  <div className="relative aspect-[3/4] bg-amber-100">
                    {p.status === "ready" && p.generated_photo_url ? (
                      <img src={p.generated_photo_url} alt={`${p.source_attraction_name ?? "自拍照"} - ${getCostumeMeta(p.costume_style_key).name}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : p.status === "ready" && p.original_photo_url ? (
                      <img src={p.original_photo_url} alt="原圖 (生成中)" className="w-full h-full object-cover opacity-60" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-amber-700 text-xs">生成中...</div>
                    )}
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded">{getCostumeMeta(p.costume_style_key).emoji} {p.costume_style}</div>
                  </div>
                  <div className="p-2">
                    <div className="text-xs font-bold text-amber-900 truncate">🏯 {p.source_attraction_name ?? "自拍照"}</div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-amber-700">
                      <span>👍 {p.like_count}</span>
                      <span>👎 {p.dislike_count}</span>
                      <span>💬 {p.comment_count}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ══════ Modal ══════ */}
      {openPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 overflow-y-auto"
             onClick={() => setOpenPhoto(null)}>
          <div className="relative bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl max-w-3xl w-full max-h-[95vh] overflow-y-auto shadow-2xl border-4 border-yellow-500"
               onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className="sticky top-0 z-10 bg-gradient-to-r from-red-700 to-red-900 text-white p-4 flex items-center justify-between gap-3 rounded-t-xl">
              <div>
                <div className="text-xs opacity-80">古風寫真</div>
                <div className="font-black text-lg flex items-center gap-2">
                  {getCostumeMeta(openPhoto.costume_style_key).emoji} {openPhoto.costume_style} · ＠ {openPhoto.source_attraction_name ?? "自拍照"}
                </div>
              </div>
              <button onClick={() => setOpenPhoto(null)} className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white text-xl font-bold">×</button>
            </div>

            <div className="p-4 sm:p-5">
              {/* 大圖 */}
              <div className="rounded-xl overflow-hidden border-2 border-amber-300 bg-amber-100">
                {openPhoto.status === "ready" && openPhoto.generated_photo_url ? (
                  <img src={openPhoto.generated_photo_url} alt={getCostumeMeta(openPhoto.costume_style_key).name} className="w-full max-h-[55vh] object-contain mx-auto" />
                ) : openPhoto.status === "ready" && openPhoto.original_photo_url ? (
                  <img src={openPhoto.original_photo_url} alt="原圖 (生成中)" className="w-full max-h-[55vh] object-contain mx-auto opacity-60" />
                ) : (
                  <div className="aspect-square flex items-center justify-center text-amber-700">生成中...</div>
                )}
              </div>

              {/* 分享列: 大圖下方, 評價列上方 (中國風華麗設計) */}
              {openPhoto.generated_photo_url && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg border-2 border-amber-400 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🎎</span>
                    <span className="text-xs font-black text-amber-900">分享這張古風寫真</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleDownloadJpg()}
                      disabled={downloadingJpg}
                      className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 disabled:opacity-50 text-white text-sm font-black rounded-full transition-colors flex items-center gap-1.5 shadow-md"
                    >
                      📥 {downloadingJpg ? "生成中..." : "下載 JPG"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCopyShareLink()}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-bold rounded-full transition-colors flex items-center gap-1.5"
                    >
                      🔗 複製連結
                    </button>
                  </div>
                </div>
              )}

              {/* 隱藏的 share card (html2canvas 抓這個), 中國風 1080x1440 視覺 */}
              {openPhoto?.generated_photo_url && (
                <div
                  aria-hidden="true"
                  style={{
                    position: "fixed",
                    top: "-99999px",
                    left: "-99999px",
                    pointerEvents: "none",
                    zIndex: -1,
                  }}
                >
                  <GufengShareCard ref={shareCardRef} photo={openPhoto} />
                </div>
              )}

              {/* 評價列 */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleVote(1)}
                  className={`px-4 py-2 rounded-full font-bold text-sm transition-all ${openPhoto.user_my_vote === 1 ? "bg-green-600 text-white" : "bg-green-100 text-green-700 hover:bg-green-200"}`}
                >
                  👍 按讚 {openPhoto.like_count}
                </button>
                <button
                  type="button"
                  onClick={() => handleVote(-1)}
                  className={`px-4 py-2 rounded-full font-bold text-sm transition-all ${openPhoto.user_my_vote === -1 ? "bg-red-600 text-white" : "bg-red-100 text-red-700 hover:bg-red-200"}`}
                >
                  👎 拍謝 {openPhoto.dislike_count}
                </button>
                <span className="text-sm text-amber-700 ml-2">💬 {openPhoto.comment_count} 留言</span>
                {openPhoto.user_fingerprint === fingerprint && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="ml-auto px-3 py-2 rounded-full text-xs bg-gray-700 text-white hover:bg-gray-900"
                  >
                    🗑️ 刪除
                  </button>
                )}
              </div>

              {/* 留言區 */}
              <div className="mt-4">
                <h3 className="font-black text-amber-900 text-sm mb-2">💬 留言 ({comments.length})</h3>
                <div className="space-y-2 mb-3 max-h-60 overflow-y-auto">
                  {comments.length === 0 ? (
                    <p className="text-xs text-amber-700/70 text-center py-4">還沒有留言 · 來搶沙發</p>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} className="bg-white/80 rounded-lg p-2.5 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-amber-900">{c.user_fingerprint === fingerprint ? "我" : `訪客·${c.user_fingerprint.slice(0, 6)}`}</span>
                          <span className="text-amber-700/60 text-[10px]">{new Date(c.created_at).toLocaleString("zh-TW")}</span>
                        </div>
                        <div className="text-amber-900">{c.comment}</div>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handlePostComment(); } }}
                    placeholder="寫個留言..."
                    maxLength={280}
                    className="flex-1 px-3 py-2 rounded-lg border border-amber-300 bg-white text-sm focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="button"
                    onClick={handlePostComment}
                    disabled={!newComment.trim() || postingComment}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold text-sm disabled:opacity-50 hover:bg-red-700"
                  >
                    {postingComment ? "送出中..." : "送出"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ── GufengShareCard: 極簡 1080x1440 分享卡 (照片為主, 角落浮水印) ────────────
// USER 規格: 照片不變形 + 只要服飾說明在角落 + 不佔多餘空白
// 用 objectFit: contain 完整顯示照片 (不切邊), 角落小字浮水印
const GufengShareCard = forwardRef<HTMLDivElement, { photo: GufengPhoto }>(
  function GufengShareCard({ photo }, ref) {
    const meta = getCostumeMeta(photo.costume_style_key);
    return (
      <div
        ref={ref}
        style={{
          width: 1080,
          height: 1440,
          background: "#000000",  // 黑底 (避免 contain 留白處太突兀)
          fontFamily: "'Noto Serif TC', 'Songti TC', 'STSong', serif",
          position: "relative",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {/* 照片: 完整顯示, 不變形 */}
        <img
          src={photo.generated_photo_url!}
          crossOrigin="anonymous"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",  // 完整顯示, 不切邊不變形
            display: "block",
          }}
        />
        {/* 角落浮水印: 服飾說明 (右下角, 紅字白邊) */}
        <div
          style={{
            position: "absolute",
            bottom: 36,
            right: 36,
            color: "#dc2626",
            fontSize: 40,
            fontWeight: 900,
            letterSpacing: 2,
            textShadow: "2px 2px 0 #ffffff, -2px -2px 0 #ffffff, 2px -2px 0 #ffffff, -2px 2px 0 #ffffff",
            lineHeight: 1.2,
          }}
        >
          {meta.emoji} {photo.costume_style}
        </div>
      </div>
    );
  }
);
