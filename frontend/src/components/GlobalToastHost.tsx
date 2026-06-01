"use client";
import { useEffect, useState, type ReactNode } from "react";

type ToastType = 0 | 1 | 2; // 0=error 1=success 2=info

interface ToastEntry {
  id: number;
  message: string;
  type: ToastType;
}

const TYPE_STYLES: Record<ToastType, { bg: string; icon: string }> = {
  0: { bg: "bg-red-600", icon: "✕" },
  1: { bg: "bg-emerald-600", icon: "✓" },
  2: { bg: "bg-blue-600", icon: "ℹ" },
};

let pushFn: ((msg: string, type: ToastType) => void) | null = null;
let counter = 0;

/** 全域呼叫 — 任何模組都能用，不需 props drilling */
export const toast = {
  error: (msg: string) => pushFn?.(msg, 0),
  success: (msg: string) => pushFn?.(msg, 1),
  info: (msg: string) => pushFn?.(msg, 2),
};

/**
 * 掛在 root layout 旁 — 管理全域 toast 佇列
 * 取代原生 alert()，非阻塞、自動消失、可堆疊
 */
export function GlobalToastHost(): ReactNode {
  const [items, setItems] = useState<ToastEntry[]>([]);

  useEffect(() => {
    pushFn = (message, type) => {
      const id = ++counter;
      setItems((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    };
    return () => {
      pushFn = null;
    };
  }, []);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 max-w-[90vw] pointer-events-none">
      {items.map((t) => {
        const { bg, icon } = TYPE_STYLES[t.type];
        return (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className={`${bg} text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 pointer-events-auto animate-[fadeIn_0.2s_ease-out]`}
          >
            <span className="font-bold">{icon}</span>
            <span className="text-sm">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
