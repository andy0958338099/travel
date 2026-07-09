// 同步狀態指示器 — 顯示「正在儲存 / 已儲存 X 秒前 / 離線 / 失敗」
// 給行程規劃器頂部手動儲存按鈕旁使用

import { useEffect, useState } from 'react';

interface SyncStatusIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt: Date | null;
  error: string | null;
}

export default function SyncStatusIndicator({ status, lastSavedAt, error }: SyncStatusIndicatorProps) {
  // 每秒 tick 一次，更新「X 秒前」相對時間
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // 計算相對時間
  const relTime = (() => {
    if (!lastSavedAt) return '';
    const diffSec = Math.floor((Date.now() - lastSavedAt.getTime()) / 1000);
    if (diffSec < 5) return '剛剛';
    if (diffSec < 60) return `${diffSec} 秒前`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} 分鐘前`;
    return `${Math.floor(diffSec / 3600)} 小時前`;
  })();

  if (status === 'saving') {
    return (
      <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
        <span className="animate-pulse">⏳</span> 同步中…
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span
        className="text-xs text-red-600 font-medium"
        title={error || '未知錯誤'}
      >
        ❌ 儲存失敗{error ? `（${error.slice(0, 30)}）` : ''}
      </span>
    );
  }
  if (status === 'saved' && lastSavedAt) {
    return (
      <span className="text-xs text-emerald-600 font-medium">
        ✓ 已儲存（{relTime}）
      </span>
    );
  }
  // idle：沒變更過，或 3 秒自動還原後
  if (lastSavedAt) {
    return (
      <span className="text-xs text-gray-400">
        上次儲存：{relTime}
      </span>
    );
  }
  return (
    <span className="text-xs text-gray-400">
      尚未儲存
    </span>
  );
}