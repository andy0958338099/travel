"use client";

/**
 * JourneyTimeline — 8-day itinerary timeline.
 *
 * Each day is a clickable card; clicking expands to show
 * attractions + a short description. Default = first 3 days expanded.
 */

import { useState } from "react";
import { DAYS } from "./data";

export default function JourneyTimeline() {
  const [open, setOpen] = useState<Set<string>>(new Set(["D1", "D2", "D3"]));

  const toggle = (day: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  return (
    <section id="journey" className="py-12 sm:py-20 px-4 sm:px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10 sm:mb-14">
          <p className="text-xs sm:text-sm tracking-[0.3em] uppercase text-teal-600 mb-2">
            The Journey
          </p>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900">
            8 天，4 座城市，<br className="sm:hidden" />
            一段慢慢走的故事
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-3 max-w-2xl mx-auto">
            從外灘的霓虹、到西塘的煙雨、再到西湖的夕陽——<br className="hidden sm:inline" />
            點任一天看那天的主角景點。
          </p>
        </div>

        {/* 時間軸 */}
        <div className="relative">
          {/* 中央線（桌面） */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-teal-200 via-pink-200 to-amber-200 -translate-x-0.5" />

          <div className="space-y-4 sm:space-y-6">
            {DAYS.map((d, idx) => {
              const isOpen = open.has(d.day);
              const isLeft = idx % 2 === 0;
              return (
                <div
                  key={d.day}
                  className={`md:grid md:grid-cols-2 md:gap-8 items-center ${isLeft ? "" : "md:grid-flow-dense"}`}
                >
                  {/* 卡片 */}
                  <div
                    className={`${isLeft ? "" : "md:col-start-2"}`}
                  >
                    <button
                      onClick={() => toggle(d.day)}
                      className="group w-full text-left bg-white border-2 border-slate-200 hover:border-teal-400 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-teal-50 to-cyan-100 flex items-center justify-center text-2xl sm:text-3xl group-hover:scale-110 transition-transform">
                          {d.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-black text-teal-600 tracking-wider">
                              {d.day}
                            </span>
                            <span className="text-xs text-slate-400">
                              {d.date}
                            </span>
                          </div>
                          <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                            {d.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-600 mt-1.5">
                            {d.short}
                          </p>

                          {/* 展開區 */}
                          {isOpen && (
                            <div className="mt-3 pt-3 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1.5">
                                主要景點
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {d.spots.map((s) => (
                                  <span
                                    key={s}
                                    className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full"
                                  >
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <span
                          className={`flex-shrink-0 text-slate-400 transition-transform text-lg ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        >
                          ▾
                        </span>
                      </div>
                    </button>
                  </div>

                  {/* 時間軸節點（桌面） */}
                  <div className="hidden md:flex md:col-start-2 md:row-start-1 items-center justify-center">
                    {isLeft ? null : (
                      <div className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-4 border-teal-500 shadow" />
                    )}
                  </div>
                  {isLeft ? (
                    <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-4 border-pink-500 shadow" />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
