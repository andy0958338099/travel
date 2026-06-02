"use client";

/**
 * OnboardingTour — first-visit auto-tour for /travel.
 *
 * Design constraints:
 *   - Trigger ONCE per browser (localStorage flag).
 *   - Always skippable (top-right "跳過" button).
 *   - Sequential auto-scroll to 5 key sections, ~4s each, with a
 *     highlighted card overlay + caption ("這是行程規劃器").
 *   - On finish, set flag and never show again.
 *   - Mobile-friendly: cards stack above the section, not beside.
 *
 * Why a custom component (not react-joyride)?
 *   Bundle size. react-joyride pulls in ~80KB; this is ~150 lines and
 *   does exactly what we need.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const FLAG_KEY = "travel-onboarding-completed-v1";

interface Step {
  id: string;
  // How to find the target element. heading matchers walk all sections
  // and pick the first one whose <h2>/<h3> textContent contains `match`.
  match?:
    | { kind: "heading"; contains: string }
    | { kind: "href"; href: string }
    | { kind: "data-tour"; id: string };
  title: string;
  caption: string;
  emoji: string;
}

const STEPS: Step[] = [
  {
    id: "gallery",
    match: { kind: "heading", contains: "景點寫真" },
    title: "景點寫真",
    caption: "出發前先預覽每個景點的實拍照片，點照片可放大。",
    emoji: "📷",
  },
  {
    id: "map",
    match: { kind: "heading", contains: "互動式景點地圖" },
    title: "互動式景點地圖",
    caption: "用 Google Maps 把所有景點釘在地圖上，方便規劃路線。",
    emoji: "🗺️",
  },
  {
    id: "planner",
    match: { kind: "heading", contains: "行程規劃" },
    title: "行程規劃器",
    caption: "用拖拉編輯 8 天行程，自動計算總預算。",
    emoji: "📋",
  },
  {
    id: "packing",
    match: { kind: "heading", contains: "行李清單" },
    title: "行李清單 + 預算 + 天氣",
    caption: "打包不漏東漏西、預算不超支、天氣早知道。",
    emoji: "🧳",
  },
  {
    id: "postcard",
    match: { kind: "href", href: "/travel/postcard" },
    title: "明信片生成器",
    caption: "把小紅書風格行程圖卡一鍵分享給朋友。",
    emoji: "🖼️",
  },
];

/** Resolve a step's `match` config to a real DOM element. */
function findTarget(match: Step["match"]): HTMLElement | null {
  if (!match) return null;
  if (match.kind === "heading") {
    const sections = document.querySelectorAll("section");
    for (const s of Array.from(sections)) {
      const h = s.querySelector("h2, h3");
      if (h?.textContent?.includes(match.contains)) return s as HTMLElement;
    }
    return null;
  }
  if (match.kind === "href") {
    return document.querySelector(`a[href="${match.href}"]`) as HTMLElement | null;
  }
  if (match.kind === "data-tour") {
    return document.querySelector(`[data-tour="${match.id}"]`) as HTMLElement | null;
  }
  return null;
}

export default function OnboardingTour() {
  const [active, setActive] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 1) 偵測是否首次 ──
  useEffect(() => {
    setMounted(true);
    try {
      if (localStorage.getItem(FLAG_KEY) === "1") return;
    } catch {}
    // 給 SSR / hydration 100ms 緩衝
    const startTimer = setTimeout(() => setActive(true), 600);
    return () => clearTimeout(startTimer);
  }, []);

  // ── 2) 計算高亮目標的 rect ──
  useEffect(() => {
    if (!active) return;
    const step = STEPS[stepIdx];
    if (!step) return;
    const el = findTarget(step.match);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // 等捲動結束再量 rect
      const measureTimer = setTimeout(() => {
        const r = el.getBoundingClientRect();
        setRect(r);
      }, 500);
      // 4 秒後自動進下一步
      timerRef.current = setTimeout(() => {
        if (stepIdx < STEPS.length - 1) {
          setStepIdx((i) => i + 1);
        } else {
          finish();
        }
      }, 4000);
      return () => {
        clearTimeout(measureTimer);
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    } else {
      // 找不到目標就跳下一步
      timerRef.current = setTimeout(() => {
        if (stepIdx < STEPS.length - 1) setStepIdx((i) => i + 1);
        else finish();
      }, 2000);
    }
  }, [active, stepIdx]);

  // ── 3) 視窗大小改變時重算 rect ──
  useEffect(() => {
    if (!active) return;
    const onResize = () => {
      const step = STEPS[stepIdx];
      if (!step) return;
      const el = findTarget(step.match);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active, stepIdx]);

  const finish = () => {
    try { localStorage.setItem(FLAG_KEY, "1"); } catch {}
    setActive(false);
  };

  const skip = finish;
  const next = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (stepIdx < STEPS.length - 1) setStepIdx((i) => i + 1);
    else finish();
  };

  if (!mounted || !active) return null;

  const step = STEPS[stepIdx];

  return createPortal(
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* 暗化遮罩（4 邊 box-shadow 模擬 spotlight） */}
      <div
        className="absolute inset-0 bg-black/60 transition-opacity"
        style={{
          boxShadow: rect
            ? `0 0 0 9999px rgba(0,0,0,0.65), 0 0 0 4px #14b8a6 inset`
            : undefined,
          clipPath: rect
            ? `polygon(
                0% 0%, 0% 100%,
                ${Math.max(0, rect.left - 8)}px 100%,
                ${Math.max(0, rect.left - 8)}px ${Math.max(0, rect.top - 8)}px,
                ${rect.right + 8}px ${Math.max(0, rect.top - 8)}px,
                ${rect.right + 8}px ${rect.bottom + 8}px,
                ${Math.max(0, rect.left - 8)}px ${rect.bottom + 8}px,
                ${Math.max(0, rect.left - 8)}px 100%,
                100% 100%, 100% 0%
              )`
            : undefined,
        }}
      />

      {/* 高亮卡片浮動視窗 — 顯示在目標元素下方或上方 */}
      {rect && step && (
        <div
          className="absolute pointer-events-auto animate-in fade-in zoom-in-95"
          style={{
            left: Math.max(16, Math.min(window.innerWidth - 360, rect.left)),
            top: rect.bottom + 16 > window.innerHeight - 200
              ? Math.max(80, rect.top - 180)
              : rect.bottom + 16,
            width: 340,
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-6 border-2 border-teal-400">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{step.emoji}</span>
              <span className="text-xs font-black text-teal-600 tracking-wider">
                {stepIdx + 1} / {STEPS.length}
              </span>
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1.5">
              {step.title}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              {step.caption}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {STEPS.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === stepIdx ? "w-6 bg-teal-500" : "w-1.5 bg-slate-200"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={next}
                className="text-sm font-bold text-teal-600 hover:text-teal-700"
              >
                {stepIdx < STEPS.length - 1 ? "下一步 →" : "開始探索 ✨"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 跳過按鈕（永遠在右上） */}
      <button
        onClick={skip}
        className="absolute top-4 right-4 pointer-events-auto bg-white/90 hover:bg-white text-slate-700 text-sm font-bold px-4 py-2 rounded-full shadow-lg backdrop-blur"
      >
        跳過導覽
      </button>
    </div>,
    document.body
  );
}
