"use client";
import { useEffect, useState, type ReactNode } from "react";

interface ToastProps {
  show: boolean;
  message: string;
  /** 0 = 錯誤（紅）| 1 = 成功（綠）| 2 = 提示（藍） */
  type?: 0 | 1 | 2;
  onClose: () => void;
  autoCloseMs?: number;
}

const TYPE_STYLES: Record<0 | 1 | 2, { bg: string; icon: string }> = {
  0: { bg: "bg-red-600", icon: "✕" },
  1: { bg: "bg-emerald-600", icon: "✓" },
  2: { bg: "bg-blue-600", icon: "ℹ" },
};

/**
 * 輕量 toast — 取代原生 alert()，避免阻塞 UI
 * 用法：<Toast show={err} message={...} type={0} onClose={() => setErr('')} />
 */
export function Toast({ show, message, type = 2, onClose, autoCloseMs = 3000 }: ToastProps): ReactNode {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      if (autoCloseMs > 0) {
        const t = setTimeout(() => {
          setVisible(false);
          setTimeout(onClose, 200); // wait for fade-out
        }, autoCloseMs);
        return () => clearTimeout(t);
      }
    } else {
      setVisible(false);
    }
  }, [show, autoCloseMs, onClose]);

  if (!show) return null;
  const { bg, icon } = TYPE_STYLES[type];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] ${bg} text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 max-w-[90vw] transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <span className="font-bold">{icon}</span>
      <span className="text-sm">{message}</span>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(onClose, 200);
        }}
        className="ml-2 text-white/80 hover:text-white text-lg leading-none"
        aria-label="關閉"
      >
        ×
      </button>
    </div>
  );
}
