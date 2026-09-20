"use client";

/**
 * 🆕 2026-08-10 聖上拍板: 動態排版故事卡片
 *
 * 根據 layout_type 自動切換 3 種版型 (2A 中國風 + 桌機/手機響應式):
 *   - left-image:  桌機「圖左文右」(md+) / 手機「圖上文下」
 *   - right-image: 桌機「圖右文左」(md+) / 手機「圖上文下」
 *   - top-image:   不論桌機手機都是「圖上文下」(適合寬幅風景)
 *
 * � 2026-08-16 聖上拍板: 第 6 個按鈕 🖼 切換相框風格 (4 種)
 *   - vermilion 朱紅金邊 / polaroid 純白拍立得 / ink 墨黑復古 / wash 水墨淡邊
 *   - 跟 layout_type 一樣循環切換
 *   - DB column `frame_style` + localStorage mirror
 *
 * 中國風元素:
 *   - 標題寫進照片 caption (PhotoFrame 內), 粗體置中
 *   - 內文用 Noto Serif TC 襯線
 *   - 作者名用 jn-vermilion 朱紅印章 chip
 *   - 背景 jn-paper-warm 暖宣紙
 *   - 段落分隔用 金色細線 + 印章點綴
 *
 * 🆕 8-10 聖上拍板: 每個 article 右上角 hover 浮動 6 個按鈕
 *   - 🗑 刪除 (with confirm dialog by parent)
 *   - ⬆ 上下移動 (sort_order 重新分配)
 *   - ⚙ 重新潤飾 (LLM 改寫)
 *   - ⬅ 循環切換排版 (圖左/圖右/圖上)
 *   - 🖼 循環切換相框風格 (🆕 8-16)
 *   - 任何人都能動 (跟 RLS 全開一致)
 */
import { useState, useEffect, useRef, useCallback } from "react";
import PhotoFrame, { type FrameStyle } from "./PhotoFrame";

// 🆕 2026-08-14 聖上拍板: 排版切換按鈕用的 label + emoji
const LAYOUT_LABEL: Record<PostRow["layout_type"], string> = {
  "left-image": "圖左 文右",
  "right-image": "圖右 文左",
  "top-image": "圖上 文下",
};
const LAYOUT_EMOJI: Record<PostRow["layout_type"], string> = {
  "left-image": "�",
  "right-image": "➡",
  "top-image": "⬆",
};

// 🆕 2026-08-16 聖上拍板: 相框切換按鈕用的 label + emoji (4 種)
const FRAME_LABEL: Record<FrameStyle, string> = {
  vermilion: "朱紅金邊",
  polaroid: "純白拍立得",
  ink: "墨黑復古",
  wash: "水墨淡邊",
};
const FRAME_EMOJI: Record<FrameStyle, string> = {
  vermilion: "�",
  polaroid: "⬜",
  ink: "🎞",
  wash: "📜",
};

export interface PostRow {
  id: string;
  day_number: number;
  sort_order: number;
  title: string | null;
  content: string;
  image_url: string | null;
  layout_type: "left-image" | "right-image" | "top-image";
  frame_style: FrameStyle;  // 🆕 2026-08-16 聖上拍板
  author_name: string;
  created_at: string;
}

interface TimelineStoryProps {
  post: PostRow;
  isFirst?: boolean;
  dayLabel?: string;
  onPhotoClick?: () => void;
  /** 🆕 8-10 聖上拍板: 操作 callback (Page 接住處理 DB) */
  onDelete?: (id: string) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  /** 🆕 8-10 聖上拍板: 重新潤飾 — 點擊開 RepolishModal 顯示原文 + LLM 潤飾版 + 採納 */
  onPolish?: (id: string) => void;
  /** 🆕 9-20 聖上拍板: 精簡至 150 字 — 點擊開 ReshortenModal 顯示原文 + LLM 精簡版 + 採納 */
  onShorten?: (id: string) => void;
  /** 🆕 2026-08-14 聖上拍板: 循環切換排版 (left-image → right-image → top-image → left-image) */
  onChangeLayout?: (id: string) => void;
  /** 🆕 2026-08-16 聖上拍板: 循環切換相框風格 (4 種) */
  onChangeFrame?: (id: string) => void;
}

export default function TimelineStory({
  post,
  isFirst = false,
  dayLabel,
  onPhotoClick,
  onDelete,
  onMoveUp,
  onMoveDown,
  onPolish,
  onShorten,
  onChangeLayout,
  onChangeFrame,
}: TimelineStoryProps) {
  // 🆕 2026-08-19 聖上拍板 🅐: 操作面板「常駐低調」+ tap toggle
  //   - 預設 opacity-30 (符合三鐵律「不影響閱讀」)
  //   - desktop hover 全亮 (group-hover:opacity-100)
  //   - mobile tap 切換 (panelActive),3 秒後自動收回
  //   - 點按鈕本身 e.stopPropagation() 避免冒泡觸發 toggle
  const [panelActive, setPanelActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const articleRef = useRef<HTMLElement | null>(null);

  const activatePanel = useCallback(() => {
    setPanelActive(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setPanelActive(false), 3000);
  }, []);

  // 點外面收回 (desktop 用)
  useEffect(() => {
    if (!panelActive) return;
    const handler = (e: MouseEvent) => {
      if (articleRef.current && !articleRef.current.contains(e.target as Node)) {
        setPanelActive(false);
        if (timerRef.current) clearTimeout(timerRef.current);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [panelActive]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
  // 🆕 8-10 聖上拍板: 內容區不再顯示小標題 + 不再顯示 day chip + 不再顯示編輯時間
  //   (頂部章節標題已顯示, 圖片 caption 已含小標題, 時間拿掉精簡版面)

  // 🆕 8-10 聖上拍板: 內容區不再顯示小標題 (小標題只在照片 caption 顯示一次)
  //   + 不再顯示編輯時間 (created_at 整段拿掉)
  const ContentBlock = (
    <div className="flex-1 min-w-0 space-y-4">
      {post.content && (
        <p className="text-base md:text-lg text-jn-ink/85 leading-relaxed whitespace-pre-wrap font-serif">
          {post.content}
        </p>
      )}
      {/* 作者名: 朱紅印章 chip — 聖上 USER 偏好保留 (知道是誰寫的) */}
      <div className="flex items-center gap-2 pt-2">
        <span
          className="inline-flex items-center bg-jn-vermilion text-white text-xs font-bold px-3 py-1 rounded-sm"
          style={{ letterSpacing: "0.05em" }}
        >
          ✍ {post.author_name || "匿名"}
        </span>
      </div>
    </div>
  );

  // 圖片區 (沒圖就隱藏)
  const PhotoBlock = post.image_url ? (
    <div className={`flex-shrink-0 ${post.layout_type === "top-image" ? "w-full" : "w-full md:w-[42%]"}`}>
      <div className="flex justify-center">
        <PhotoFrame
          src={post.image_url}
          caption={post.title || undefined}
          frameStyle={post.frame_style}  // 🆕 2026-08-16 聖上拍板
          alt={post.title || "旅程照片"}
          priority={isFirst}
          onClick={onPhotoClick}
        />
      </div>
    </div>
  ) : null;

  return (
    <article
      id={`post-${post.id}`}
      ref={articleRef}
      onClick={activatePanel}
      className="group relative bg-jn-paper-warm/60 backdrop-blur-sm border-l-4 border-jn-vermilion/40 rounded-r-lg shadow-sm hover:shadow-md transition-shadow p-6 md:p-8 scroll-mt-20"
    >
      {/* 🆕 8-10 聖上拍板: 拿掉 article 內的 day chip (頂部章節標題已顯示, 不重複) */}

      {/* 根據 layout_type 切換 grid */}
      {post.layout_type === "left-image" && post.image_url ? (
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {PhotoBlock}
          {ContentBlock}
        </div>
      ) : post.layout_type === "right-image" && post.image_url ? (
        <div className="flex flex-col md:flex-row-reverse gap-6 md:gap-8">
          {PhotoBlock}
          {ContentBlock}
        </div>
      ) : (
        // top-image 或沒圖: 圖在上文在下
        <div className="space-y-6">
          {PhotoBlock}
          {ContentBlock}
        </div>
      )}

      {/* 🆕 2026-08-19 聖上拍板 🅐: 右上角操作面板「常駐低調 + tap toggle」
          - 預設 opacity-30 (低調,不影響閱讀)
          - desktop hover / mobile tap 都全亮
          - 點按鈕 e.stopPropagation() 避免冒泡重新觸發 activatePanel */}
      <div
        className={`absolute top-2 right-2 flex flex-col gap-1 transition-opacity ${
          panelActive
            ? "opacity-100"
            : "opacity-30 md:opacity-0 md:group-hover:opacity-100"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {onMoveUp && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp(post.id);
              activatePanel();
            }}
            title="上移"
            aria-label="上移"
            className="w-9 h-9 md:w-7 md:h-7 bg-jn-paper/95 hover:bg-jn-gold-light active:scale-95 text-jn-ink rounded shadow flex items-center justify-center text-sm border border-jn-ink/20 touch-manipulation"
          >
            ⬆
          </button>
        )}
        {onMoveDown && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown(post.id);
              activatePanel();
            }}
            title="下移"
            aria-label="下移"
            className="w-9 h-9 md:w-7 md:h-7 bg-jn-paper/95 hover:bg-jn-gold-light active:scale-95 text-jn-ink rounded shadow flex items-center justify-center text-sm border border-jn-ink/20 touch-manipulation"
          >
            ⬇
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`確定要刪除「${post.title || "這篇"}」嗎?\n\n(刪了就沒了 — 沒辦法復原)`)) {
                onDelete(post.id);
              }
              activatePanel();
            }}
            title="刪除"
            aria-label="刪除"
            className="w-9 h-9 md:w-7 md:h-7 bg-jn-paper/95 hover:bg-jn-vermilion hover:text-white active:scale-95 text-jn-vermilion rounded shadow flex items-center justify-center text-sm border border-jn-vermilion/40 touch-manipulation"
          >
            🗑
          </button>
        )}
        {/* 🆕 8-10 聖上拍板: 重新潤飾按鈕 — 開 RepolishModal */}
        {onPolish && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPolish(post.id);
              activatePanel();
            }}
            title="用 LLM 重新潤飾這篇"
            aria-label="重新潤飾"
            className="w-9 h-9 md:w-7 md:h-7 bg-jn-paper/95 hover:bg-jn-gold active:scale-95 text-jn-ink rounded shadow flex items-center justify-center text-sm border border-jn-gold/60 touch-manipulation"
          >
            ⚙
          </button>
        )}
        {/* 🆕 9-20 聖上拍板: 精簡至 150 字按鈕 — 開 ReshortenModal */}
        {onShorten && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onShorten(post.id);
              activatePanel();
            }}
            title="用 LLM 修整字數至 150 字 (意思與原文一致)"
            aria-label="精簡至 150 字"
            className="w-9 h-9 md:w-7 md:h-7 bg-jn-paper/95 hover:bg-jn-gold active:scale-95 text-jn-ink rounded shadow flex items-center justify-center text-sm border border-jn-gold/60 touch-manipulation"
          >
            ✂️
          </button>
        )}
        {/* 🆕 2026-08-14 聖上拍板: 循環切換排版 (圖左文右 / 圖右文左 / 圖上文下) */}
        {onChangeLayout && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChangeLayout(post.id);
              activatePanel();
            }}
            title={`目前: ${LAYOUT_LABEL[post.layout_type]} — 點擊循環切換`}
            aria-label="切換排版"
            className="w-9 h-9 md:w-7 md:h-7 bg-jn-paper/95 hover:bg-jn-ink/10 active:scale-95 text-jn-ink rounded shadow flex items-center justify-center text-sm border border-jn-ink/20 touch-manipulation"
          >
            {LAYOUT_EMOJI[post.layout_type]}
          </button>
        )}
        {/* 🆕 2026-08-16 聖上拍板: 循環切換相框風格 (4 種) */}
        {onChangeFrame && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChangeFrame(post.id);
              activatePanel();
            }}
            title={`目前相框: ${FRAME_LABEL[post.frame_style]} — 點擊循環切換`}
            aria-label="切換相框風格"
            className="w-9 h-9 md:w-7 md:h-7 bg-jn-paper/95 hover:bg-jn-gold/30 active:scale-95 text-jn-ink rounded shadow flex items-center justify-center text-sm border border-jn-gold/40 touch-manipulation"
          >
            {FRAME_EMOJI[post.frame_style]}
          </button>
        )}
      </div>
    </article>
  );
}
