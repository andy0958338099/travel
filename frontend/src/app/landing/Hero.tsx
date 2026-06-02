"use client";

/**
 * Hero — full-bleed cinematic banner with countdown.
 *
 * Mobile fallback (9:16) and desktop (21:9) use the same component.
 * Onboarding hint pill appears top-right for first-time visitors.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { TRIP } from "./data";

const HERO_WIDE = "/hero/hero-westlake-21x9.jpg";
const HERO_TALL = "/hero/hero-westlake-9x16.jpg";

export default function Hero() {
  const [mounted, setMounted] = useState(false);
  const [countdown, setCountdown] = useState({
    days: 0, hours: 0, minutes: 0, seconds: 0,
  });

  useEffect(() => {
    setMounted(true);
    const tick = () => {
      const now = Date.now();
      const target = new Date(TRIP.startDate).getTime();
      const diff = Math.max(0, target - now);
      const days = Math.floor(diff / 86_400_000);
      const hours = Math.floor((diff % 86_400_000) / 3_600_000);
      const minutes = Math.floor((diff % 3_600_000) / 60_000);
      const seconds = Math.floor((diff % 60_000) / 1000);
      setCountdown({ days, hours, minutes, seconds });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative w-full overflow-hidden bg-slate-950">
      {/* 圖片層 — desktop 21:9, mobile 9:16 */}
      <picture>
        <source media="(min-width: 768px)" srcSet={HERO_WIDE} />
        <img
          src={HERO_TALL}
          alt="杭州西湖夕照"
          className="w-full h-[70vh] min-h-[480px] max-h-[820px] object-cover"
        />
      </picture>

      {/* 暗化漸層（讓白色文字可讀） */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/70" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />

      {/* 內容 */}
      <div className="absolute inset-0 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
          <div className="max-w-2xl text-white">
            <p className={`text-xs sm:text-sm tracking-[0.3em] uppercase text-amber-200/90 mb-3 sm:mb-4 transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              Hangzhou · 2026 Summer
            </p>
            <h1 className={`text-3xl sm:text-5xl md:text-6xl font-black leading-tight mb-3 sm:mb-4 transition-all duration-1000 delay-150 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              Brian & Mana
              <br />
              <span className="bg-gradient-to-r from-amber-200 via-rose-200 to-pink-200 bg-clip-text text-transparent">
                杭州 8 日之旅
              </span>
            </h1>
            <p className={`text-sm sm:text-base md:text-lg text-white/80 mb-6 sm:mb-8 transition-all duration-1000 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              2026 / 7 / 17 – 7 / 24 · {TRIP.days} 天 {TRIP.nights} 夜 ·{" "}
              {TRIP.cities.join(" → ")}
            </p>

            {/* 倒數 */}
            <div className={`grid grid-cols-4 gap-2 sm:gap-3 max-w-md mb-6 sm:mb-8 transition-all duration-1000 delay-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              {[
                { v: countdown.days, l: "Days" },
                { v: countdown.hours, l: "Hours" },
                { v: countdown.minutes, l: "Min" },
                { v: countdown.seconds, l: "Sec" },
              ].map((u) => (
                <div key={u.l} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-2 py-3 sm:py-4 text-center">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-black tabular-nums">
                    {String(u.v).padStart(2, "0")}
                  </div>
                  <div className="text-[10px] sm:text-xs uppercase tracking-widest text-white/70 mt-1">
                    {u.l}
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className={`flex flex-col sm:flex-row gap-3 transition-all duration-1000 delay-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <Link
                href="/travel"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-900 font-bold rounded-full hover:bg-amber-100 transition-all shadow-2xl"
              >
                探索行程
                <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <Link
                href="#journey"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-md border border-white/30 text-white font-bold rounded-full hover:bg-white/20 transition-all"
              >
                查看 8 天路線
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 底部裝飾 — 漸層到白色 */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-b from-transparent to-white" />
    </section>
  );
}
