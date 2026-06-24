import { useState, useMemo } from 'react';
import type { Activity, Member, TicketType } from './types';

interface ActivityBlockProps {
  activity: Activity;
  cellSize: number;
  fontSize: number;
  members: Member[];
  onEdit: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  onResizeStart: (e: React.MouseEvent) => void;
}

export default function ActivityBlock({
  activity,
  cellSize,
  fontSize,
  members,
  onEdit,
  onDragStart,
  onResizeStart,
}: ActivityBlockProps) {
  const scaledHeight = Math.max(cellSize * activity.duration - 4, cellSize - 4);
  const hasCost = (activity.cost ?? 0) > 0;
  const [showTooltip, setShowTooltip] = useState(false);

  // 從 activity.tickets 計算已購買/未購買 — memo 避免每次 render 重算
  const ticketArray = useMemo(
    () => (Array.isArray(activity.tickets) ? activity.tickets : []),
    [activity.tickets]
  );
  const purchasedBy = useMemo(() => {
    if (ticketArray.length === 0) return [];
    const ids = new Set<string>();
    for (const t of ticketArray) for (const id of t.purchasedBy) ids.add(id);
    return members.filter(m => ids.has(m.id));
  }, [ticketArray, members]);
  const notPurchased = useMemo(
    () => members.filter(m => !purchasedBy.some(p => p.id === m.id)),
    [members, purchasedBy]
  );
  const hasTickets = ticketArray.length > 0;

  return (
    <div
      className={`
        absolute left-1 right-1 rounded-lg shadow-sm cursor-move
        ${activity.color} border-l-4 border-opacity-80
        hover:shadow-md hover:z-10 transition-shadow
      `}
      style={{ top: 0, height: scaledHeight, minHeight: cellSize }}
      onClick={(e) => { e.stopPropagation(); onEdit(); }}
      onMouseDown={(e) => { e.stopPropagation(); onDragStart(e); }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="px-2 py-1 h-full flex flex-col overflow-hidden relative">
        <div
          className="font-medium text-gray-800 truncate leading-tight"
          style={{ fontSize, lineHeight: 1.2 }}
        >
          {activity.title}
        </div>

        {/* 顯示價格（取代時間） */}
        {hasCost && (
          <div
            className="font-bold text-gray-800 mt-auto pt-1"
            style={{ fontSize: fontSize - 1, lineHeight: 1.2 }}
          >
            NT$ {activity.cost?.toLocaleString('zh-TW')}
          </div>
        )}

        {activity.notes && activity.duration >= 2 && (
          <div
            className="text-gray-600 italic text-left"
            style={{
              fontSize: fontSize - 3,
              lineHeight: 1.4,
              wordBreak: 'break-all',
              overflow: 'hidden',
            }}
          >
            {activity.notes}
          </div>
        )}

        {/* 購票狀態提示框（hover 顯示） */}
        {showTooltip && hasTickets && (
          <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border rounded-lg shadow-lg p-2 text-xs min-w-0">
            <div className="font-semibold text-gray-700 mb-1">🎫 購票狀態</div>
            {purchasedBy.length > 0 && (
              <div className="mb-1">
                <span className="text-green-600">✓ 已買：</span>
                {purchasedBy.map(m => (
                  <span key={m.id} className={`inline-block w-5 h-5 rounded-full ${m.color} text-white text-[9px] font-bold mr-0.5 mb-0.5 text-center leading-5`}>{m.name[0]}</span>
                ))}
              </div>
            )}
            {notPurchased.length > 0 && (
              <div>
                <span className="text-gray-400">✗ 未買：</span>
                {notPurchased.map(m => (
                  <span key={m.id} className={`inline-block w-5 h-5 rounded-full ${m.color} opacity-40 text-white text-[9px] font-bold mr-0.5 mb-0.5 text-center leading-5`}>{m.name[0]}</span>
                ))}
              </div>
            )}
            {purchasedBy.length === 0 && notPurchased.length > 0 && (
              <div className="text-gray-400 italic">尚無購票記錄</div>
            )}
          </div>
        )}
      </div>

      {/* Resize handle */}
      <div
        className="absolute bottom-0 left-0 right-0 h-4 cursor-s-resize flex items-center justify-center"
        onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e); }}
      >
        <div className="w-8 h-1 bg-gray-600 bg-opacity-50 rounded-full" />
      </div>
    </div>
  );
}