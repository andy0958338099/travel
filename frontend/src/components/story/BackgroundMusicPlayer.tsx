"use client";

/**
 * 🆕 2026-08-14 聖上拍板 🅑: 部落格背景音樂播放器 (右下浮動, 不影響閱讀)
 *
 * 設計重點 (聖上 USER 偏好):
 *   - 右下浮動 widget, 預設 60px 圓鈕「🎵 點擊開始背景音樂」
 *   - 點擊展開 280px mini-player (歌名 + 上一首/暫停/下一首/音量/關閉)
 *   - 預設暫停 (瀏覽器 autoplay 規定: 必須 user 互動才能有聲音)
 *   - 點擊後 autoplay + 音量 30%, 隨機播 20 首古鎮歌曲
 *   - ESC 關閉 mini-player (回到 60px 圓鈕)
 *   - localStorage 記憶「已開啟」狀態 (reopen 還在背景跑)
 *
 * 技術選擇 — YouTube IFrame Player API:
 *   - 比 embed iframe 更可控 (play/pause/next/volume 程式呼叫)
 *   - 比 <audio> tag 簡單 (不用處理 CORS / mp3 hosting / Storage quota)
 *   - iframe 隱藏, 只用音訊 (display:none 不可行, 必須 width=0 height=0)
 *   - 對古鎮民謠通常可播 (版權歌曲 YouTube 自動擋, 顯示錯誤)
 *
 * 不影響閱讀保證:
 *   - 圓鈕 60px, 不擋 nav / 不擋文章
 *   - mini-player 280x100px, 永遠在右下, 不會跟 hero / 文章互疊
 *   - z-30 (低於 modal z-50, 不會擋 AddStoryModal / RepolishModal)
 *   - 不顯示 video, 純音訊背景
 */
import { useEffect, useRef, useState, useCallback } from "react";

// 🆕 2026-08-14 聖上 paste 的 20 首古鎮歌曲 YouTube URL
//   (from /Volumes/Transcend/.hermes/pastes/paste_1_210210.txt)
//   標題: 2026-08-14 用 scripts/fetch-music-titles.mjs (YouTube oEmbed) 抓真實標題
//   版權警告: 周杰倫 (青花瓷/天涯過客) + 林俊傑 (江南/醉赤壁) 可能 iframe embed 失敗
//     → onError handler 自動跳下一首, 不會卡死
const PLAYLIST: { title: string; videoId: string }[] = [
  { title: "莲池夜月", videoId: "3aDL-3jZ1zU" },
  { title: "入画江南", videoId: "VLYIWMB6QIE" },
  { title: "玉慧同学 - 相思遥", videoId: "YC7u_M_QUzI" },
  { title: "春庭风月", videoId: "N235Ch_QOBc" },
  { title: "苏州好风光 - 朱虹", videoId: "-C8xoHLlxfM" },
  { title: "蓝心羽 - 相思调", videoId: "SC0qqsKQt1E" },
  { title: "周杰倫 - 天涯過客", videoId: "-gJzlOJ0Zoo" },
  { title: "浮生夢 - 星月落", videoId: "9Twp6hoBYcc" },
  { title: "林俊傑 - 江南", videoId: "G97_rOdHcnY" },
  { title: "小城谣 (笛子版)", videoId: "Gpc-Q5pYT_I" },
  { title: "張曉棠 - 蘇幕遮", videoId: "FaxoKtCUhOg" },
  { title: "指尖笑 - 时光晃呀晃", videoId: "JieOI1WGe6A" },
  { title: "徐良 北京巷弄", videoId: "wJaML735dxE" },
  { title: "周杰倫 - 青花瓷", videoId: "Z8Mqw0b9ADs" },
  { title: "許嵩 - 如果當時", videoId: "fRJ9HIiat1k" },
  { title: "探窗 - 古風戲腔", videoId: "5b5B_Gf8iLI" },
  { title: "林俊傑 - 醉赤壁", videoId: "1fgmcZ3VLMc" },
  { title: "周林枫 - 只为碎银几两", videoId: "FcYm2qBZJEc" },
  { title: "刘珂矣 - 半纱壶", videoId: "FtoiYX_OR60" },
  { title: "黃伊寧 - 蘇公堤·2025", videoId: "gQLP6T-y1a4" },
];

// YouTube IFrame Player API 全域 type
declare global {
  interface Window {
    YT: YTNamespace;
    onYouTubeIframeAPIReady: () => void;
  }
}

// YT namespace (含 Player class + PlayerState enum)
interface YTNamespace {
  Player: new (
    el: HTMLElement | string,
    config: {
      height: string;
      width: string;
      videoId: string;
      playerVars: Record<string, number | string>;
      events: {
        onReady: (e: { target: YTPlayer }) => void;
        onStateChange: (e: { data: number; target: YTPlayer }) => void;
        onError: (e: { data: number }) => void;
      };
    }
  ) => YTPlayer;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
}
interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  unMute: () => void;
  mute: () => void;
  setVolume: (n: number) => void;
  getVolume: () => number;
  loadVideoById: (id: string) => void;
  getPlayerState: () => number;
  destroy: () => void;
}

const VOLUME_DEFAULT = 30;
const LS_KEY_ENABLED = "story-blog-bg-music-enabled";

export default function BackgroundMusicPlayer() {
  const [enabled, setEnabled] = useState(false); // false = 60px 圓鈕, true = 展開 mini-player
  const [started, setStarted] = useState(false); // false = 還沒 click 過, true = 已 click 過開始播放
  const [currentIdx, setCurrentIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [volume, setVolume] = useState(VOLUME_DEFAULT);
  const [apiReady, setApiReady] = useState(false);
  const playerRef = useRef<YTPlayer | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // ── 載入 YouTube IFrame Player API (一次性) ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.YT && window.YT.Player) {
      setApiReady(true);
      return;
    }
    // 注入 script tag (idempotent)
    if (!document.getElementById("youtube-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
    // 等待 onYouTubeIframeAPIReady 回呼
    const prevHandler = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevHandler) prevHandler();
      setApiReady(true);
    };
  }, []);

  // ── 隨機選下一首 (避免連播同首) ──
  const pickRandom = useCallback((excludeIdx: number): number => {
    if (PLAYLIST.length <= 1) return 0;
    let next = Math.floor(Math.random() * PLAYLIST.length);
    while (next === excludeIdx) next = Math.floor(Math.random() * PLAYLIST.length);
    return next;
  }, []);

  // ── 聖上 click 開始 → 建 player + 隨機選首 + autoplay + 30% volume ──
  const handleStart = useCallback(() => {
    setStarted(true);
    setEnabled(true);
    localStorage.setItem(LS_KEY_ENABLED, "true");
    // 隨機挑第一首
    const idx = Math.floor(Math.random() * PLAYLIST.length);
    setCurrentIdx(idx);
  }, []);

  // ── 當 started=true 且 apiReady=true, 真正建 YouTube Player (一次性) ──
// 🆕 2026-08-14 聖上拍板 🅐: 修多首同時播放 bug
//   - dep array 拿掉 currentIdx, 只在 [started, apiReady] 變化時建一次
//   - 切歌透過 player.loadVideoById (line 175 / 187), 不重新建 player
//   - 舊 bug: [started, apiReady, currentIdx] → currentIdx 一變就 re-run effect
//     → 即使 playerRef.current 存在, 也會建新 player (舊的沒 destroy)
//     → 多個 iframe 同時跑, 多首歌同時播放
  useEffect(() => {
    if (!started || !apiReady || !containerRef.current) return;
    if (playerRef.current) return; // 已建過, 跳過

    const player = new window.YT.Player(containerRef.current, {
      height: "0",
      width: "0",
      videoId: PLAYLIST[currentIdx].videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
      },
      events: {
        onReady: (e: { target: YTPlayer }) => {
          e.target.setVolume(VOLUME_DEFAULT);
          e.target.unMute();
          e.target.playVideo();
        },
        onStateChange: (e: { data: number; target: YTPlayer }) => {
          if (e.data === window.YT.PlayerState.ENDED) {
            // 自動換下一首 (隨機)
            const nextIdx = pickRandom(currentIdx);
            setCurrentIdx(nextIdx);
            e.target.loadVideoById(PLAYLIST[nextIdx].videoId);
          } else if (e.data === window.YT.PlayerState.PLAYING) {
            setPaused(false);
          } else if (e.data === window.YT.PlayerState.PAUSED) {
            setPaused(true);
          }
        },
        onError: (e: { data: number }) => {
          // YouTube 版權擋或網路錯誤 → 跳下一首
          const nextIdx = pickRandom(currentIdx);
          setCurrentIdx(nextIdx);
          if (playerRef.current) {
            playerRef.current.loadVideoById(PLAYLIST[nextIdx].videoId);
          }
        },
      },
    });
    playerRef.current = player;

    return () => {
      // 不在這裡 destroy, 元件 unmount 才清
    };
  }, [started, apiReady]); // 🆕 拿掉 currentIdx + pickRandom 避免重複建 player

  // ── 切歌 (聖上按上一首/下一首) ──
  const handlePrev = useCallback(() => {
    if (!playerRef.current) return;
    const prevIdx = (currentIdx - 1 + PLAYLIST.length) % PLAYLIST.length;
    setCurrentIdx(prevIdx);
    playerRef.current.loadVideoById(PLAYLIST[prevIdx].videoId);
  }, [currentIdx]);

  const handleNext = useCallback(() => {
    if (!playerRef.current) return;
    const nextIdx = pickRandom(currentIdx);
    setCurrentIdx(nextIdx);
    playerRef.current.loadVideoById(PLAYLIST[nextIdx].videoId);
  }, [currentIdx, pickRandom]);

  // ── 暫停 / 繼續 ──
  const handleTogglePause = useCallback(() => {
    if (!playerRef.current) return;
    if (paused) {
      playerRef.current.playVideo();
    } else {
      playerRef.current.pauseVideo();
    }
  }, [paused]);

  // ── 音量調整 ──
  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume);
    }
  }, []);

  // ── 關閉 (回到 60px 圓鈕, 暫停音樂) ──
  const handleClose = useCallback(() => {
    if (playerRef.current) playerRef.current.pauseVideo();
    setEnabled(false);
  }, []);

  // ── ESC 關閉 mini-player ──
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [enabled, handleClose]);

  // ── 元件 unmount 時 destroy player ──
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []);

  // ── 從 localStorage 讀取上次狀態 (refresh 後是否自動展開) ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(LS_KEY_ENABLED);
    if (saved === "true") {
      // 已開啟過, refresh 後直接顯示圓鈕 (但仍需 user click 重新開始播放)
      setEnabled(true);
      setStarted(true); // 標記已啟用 (mini-player 顯示, 但 youtube player 要重建)
    }
  }, []);

  return (
    <>
      {/* YouTube Player 容器: 永遠在 DOM 但 0x0 隱藏 (瀏覽器 audio 仍跑) */}
      <div
        ref={containerRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          bottom: 0,
          right: 0,
          width: 0,
          height: 0,
          opacity: 0,
          pointerEvents: "none",
          zIndex: -1,
        }}
      />

      {/* 右下浮動 widget (z-30, 低於 modal z-50) */}
      {!enabled ? (
        // 預設狀態: 60px 圓鈕 (左下)
        <button
          type="button"
          onClick={handleStart}
          className="fixed bottom-6 left-6 z-30 bg-jn-vermilion text-white px-4 py-3 rounded-full shadow-lg hover:bg-jn-vermilion-deep transition-all hover:scale-105 flex items-center gap-2 text-sm font-bold"
          style={{ boxShadow: "0 8px 24px -4px rgba(220, 38, 38, 0.4)" }}
          aria-label="點擊開始背景音樂"
          title="🎵 點擊開始背景音樂 (音量 30%)"
        >
          🎵 點擊開始背景音樂
        </button>
      ) : (
        // 展開狀態: 280x100 mini-player (左下) — 🆕 2026-08-14 聖上拍板 🅑
        // 宣紙色 #fde9b8 (95% 透明) + 朱印紅 1px 邊框 + 暖茶褐雙層陰影 + 內陰影紙張感
        <div
          className="fixed bottom-6 left-6 z-30 border border-jn-vermilion/60 rounded-xl p-3 flex flex-col gap-2 backdrop-blur-sm"
          style={{
            width: 280,
            backgroundColor: "rgba(253, 233, 184, 0.95)",
            boxShadow:
              "0 16px 40px -10px rgba(140, 70, 30, 0.35), 0 4px 12px -4px rgba(100, 50, 20, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.4)",
          }}
          role="region"
          aria-label="背景音樂播放器"
        >
          {/* 第一列: 歌名 + 關閉 */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-base">🎵</span>
              <span className="text-xs text-jn-ink/85 truncate" title={PLAYLIST[currentIdx].title}>
                {PLAYLIST[currentIdx].title}
                {paused && <span className="ml-1 text-jn-vermilion">(已暫停)</span>}
              </span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="text-jn-ink/60 hover:text-jn-vermilion text-lg leading-none w-6 h-6 flex items-center justify-center"
              aria-label="關閉播放器 (ESC)"
              title="關閉 (ESC)"
            >
              ×
            </button>
          </div>

          {/* 第二列: 上一首 / 暫停 / 下一首 */}
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              className="w-8 h-8 bg-jn-paper hover:bg-jn-gold-light text-jn-ink rounded flex items-center justify-center text-sm border border-jn-ink/20"
              aria-label="上一首"
              title="上一首"
            >
              ⏮
            </button>
            <button
              type="button"
              onClick={handleTogglePause}
              className="w-10 h-8 bg-jn-gold-light text-jn-ink hover:bg-jn-gold rounded flex items-center justify-center text-sm font-bold border-2 border-jn-vermilion"
              aria-label={paused ? "繼續播放" : "暫停"}
              title={paused ? "繼續播放" : "暫停"}
            >
              {paused ? "▶" : "⏸"}
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="w-8 h-8 bg-jn-paper hover:bg-jn-gold-light text-jn-ink rounded flex items-center justify-center text-sm border border-jn-ink/20"
              aria-label="下一首 (隨機)"
              title="下一首 (隨機)"
            >
              ⏭
            </button>
            {/* 🆕 2026-08-14 聖上拍板 🅐: 下載按鈕 (開 YouTube 官方 watch URL 在新分頁) */}
            <a
              href={`https://www.youtube.com/watch?v=${PLAYLIST[currentIdx].videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 bg-jn-paper hover:bg-jn-gold-light text-jn-ink rounded flex items-center justify-center text-sm border border-jn-ink/20"
              aria-label={`下載「${PLAYLIST[currentIdx].title}」到 YouTube`}
              title={`下載「${PLAYLIST[currentIdx].title}」到 YouTube (新分頁開啟)`}
            >
              ⬇
            </a>
          </div>

          {/* 第三列: 音量 slider */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-jn-ink/60">🔈</span>
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="flex-1 h-1 accent-jn-vermilion"
              aria-label={`音量 ${volume}%`}
            />
            <span className="text-xs text-jn-ink/60 w-8 text-right">{volume}%</span>
          </div>
        </div>
      )}
    </>
  );
}
