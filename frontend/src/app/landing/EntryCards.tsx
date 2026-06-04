"use client";

/**
 * EntryCards — three big CTA cards for the main tools.
 */

import Link from "next/link";
import { ENTRY_CARDS } from "./data";

export default function EntryCards() {
  return (
    <section className="py-12 sm:py-20 px-4 sm:px-6 bg-gradient-to-b from-white via-slate-50 to-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm tracking-[0.3em] uppercase text-slate-500 mb-2">
            Start Here
          </p>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900">
            從這裡開始
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {ENTRY_CARDS.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${c.gradient} p-6 sm:p-8 text-white shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300`}
            >
              {/* 裝飾背景圓 */}
              <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10 group-hover:scale-150 transition-transform duration-700" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5 group-hover:scale-150 transition-transform duration-700" />

              <div className="relative">
                <div className="text-5xl sm:text-6xl mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                  {c.emoji}
                </div>
                <h3 className="text-xl sm:text-2xl font-black mb-2">
                  {c.title}
                </h3>
                <p className={`text-sm sm:text-base ${c.accent} leading-relaxed mb-6 min-h-[3rem]`}>
                  {c.subtitle}
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-900 font-bold rounded-full text-sm group-hover:bg-amber-100 transition-colors">
                  {c.cta}
                  <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* 副 CTA — 開發中透明說明 */}
        <p className="text-center text-xs sm:text-sm text-slate-400 mt-8 sm:mt-10">
          💡 雲端同步 · 隨時隨地都能編輯
        </p>
      </div>
    </section>
  );
}
