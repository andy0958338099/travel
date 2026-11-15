import { useState, useMemo, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Activity, Member, TicketType } from './types';
import { buildActivityDetail } from './attractionLookup';

interface ActivityBlockProps {
  activity: Activity;
  cellSize: number;
  fontSize: number;
  members: Member[];
  onEdit: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  onResizeStart: (e: React.MouseEvent) => void;
}

/** tooltip 的視窗座標（fixed 定位用） */
interface TooltipPos {
  left: number;
  top: number;
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
  const cardRef = useRef<HTMLDivElement>(null);
  const [tipPos, setTipPos] = useState<TooltipPos | null>(null);

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

  // 景點細節（票價／營業時間／特色）— 純前端顯示，不改動雲端資料
  const detail = useMemo(() => buildActivityDetail(activity), [activity]);

  // tooltip 以 portal 掛到 body，避開 planner-grid 的 overflow-hidden 裁切
  useLayoutEffect(() => {
    if (!showTooltip || !cardRef.current) {
      setTipPos(null);
      return;
    }
    const r = cardRef.current.getBoundingClientRect();
    const width = 280;
    // 優先顯示在卡片右側；右側空間不足則翻到左側
    const spaceRight = window.innerWidth - r.right;
    const left = spaceRight >= width + 16 ? r.right + 8 : Math.max(8, r.left - width - 8);
    setTipPos({ left, top: Math.min(r.top, window.innerHeight - 260) });
  }, [showTooltip]);

  const tooltipContent = (showTooltip && detail) ? (
    <div className="w-[280px] bg-white border border-gray-200 rounded-lg shadow-xl p-3 text-xs text-gray-700">
      <div className="flex items-start gap-2 mb-2">
        {detail.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={detail.image}
            alt={detail.attractionName}
            className="w-16 h-16 rounded object-cover shrink-0 border border-gray-100"
          />
        )}
        <div className="min-w-0">
          <div className="font-bold text-gray-900 text-sm leading-tight">
            {detail.attractionName}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
              🎫 {detail.ticket}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">
              🕘 {detail.hours}
            </span>
          </div>
        </div>
      </div>
      <div className="text-gray-600 leading-relaxed border-t border-gray-100 pt-2">
        {detail.highlight}
      </div>
    </div>
  ) : null;

  const ticketContent = (showTooltip && hasTickets) ? (
    <div className="w-[220px] bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-xs text-gray-700">
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
  ) : null;

  return (
    <>
      <div
        ref={cardRef}
        className={`
          absolute left-1 right-1 rounded-lg shadow-sm cursor-move
          ${activity.color} border-l-4 border-opacity-80
          hover:shadow-md hover:z-10 transition-shadow
        `}
        style={{ top: 0, height: scaledHeight, minHeight: cellSize }}
        onClick={(e) => {
          // 只有「未發生 drag」時的 click 才是真正的編輯意圖
          // — 距離門檻由 ClientPage 的 onDragStart 判斷，這裡單純 fire onEdit
          e.stopPropagation();
          onEdit();
        }}
        onMouseDown={(e) => {
          // 只 stopPropagation（避免觸發 cell 新增），不要立即啟動 drag
          // — ClientPage 用 mousemove 距離門檻判斷是否真的進入 drag
          e.stopPropagation();
          onDragStart(e);
        }}
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

          {/* 景點營業時間（常駐摘要） */}
          {detail && activity.duration >= 2 && (
            <div
              className="text-gray-700 leading-tight mt-0.5"
              style={{ fontSize: fontSize - 3, lineHeight: 1.25 }}
            >
              🕘 {detail.hours}
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
        </div>

        {/* Resize handle */}
        <div
          className="absolute bottom-0 left-0 right-0 h-4 cursor-s-resize flex items-center justify-center"
          onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e); }}
        >
          <div className="w-8 h-1 bg-gray-600 bg-opacity-50 rounded-full" />
        </div>
      </div>

      {/* 景點細節 + 購票狀態：portal 到 body，避免被 planner-grid 的 overflow-hidden 裁掉 */}
      {showTooltip && tipPos && (tooltipContent || ticketContent) && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{ left: tipPos.left, top: tipPos.top }}
        >
          {tooltipContent}
          {ticketContent && (
            <div className="mt-2">{ticketContent}</div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
