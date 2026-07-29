// 2026-07-30 聖上拍板: 主 UI — 雙欄 + 拖曳分類 + 拉框多選
// 結構:
//   左 sidebar (300px 寬): Album 列表, 每列可接收 drop (拖入分類), 顯示 photo count
//   右 canvas (彈性寬): VirtualGrid 渲染當前 album 的 photos, 支援 marquee select + drag

"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "@/components/GlobalToastHost";
import {
  type Album,
  type Photo,
  type DragPayload,
  DEFAULT_UPLOADER,
  INBOX_ALBUM_ID,
} from "./types";
import { generateDemoPhotos, DEFAULT_ALBUMS, UPLOADERS } from "./demo-data";
import { VirtualGrid } from "./components/VirtualGrid";
import { generateEmbedCode } from "./utils/generateEmbedCode";

// 🆕 拖曳用自訂 MIME (避開 7-29 聖上實證 <button> source + text/plain 空字串 bug)
const DRAG_MIME = "application/x-photo-classifier";

// ── 1 張 photo 卡 ──────────────────────────────────────────────────────────
interface PhotoCardProps {
  photo: Photo;
  selected: boolean;
  active: boolean; // 滑鼠 down 開始 marquee 但未放開
  onClick: (e: React.MouseEvent, id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
}

function PhotoCard({ photo, selected, active, onClick, onDragStart, onDragEnd }: PhotoCardProps) {
  const isHighlight = selected || active;
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, photo.id)}
      onDragEnd={onDragEnd}
      onClick={(e) => onClick(e, photo.id)}
      className={`
        relative aspect-square rounded-lg overflow-hidden cursor-pointer
        border-4 transition-all
        ${isHighlight ? "border-amber-500 ring-2 ring-amber-300" : "border-transparent"}
        hover:border-stone-300
      `}
      style={{ userSelect: "none" }}
      title={`#${photo.id} · ${photo.uploader}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.src}
        alt={photo.id}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        draggable={false}
      />
      {/* 多選標記 */}
      {selected && (
        <div className="absolute top-1 left-1 w-6 h-6 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow">
          ✓
        </div>
      )}
      {/* uploader tag */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1 text-[10px] text-white truncate">
        {photo.uploader}
      </div>
    </div>
  );
}

// ── Sidebar Album 列 (同時是 drop target) ─────────────────────────────────
interface AlbumRowProps {
  album: Album;
  isActive: boolean;
  photoCount: number;
  isDragOver: boolean;
  onSelect: () => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onRename: () => void;
  onDelete: () => void;
}

function AlbumRow({
  album, isActive, photoCount, isDragOver,
  onSelect, onDragEnter, onDragOver, onDragLeave, onDrop,
  onRename, onDelete,
}: AlbumRowProps) {
  return (
    <div
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onSelect}
      className={`
        group flex items-center justify-between gap-2 px-3 py-2 rounded-lg cursor-pointer
        transition-all
        ${isActive
          ? "bg-amber-100 border-2 border-amber-500"
          : "bg-white border-2 border-stone-200 hover:border-amber-300"}
        ${isDragOver ? "ring-4 ring-amber-300 scale-105 shadow-lg" : ""}
      `}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-lg shrink-0">{album.emoji ?? "📁"}</span>
        <span className="font-medium text-stone-900 truncate">{album.name}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-stone-500 font-bold">{photoCount}</span>
        {album.id !== INBOX_ALBUM_ID && (
          <div className="hidden group-hover:flex gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onRename(); }}
              className="text-xs px-1.5 py-0.5 rounded bg-stone-200 hover:bg-stone-300"
              title="重新命名"
            >
              ✏️
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-xs px-1.5 py-0.5 rounded bg-red-100 hover:bg-red-200 text-red-700"
              title="刪除 album (內的 photos 退回 inbox)"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ClientPage ────────────────────────────────────────────────────────
export default function PhotoClassifierClient() {
  // ── 狀態: photos, albums, 當前 album, 多選 selection ──
  const [photos, setPhotos] = useState<Photo[]>(() => generateDemoPhotos(3000));
  const [albums, setAlbums] = useState<Album[]>(DEFAULT_ALBUMS);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>(INBOX_ALBUM_ID);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());

  // ── 拖曳中 (drag) state ──
  const [draggingPhotoIds, setDraggingPhotoIds] = useState<string[]>([]);
  const [hoveredAlbumId, setHoveredAlbumId] = useState<string | null>(null);

  // ── Marquee 拉框 state ──
  // 我們不用 state (re-render 慢), 用 ref 直接操作 DOM classList + 收尾時 commit 到 state
  const marqueeStartRef = useRef<{ x: number; y: number } | null>(null);
  const marqueeRef = useRef<HTMLDivElement | null>(null);
  const [marqueeBox, setMarqueeBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // ── 新增 album ──
  const [creatingAlbum, setCreatingAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [newAlbumEmoji, setNewAlbumEmoji] = useState("📁");

  // 當前 album 的 photos (依 order 排序, 給 VirtualGrid)
  const currentAlbumPhotos = useMemo(() => {
    return photos
      .filter((p) => p.albumId === selectedAlbumId)
      .sort((a, b) => a.order - b.order);
  }, [photos, selectedAlbumId]);

  // 每 album 計數 (供 sidebar + 快速看)
  const albumCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of photos) counts[p.albumId] = (counts[p.albumId] ?? 0) + 1;
    return counts;
  }, [photos]);

  // ── 拖曳 source handler (PhotoCard 上 dragstart) ──
  const handleDragStart = useCallback((e: React.DragEvent, photoId: string) => {
    // 計算要拖的 photoIds: 單張拖 = 該張; 但如果已在多選狀態 = 整個 selection
    let dragIds: string[];
    if (selectedPhotoIds.has(photoId) && selectedPhotoIds.size > 1) {
      dragIds = Array.from(selectedPhotoIds);
    } else {
      dragIds = [photoId];
      // 也設成 selection (雙行為一)
      setSelectedPhotoIds(new Set([photoId]));
    }
    setDraggingPhotoIds(dragIds);

    try {
      e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ photoIds: dragIds }));
      // 雙寫 text/plain fallback (7-29 聖上實證)
      e.dataTransfer.setData("text/plain", dragIds.join(","));
    } catch {
      // ignore
    }
    e.dataTransfer.effectAllowed = "move";
  }, [selectedPhotoIds]);

  const handleDragEnd = useCallback(() => {
    setDraggingPhotoIds([]);
    setHoveredAlbumId(null);
  }, []);

  // ── Album 接收 drop ──
  const handleAlbumDragEnter = useCallback((e: React.DragEvent, albumId: string) => {
    const types = Array.from(e.dataTransfer.types);
    if (!types.includes(DRAG_MIME) && !types.includes("text/plain")) return;
    e.preventDefault();
    setHoveredAlbumId(albumId);
  }, []);

  const handleAlbumDragOver = useCallback((e: React.DragEvent) => {
    const types = Array.from(e.dataTransfer.types);
    if (!types.includes(DRAG_MIME) && !types.includes("text/plain")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleAlbumDragLeave = useCallback((albumId: string) => {
    setHoveredAlbumId((prev) => prev === albumId ? null : prev);
  }, []);

  const handleAlbumDrop = useCallback((e: React.DragEvent, targetAlbumId: string) => {
    e.preventDefault();
    setHoveredAlbumId(null);
    let dragIds: string[];
    try {
      const raw = e.dataTransfer.getData(DRAG_MIME) || e.dataTransfer.getData("text/plain");
      const parsed: DragPayload = raw.startsWith("{")
        ? JSON.parse(raw)
        : { photoIds: raw.split(",") };
      dragIds = parsed.photoIds ?? [];
    } catch {
      dragIds = draggingPhotoIds; // fallback 用 React state
    }
    if (dragIds.length === 0) {
      toast.error("拖曳資料解析失敗, 請重試");
      return;
    }
    // 搬移: 設 photo.albumId = targetAlbumId, 加到 order 末尾
    setPhotos((prev) => {
      const targets = targetAlbumId === selectedAlbumId
        ? [] // 同一個 album, 不重新 assign
        : prev.filter((p) => dragIds.includes(p.id));
      if (targets.length === 0) return prev;
      const targetAlbumMaxOrder = prev
        .filter((p) => p.albumId === targetAlbumId)
        .reduce((max, p) => Math.max(max, p.order), 0);
      let next = [...prev];
      const baseOrder = targetAlbumMaxOrder + 1;
      targets.forEach((p, i) => {
        next = next.map((q) => q.id === p.id ? { ...q, albumId: targetAlbumId, order: baseOrder + i } : q);
      });
      return next;
    });
    // 清選 (搬完後通常想繼續選下一批)
    setSelectedPhotoIds(new Set());
    setDraggingPhotoIds([]);
    toast.success(`已搬移 ${dragIds.length} 張到「${albums.find((a) => a.id === targetAlbumId)?.name}」`);
  }, [draggingPhotoIds, albums, selectedAlbumId]);

  // ── PhotoCard click (多選 Shift/Ctrl + 一般 click) ──
  const handlePhotoClick = useCallback((e: React.MouseEvent, photoId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (e.shiftKey && prev.size > 0) {
        // range select: 把最後選到這張中間的全部加入
        const lastSelectedId = Array.from(prev).pop()!;
        const list = currentAlbumPhotos;
        const a = list.findIndex((p) => p.id === lastSelectedId);
        const b = list.findIndex((p) => p.id === photoId);
        if (a >= 0 && b >= 0) {
          const [lo, hi] = a < b ? [a, b] : [b, a];
          for (let i = lo; i <= hi; i++) next.add(list[i].id);
          return next;
        }
      }
      if (e.ctrlKey || e.metaKey) {
        if (next.has(photoId)) next.delete(photoId);
        else next.add(photoId);
      } else {
        next.clear();
        next.add(photoId);
      }
      return next;
    });
  }, [currentAlbumPhotos]);

  // ── Marquee 拉框 ──
  const canvasRef = useRef<HTMLDivElement>(null);
  const lastShiftRef = useRef<boolean>(false);
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // 點到卡片不啟動 marquee (PhotoCard 自己 onClick)
    if ((e.target as HTMLElement).closest("[data-photo-card]") !== null) return;
    if ((e.target as HTMLElement).closest("[data-marquee-guard]") !== null) return;
    if (e.button !== 0) return; // 只左鍵
    const rect = canvasRef.current!.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    marqueeStartRef.current = { x: startX, y: startY };
    lastShiftRef.current = e.shiftKey;
    setMarqueeBox({ x: startX, y: startY, w: 0, h: 0 });

    // 🆕 7-30: 拉框自動滾 (聖上實證「粗篩 100-200 張」要拉大範圍)
    //   VirtualGrid 內部有 overflow-y-auto scrollable container,
    //   滑鼠靠近 canvas 上下邊時 scroll, 讓新 row render 後被 marquee 涵蓋。
    const autoScrollTimerRef = { current: 0 } as { current: number };
    function autoScrollOnEdge(clientY: number, canvasRect: DOMRect) {
      const EDGE = 60;
      const topDist = clientY - canvasRect.top;
      const bottomDist = canvasRect.bottom - clientY;
      // 找 VirtualGrid 內的 scrollable div
      const scroller = canvasRef.current?.querySelector<HTMLElement>(
        ".overflow-y-auto"
      );
      if (!scroller) return;
      if (autoScrollTimerRef.current) {
        cancelAnimationFrame(autoScrollTimerRef.current);
      }
      const step = () => {
        const dy =
          topDist < EDGE
            ? -Math.max(2, (EDGE - topDist) / 4)
            : bottomDist < EDGE
            ? Math.max(2, (EDGE - bottomDist) / 4)
            : 0;
        if (dy !== 0) {
          scroller.scrollTop += dy;
          autoScrollTimerRef.current = requestAnimationFrame(step);
        }
      };
      if (topDist < EDGE || bottomDist < EDGE) {
        autoScrollTimerRef.current = requestAnimationFrame(step);
      }
    }

    const onMove = (ev: MouseEvent) => {
      const r = canvasRef.current!.getBoundingClientRect();
      const sx = marqueeStartRef.current!.x;
      const sy = marqueeStartRef.current!.y;
      const cx = ev.clientX - r.left;
      const cy = ev.clientY - r.top;
      setMarqueeBox({
        x: Math.min(sx, cx),
        y: Math.min(sy, cy),
        w: Math.abs(cx - sx),
        h: Math.abs(cy - sy),
      });
      // 🆕 7-30 聖上實證「粗篩 100-200 張」要拉大範圍 → 自動 scroll 讓新 row 進來
      autoScrollOnEdge(ev.clientY, r);
    };
    const onUp = () => {
      // 計算 marquee 範圍內的 photos → 加入 selection
      // 用 setMarqueeBox functional form 拿最新 state
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      // 🆕 7-30: 取消仍在進行的 auto-scroll rAF
      if (autoScrollTimerRef.current) {
        cancelAnimationFrame(autoScrollTimerRef.current);
        autoScrollTimerRef.current = 0;
      }

      setMarqueeBox((final) => {
        if (final && final.w > 3 && final.h > 3) {
          const idsInBox: string[] = [];
          const cRect = canvasRef.current!.getBoundingClientRect();
          document.querySelectorAll<HTMLElement>("[data-photo-card]").forEach((el) => {
            const r = el.getBoundingClientRect();
            const left = final.x + cRect.left;
            const top = final.y + cRect.top;
            const right = left + final.w;
            const bottom = top + final.h;
            const cx2 = r.left + r.width / 2;
            const cy2 = r.top + r.height / 2;
            if (cx2 >= left && cx2 <= right && cy2 >= top && cy2 <= bottom) {
              idsInBox.push(el.dataset.photoId!);
            }
          });
          const useShift = lastShiftRef.current;
          setSelectedPhotoIds((prev) => {
            if (useShift) {
              const next = new Set(prev);
              for (const id of idsInBox) next.add(id);
              return next;
            }
            return new Set(idsInBox);
          });
        }
        // 🆕 7-30: 等下一個 rAF, 讓 React 把剛 scroll 進 viewport 的新 row 渲染完
        //   這樣 querySelectorAll 才看得到「真的進 marquee 範圍」的 cards
        requestAnimationFrame(() => {
          // 用 scroll position 決定再次 query (新 row 進來了)
          const idsInBox: string[] = [];
          const cRect = canvasRef.current!.getBoundingClientRect();
          const final2 = document.querySelector<HTMLElement>(
            "[data-marquee-guard] .pointer-events-none"
          );
          const box2 = final2
            ? {
                x: parseFloat(final2.style.left),
                y: parseFloat(final2.style.top),
                w: parseFloat(final2.style.width),
                h: parseFloat(final2.style.height),
              }
            : null;
          if (!box2 || box2.w <= 3 || box2.h <= 3) {
            return;
          }
          document.querySelectorAll<HTMLElement>("[data-photo-card]").forEach((el) => {
            const r = el.getBoundingClientRect();
            const left = box2.x + cRect.left;
            const top = box2.y + cRect.top;
            const right = left + box2.w;
            const bottom = top + box2.h;
            const cx2 = r.left + r.width / 2;
            const cy2 = r.top + r.height / 2;
            if (cx2 >= left && cx2 <= right && cy2 >= top && cy2 <= bottom) {
              idsInBox.push(el.dataset.photoId!);
            }
          });
          const useShift = lastShiftRef.current;
          setSelectedPhotoIds((prev) => {
            if (useShift) {
              const next = new Set(prev);
              for (const id of idsInBox) next.add(id);
              return next;
            }
            return new Set(idsInBox);
          });
          marqueeStartRef.current = null;
        });
        return null;
      });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  // ── 批量指定 uploader ──
  const handleBulkAssignUploader = useCallback((uploader: string) => {
    if (selectedPhotoIds.size === 0) {
      toast.error("請先勾選照片");
      return;
    }
    setPhotos((prev) => prev.map((p) => selectedPhotoIds.has(p.id) ? { ...p, uploader } : p));
    toast.success(`已把 ${selectedPhotoIds.size} 張標為「${uploader}」`);
  }, [selectedPhotoIds]);

  // ── 新增 album ──
  const handleCreateAlbum = useCallback(() => {
    if (!newAlbumName.trim()) {
      toast.error("請輸入相簿名稱");
      return;
    }
    const id = `album-${Date.now()}`;
    setAlbums((prev) => [
      ...prev,
      { id, name: newAlbumName.trim(), emoji: newAlbumEmoji.trim() || "📁", createdAt: Date.now() },
    ]);
    setNewAlbumName("");
    setNewAlbumEmoji("📁");
    setCreatingAlbum(false);
    setSelectedAlbumId(id);
    toast.success(`已建立 album「${newAlbumName.trim()}」`);
  }, [newAlbumName, newAlbumEmoji]);

  const handleRenameAlbum = useCallback((id: string) => {
    const album = albums.find((a) => a.id === id);
    if (!album) return;
    const newName = prompt("新相簿名稱", album.name);
    if (!newName || !newName.trim()) return;
    setAlbums((prev) => prev.map((a) => a.id === id ? { ...a, name: newName.trim() } : a));
  }, [albums]);

  const handleDeleteAlbum = useCallback((id: string) => {
    const album = albums.find((a) => a.id === id);
    if (!album) return;
    if (!confirm(`刪除「${album.name}」? 內部照片會退回 Inbox`)) return;
    // 把 photo 全退回 inbox
    setPhotos((prev) => prev.map((p) => p.albumId === id ? { ...p, albumId: INBOX_ALBUM_ID } : p));
    setAlbums((prev) => prev.filter((a) => a.id !== id));
    if (selectedAlbumId === id) setSelectedAlbumId(INBOX_ALBUM_ID);
  }, [albums, selectedAlbumId]);

  // ── Demo 嵌入輸出 ──
  const handleExportEmbed = useCallback(() => {
    // 🆕 7-30 TS 修正: generateEmbedCode 第一個參數接受 Album[] 任一結構
    const result = generateEmbedCode(
      albums as never,
      photos,
      selectedAlbumId,
      { limit: 20, fields: ["id", "src", "order", "uploader", "tags"] }
    );
    console.log("[Embed code for album", selectedAlbumId, "]", result.json);
    toast.success(`已 console.log 嵌入 JSON · ${result.photoCount} 張`);
  }, [albums, photos, selectedAlbumId]);

  // 🆕 7-30 聖上實證「為什麼我看不到 JSON」—
  //   把 fetch /photos-metadata.json + renderGallery 範例直接做按鈕, 點下去在 modal 預覽
  const [demoPreviewOpen, setDemoPreviewOpen] = useState(false);
  const [demoPreviewHTML, setDemoPreviewHTML] = useState("");
  const handleFetchAndPreview = useCallback(async () => {
    try {
      // 直接 fetch 公開 JSON (用同一個 origin, 證明 production 上 JSON 可讀)
      const mod = await import("./utils/renderGalleryExample");
      const data = await mod.fetchPhotosMetadata("/photos-metadata.json");
      // 取第一個 album 預覽
      const firstAlbum = data.albums.find((a) => a.id !== "inbox") ?? data.albums[0];
      if (!firstAlbum) {
        toast.error("JSON 內無 album");
        return;
      }
      // 暫時建一個隱藏 div, 讓 renderGallery 注入 HTML, 我們抓 innerHTML 進 modal
      const tmp = document.createElement("div");
      document.body.appendChild(tmp);
      mod.renderGallery(data, {
        albumId: firstAlbum.id,
        target: tmp,
        layout: "grid",
        columns: 4,
      });
      setDemoPreviewHTML(tmp.innerHTML);
      document.body.removeChild(tmp);
      setDemoPreviewOpen(true);
      toast.success(`已 fetch /photos-metadata.json + 渲染 ${data.photos.length} 張`);
    } catch (e) {
      toast.error(`fetch 失敗: ${String(e)}`);
    }
  }, []);

  // ── Render ──
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-amber-100 via-stone-50 to-rose-100 border-b-2 border-amber-300/40 px-4 sm:px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-bold text-stone-900 font-serif">
            📂 相片分類器
            <span className="ml-2 text-xs font-normal text-stone-600">
              13 位成員 · {photos.length} 張 · {albums.length} 個 album
            </span>
          </h1>
          <div className="flex gap-2">
            <button
              onClick={handleFetchAndPreview}
              className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold"
            >
              📥 載入 Demo JSON
            </button>
            <button
              onClick={handleExportEmbed}
              className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded font-bold"
            >
              📤 輸出 Embed JSON
            </button>
            <button
              onClick={() => setCreatingAlbum((b) => !b)}
              className="px-3 py-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded font-bold"
            >
              ➕ 新增 Album
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ─── Sidebar ─── */}
        <aside className="w-72 sm:w-80 bg-white border-r-2 border-stone-200 p-3 overflow-y-auto shrink-0">
          <div className="text-xs font-bold text-stone-700 mb-2 px-1">
            📑 自訂相簿 ({albums.length})
          </div>
          <div className="space-y-1.5">
            {albums.map((album) => (
              <AlbumRow
                key={album.id}
                album={album}
                isActive={album.id === selectedAlbumId}
                photoCount={albumCounts[album.id] ?? 0}
                isDragOver={hoveredAlbumId === album.id}
                onSelect={() => setSelectedAlbumId(album.id)}
                onDragEnter={(e) => handleAlbumDragEnter(e, album.id)}
                onDragOver={handleAlbumDragOver}
                onDragLeave={() => handleAlbumDragLeave(album.id)}
                onDrop={(e) => handleAlbumDrop(e, album.id)}
                onRename={() => handleRenameAlbum(album.id)}
                onDelete={() => handleDeleteAlbum(album.id)}
              />
            ))}
          </div>

          {/* 新增 album 表單 */}
          {creatingAlbum && (
            <div className="mt-3 p-3 bg-amber-50 border-2 border-amber-300 rounded-lg space-y-2">
              <input
                type="text"
                placeholder="📁 相簿名稱"
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateAlbum(); }}
                className="w-full px-2 py-1 text-sm border border-stone-300 rounded"
                autoFocus
              />
              <input
                type="text"
                placeholder="emoji"
                value={newAlbumEmoji}
                onChange={(e) => setNewAlbumEmoji(e.target.value)}
                className="w-full px-2 py-1 text-sm border border-stone-300 rounded"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateAlbum}
                  className="flex-1 px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold"
                >
                  建立
                </button>
                <button
                  onClick={() => { setCreatingAlbum(false); setNewAlbumName(""); }}
                  className="px-3 py-1 text-xs bg-stone-300 hover:bg-stone-400 rounded"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {/* 批量 uploader 指定 */}
          <div className="mt-6 pt-4 border-t-2 border-stone-200">
            <div className="text-xs font-bold text-stone-700 mb-2 px-1">
              👤 批量指定上傳者
            </div>
            <div className="text-[10px] text-stone-500 mb-2 px-1">
              已選 <strong>{selectedPhotoIds.size}</strong> 張
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleBulkAssignUploader(DEFAULT_UPLOADER)}
                className="px-2 py-1 text-xs bg-stone-200 hover:bg-stone-300 rounded truncate"
              >
                ❓ Unknown
              </button>
              {UPLOADERS.map((u) => (
                <button
                  key={u}
                  onClick={() => handleBulkAssignUploader(u)}
                  className="px-2 py-1 text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded truncate"
                  title={u}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ─── Main Canvas ─── */}
        <main
          ref={canvasRef}
          data-marquee-guard
          onMouseDown={handleCanvasMouseDown}
          className="flex-1 relative overflow-hidden bg-stone-100"
          onClick={() => setSelectedPhotoIds(new Set())}
        >
          {/* 頂 info bar */}
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-stone-200 px-4 py-2 flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm font-bold text-stone-900">
              {albums.find((a) => a.id === selectedAlbumId)?.emoji}{" "}
              {albums.find((a) => a.id === selectedAlbumId)?.name}
              <span className="ml-2 text-xs text-stone-500 font-normal">
                ({currentAlbumPhotos.length} 張)
              </span>
            </div>
            <div className="text-xs text-stone-500">
              按住 <kbd className="px-1.5 py-0.5 bg-stone-200 rounded">Shift</kbd> 連選 ·{" "}
              <kbd className="px-1.5 py-0.5 bg-stone-200 rounded">Ctrl</kbd> 加選 ·{" "}
              空白處拉框多選 · 拖到左側 album 分類
            </div>
          </div>

          {/* Virtual Grid */}
          <div className="px-4 py-3 h-[calc(100%-3rem)]" data-marquee-guard>
            <VirtualGrid
              items={currentAlbumPhotos}
              columns={6}
              rowHeight={132}
              gap={6}
              renderCell={(photo, _index) => (
                <div data-photo-card data-photo-id={photo.id} className="w-full h-full">
                  <PhotoCard
                    photo={photo}
                    selected={selectedPhotoIds.has(photo.id)}
                    active={draggingPhotoIds.includes(photo.id)}
                    onClick={handlePhotoClick}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  />
                </div>
              )}
              className="h-full"
            />
          </div>

          {/* Marquee 拉框視覺 */}
          {marqueeBox && marqueeBox.w > 3 && marqueeBox.h > 3 && (
            <div
              className="absolute pointer-events-none border-2 border-amber-500 bg-amber-200/30 z-30"
              style={{
                left: marqueeBox.x,
                top: marqueeBox.y,
                width: marqueeBox.w,
                height: marqueeBox.h,
              }}
            />
          )}
        </main>
      </div>

      {/* 🆕 7-30 Demo Preview Modal — 點 📥 載入 Demo JSON 後彈出 */}
      {demoPreviewOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setDemoPreviewOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-stone-900 font-serif">
                  📥 Demo Metadata 預覽
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  從 <code className="bg-stone-100 px-1 rounded">/photos-metadata.json</code> fetch 後的渲染結果
                </p>
              </div>
              <button
                onClick={() => setDemoPreviewOpen(false)}
                className="w-10 h-10 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div
              className="border-2 border-stone-200 rounded-lg p-4 bg-stone-50 overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: demoPreviewHTML }}
            />
            <div className="mt-3 text-xs text-stone-500">
              💡 上方 grid = <code>renderGallery(metadata, {`{ albumId, target, layout: 'grid', columns: 4 }`})</code> 輸出
              · 換 <code>layout: 'carousel'</code> 就變水平 slider
              · 換 <code>albumId</code> 就顯示不同相簿
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
