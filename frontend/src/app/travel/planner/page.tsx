'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from '@/components/GlobalToastHost';
import Link from 'next/link';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useCloudState } from '@/utils/useCloudState';
import { createClient } from '@/utils/supabase/client';
import {
  loadActivities,
  syncActivities,
  loadMembers,
  syncMembers,
  syncCostTarget,
} from '@/utils/plannerService';

// ── Types ──────────────────────────────────────────────────────────────────
// 票種（每個活動可以有多個票種，如全票/早鳥票/優惠票）
interface TicketType {
  id: string;       // local id within the activity (e.g., "t1")
  name: string;    // e.g., "全票", "早鳥票", "優惠票"
  price: number;   // 票種價格 (TWD)
  purchasedBy: string[]; // 已購買此票種的成員 ID 清單
}

interface Activity {
  id: string;
  title: string;
  day: number;       // 1-8
  startHour: number; // 0-23 (內部用，不顯示)
  duration: number;  // 小時數（內部用）
  color: string;
  notes?: string;
  cost?: number;     // 每人花費 (TWD) — 預設參考（第一個票種價格）
  costType?: 'ticket' | 'food' | 'transport' | 'accommodation' | 'flight' | 'spot' | 'shopping'; // 費用類型，影響上方分類統計
  tickets?: TicketType[]; // 該活動的票種與購買狀態
}

interface Member {
  id: string;
  name: string;
  color: string; // 頭像背景色
}

// ── Constants ──────────────────────────────────────────────────────────────
const COLORS = [
  { name: '紅', bg: 'bg-red-400', border: 'border-red-500', text: 'text-red-900' },
  { name: '橘', bg: 'bg-orange-400', border: 'border-orange-500', text: 'text-orange-900' },
  { name: '黃', bg: 'bg-yellow-400', border: 'border-yellow-500', text: 'text-yellow-900' },
  { name: '綠', bg: 'bg-green-400', border: 'border-green-500', text: 'text-green-900' },
  { name: '青', bg: 'bg-cyan-400', border: 'border-cyan-500', text: 'text-cyan-900' },
  { name: '藍', bg: 'bg-blue-400', border: 'border-blue-500', text: 'text-blue-900' },
  { name: '紫', bg: 'bg-purple-400', border: 'border-purple-500', text: 'text-purple-900' },
  { name: '粉', bg: 'bg-pink-400', border: 'border-pink-500', text: 'text-pink-900' },
];

const HOURS = Array.from({ length: 20 }, (_, i) => i + 5); // 5:00 ~ 24:00

const DAYS = [
  { label: 'Day 1', date: '7/17' },
  { label: 'Day 2', date: '7/18' },
  { label: 'Day 3', date: '7/19' },
  { label: 'Day 4', date: '7/20' },
  { label: 'Day 5', date: '7/21' },
  { label: 'Day 6', date: '7/22' },
  { label: 'Day 7', date: '7/23' },
  { label: 'Day 8', date: '7/24' },
];

const _PRESET_PLANNER_ACTIVITIES: Activity[] = [
  { id: 'act-1',  title: '外灘夜景',       day: 1, startHour: 17, duration: 3, color: 'bg-blue-400',   cost: 0 },
  { id: 'act-2',  title: '南京東路步行街',  day: 1, startHour: 20, duration: 2, color: 'bg-orange-400',  cost: 0 },
  { id: 'act-3',  title: '海底撈火鍋',     day: 1, startHour: 22, duration: 2, color: 'bg-red-400',    cost: 500 },
  { id: 'act-4',  title: '小楊生煎',        day: 2, startHour: 8,  duration: 1, color: 'bg-yellow-400',  cost: 100 },
  { id: 'act-5',  title: '豫園',           day: 2, startHour: 9,  duration: 2, color: 'bg-green-400',   cost: 80 },
  { id: 'act-6',  title: '城隍廟',         day: 2, startHour: 12, duration: 2, color: 'bg-green-400',   cost: 0 },
  { id: 'act-7',  title: '南翔饅頭',        day: 2, startHour: 14, duration: 1, color: 'bg-orange-400',  cost: 120 },
  { id: 'act-8',  title: '西塘古鎮',        day: 2, startHour: 16, duration: 3, color: 'bg-cyan-400',   cost: 190 },
  { id: 'act-9',  title: '江南戲曲服飾',    day: 3, startHour: 8,  duration: 3, color: 'bg-purple-400', cost: 150 },
  { id: 'act-10', title: '水宴餐廳',       day: 3, startHour: 19, duration: 2, color: 'bg-orange-400',  cost: 300 },
  { id: 'act-11', title: '烏鎮東柵',        day: 3, startHour: 15, duration: 4, color: 'bg-cyan-400',   cost: 110 },
  { id: 'act-12', title: '烏鎮西柵',        day: 4, startHour: 8,  duration: 5, color: 'bg-green-400',  cost: 150 },
  { id: 'act-13', title: '白蓮塔',          day: 4, startHour: 14, duration: 2, color: 'bg-red-400',    cost: 0 },
  { id: 'act-14', title: '木心美術館',      day: 4, startHour: 16, duration: 2, color: 'bg-purple-400', cost: 20 },
  { id: 'act-15', title: '搖櫓船',          day: 4, startHour: 18, duration: 1, color: 'bg-cyan-400',  cost: 150 },
  { id: 'act-16', title: '西湖（主湖區）',  day: 5, startHour: 8,  duration: 3, color: 'bg-green-400',   cost: 0 },
  { id: 'act-17', title: '斷橋殘雪',        day: 5, startHour: 11, duration: 1, color: 'bg-blue-400',   cost: 0 },
  { id: 'act-18', title: '蘇堤',            day: 5, startHour: 13, duration: 2, color: 'bg-green-400',  cost: 0 },
  { id: 'act-19', title: '武林夜市',        day: 5, startHour: 18, duration: 3, color: 'bg-orange-400',  cost: 200 },
  { id: 'act-20', title: '河坊街',          day: 5, startHour: 21, duration: 1, color: 'bg-orange-400', cost: 300 },
  { id: 'act-21', title: '游埠豆漿',        day: 6, startHour: 6,  duration: 1, color: 'bg-yellow-400',  cost: 60 },
  { id: 'act-22', title: '宋城千古情',      day: 6, startHour: 10, duration: 5, color: 'bg-purple-400', cost: 1600 },
  { id: 'act-23', title: '馬鴻興川小館',    day: 6, startHour: 17, duration: 2, color: 'bg-orange-400', cost: 200 },
  { id: 'act-24', title: '大馬弄',          day: 7, startHour: 6,  duration: 2, color: 'bg-yellow-400',  cost: 80 },
  { id: 'act-25', title: '京杭大運河遊船',  day: 7, startHour: 10, duration: 3, color: 'bg-cyan-400',   cost: 267 },
  { id: 'act-26', title: '宮宴',            day: 7, startHour: 18, duration: 3, color: 'bg-red-400',    cost: 2500 },
  { id: 'act-27', title: '西湖（主湖區）',  day: 8, startHour: 8,  duration: 2, color: 'bg-green-400',   cost: 0 },
  { id: 'act-28', title: '龍井茶園',        day: 8, startHour: 11, duration: 2, color: 'bg-green-400',   cost: 300 },
  { id: 'act-29', title: '椒鹽醄醄火鍋',    day: 2, startHour: 18, duration: 2, color: 'bg-red-400',    cost: 150 },
];

const STORAGE_KEY = 'hangzhou-trip-planner';
const COST_STORAGE_KEY = 'hangzhou-trip-costs';
const MEMBER_STORAGE_KEY = 'hangzhou-trip-members';
const TICKET_STORAGE_KEY = 'hangzhou-trip-tickets';

// 預設成員名單（已移至 @/utils/plannerService 中的 PRESET_MEMBERS）

// Day number → display title for sync
const DAY_TITLES: Record<number, string> = {
  1: '台北 ➔ 上海',
  2: '上海 ➔ 西塘',
  3: '西塘 ➔ 烏鎮東柵',
  4: '烏鎮西柵深度一日遊',
  5: '烏鎮 ➔ 杭州西湖',
  6: '杭州宋城文化體驗',
  7: '杭州運河與宮廷晚宴',
  8: '杭州 ➔ 台北',
};

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString('zh-TW');
}

// ── BudgetSummary Component ─────────────────────────────────────────────────
interface BudgetSummaryProps {
  activities: Activity[];
  memberCount: number;
  onPersonCountChange: (n: number) => void;
}

function BudgetSummary({ activities, memberCount, onPersonCountChange }: BudgetSummaryProps) {
  const total = activities.reduce((s, a) => s + (a.cost ?? 0), 0) * memberCount;
  const perPerson = Math.round(total / memberCount);

  const byDay = DAYS.map((_, i) => {
    const day = i + 1;
    const sum = activities.filter(a => a.day === day).reduce((s, a) => s + (a.cost ?? 0), 0);
    return sum;
  });

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 mb-4">
      {/* 總覽 Bar */}
      <div className="flex flex-wrap items-center gap-6 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">參與人數</span>
          <button
            onClick={() => onPersonCountChange(Math.max(1, memberCount - 1))}
            className="w-7 h-7 rounded-full bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center"
          >−</button>
          <span className="font-bold text-emerald-700 text-lg min-w-[2ch] text-center">{memberCount}</span>
          <button
            onClick={() => onPersonCountChange(memberCount + 1)}
            className="w-7 h-7 rounded-full bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center"
          >+</button>
        </div>

        <div className="h-8 w-px bg-emerald-300 hidden sm:block" />

        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-0.5">旅程總價</div>
            <div className="text-xl font-bold text-emerald-700">NT$ {fmt(total)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-0.5">每人平均</div>
            <div className="text-xl font-bold text-teal-700">NT$ {fmt(perPerson)}</div>
          </div>
        </div>

        <div className="h-8 w-px bg-emerald-300 hidden sm:block" />

        {/* 每人各日費用 */}
        <div className="flex items-center gap-2 flex-wrap">
          {byDay.map((dayTotal, i) => (
            <div key={i} className="text-center">
              <div className="text-xs text-gray-400">{DAYS[i].label}</div>
              <div className={`text-sm font-semibold ${dayTotal > 0 ? 'text-teal-600' : 'text-gray-300'}`}>
                {dayTotal > 0 ? `NT$ ${fmt(dayTotal)}` : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 詳細分類 */}
      <div className="grid grid-cols-5 gap-2 pt-3 border-t border-emerald-200">
        {[
          { label: '🎫 門票',    costType: 'ticket',        bg: 'bg-blue-200' },
          { label: '🍜 餐飲',    costType: 'food',          bg: 'bg-orange-200' },
          { label: '🚗 交通',    costType: 'transport',    bg: 'bg-cyan-200' },
          { label: '🏨 住宿',    costType: 'accommodation', bg: 'bg-purple-200' },
          { label: '✈️ 機票',    costType: 'flight',        bg: 'bg-green-200' },
        ].map(item => {
          const related = activities.filter(a => a.costType === item.costType && (a.cost ?? 0) > 0);
          const sum = related.reduce((s, a) => s + (a.cost ?? 0), 0);
          return (
            <div key={item.label} className={`${item.bg} rounded-xl p-3 text-center border-2 border-gray-300 shadow-sm`}>
              <div className="text-xl text-gray-700 font-bold">{item.label}</div>
              <div className="font-bold text-gray-800 text-2xl">NT$ {fmt(sum)} /人</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main PlannerPage ─────────────────────────────────────────────────────────
export default function PlannerPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [history, setHistory] = useState<Activity[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ day: number; hour: number } | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  // Cloud-synced font size (10–24, default 20).
  const [fontSize, setFontSize] = useCloudState<number>(
    'hangzhou-trip-font-size',
    20
  );
  const [dragState, setDragState] = useState<{
    activity: Activity;
    mode: 'move' | 'resize';
    startX: number;
    startY: number;
    originalDay: number;
    originalHour: number;
    originalDuration: number;
  } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const cellSize = 60;
  const [members, setMembers] = useState<Member[]>([]);
  const [ticketAssignments, setTicketAssignments] = useState<Record<string, string[]>>({});
  // 成員管理 Modal
  const [showMemberManager, setShowMemberManager] = useState(false);

  // Load members from Supabase (falls back to preset if unavailable)
  useEffect(() => {
    loadMembers().then(data => {
      setMembers(data);
    });
  }, []);

  // Load ticket assignments from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(TICKET_STORAGE_KEY);
    if (saved) {
      try {
        setTicketAssignments(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Sync members to Supabase + localStorage
  useEffect(() => {
    if (members.length > 0) {
      syncMembers(members);
      localStorage.setItem(MEMBER_STORAGE_KEY, JSON.stringify(members));
    }
  }, [members]);

  // Sync ticket assignments to localStorage
  useEffect(() => {
    if (Object.keys(ticketAssignments).length > 0) {
      localStorage.setItem(TICKET_STORAGE_KEY, JSON.stringify(ticketAssignments));
    }
  }, [ticketAssignments]);

  // ⚠️ Old localStorage-based member count loading — removed.
  // Member data now comes from Supabase (via loadMembers above).
  // COST_STORAGE_KEY is kept only for personCount budget UI, not for member list.

  // 增減成員名單（根據 COST_STORAGE_KEY 中的人數來擴充或縮減）
  const handlePersonCountChange = (n: number) => {
    const target = Math.max(1, n);
    if (target > members.length) {
      // 增加成員
      const newMembers = [...members];
      for (let i = members.length + 1; i <= target; i++) {
        const colors = ['bg-blue-500','bg-pink-500','bg-green-500','bg-yellow-500','bg-purple-500','bg-red-500','bg-teal-500','bg-orange-500','bg-indigo-500'];
        newMembers.push({ id: `m${i}`, name: `成員${i}`, color: colors[(i-1) % colors.length] });
      }
      setMembers(newMembers);
    } else if (target < members.length) {
      // 移除多餘成員（從結尾移除）
      const newMembers = members.slice(0, target);
      setMembers(newMembers);
      // 同時清理ticketAssignments中該成員的紀錄
      setTicketAssignments(prev => {
        const next: Record<string, string[]> = { ...prev };
        for (const key of Object.keys(next)) {
          next[key] = next[key].filter((id: string) => newMembers.some((m: Member) => m.id === id));
        }
        return next;
      });
    }
    localStorage.setItem(COST_STORAGE_KEY, String(target));
    syncCostTarget(target);
  };

  const pushHistory = useCallback((current: Activity[]) => {
    setHistory(prev => [...prev.slice(-19), [...current]]);
  }, []);

  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const newHistory = [...prev];
      const previous = newHistory.pop()!;
      setActivities(previous);
      return newHistory;
    });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo]);

  // Load activities from Supabase (falls back to preset if unavailable)
  useEffect(() => {
    loadActivities().then(data => {
      setActivities(data);
    });
  }, []);

  // Sync activities to Supabase (its own table) + localStorage (backup).
  useEffect(() => {
    if (activities.length > 0) {
      // Sync to Supabase (async, non-blocking)
      syncActivities(activities);
      // Also write localStorage as fallback
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
      // Mirror to user_state → hangzhou-trip-itinerary so /travel and
      // /travel/journal (which read that cloud key) see planner updates.
      const plannedDays: { day: string; title: string; description: string; attractions: string[] }[] = [];
      for (let d = 1; d <= 8; d++) {
        const dayActs = activities.filter(a => a.day === d);
        if (dayActs.length > 0) {
          plannedDays.push({
            day: `D${d}`,
            title: DAY_TITLES[d] || `Day ${d}`,
            description: '',
            attractions: dayActs.map(a => a.title),
          });
        }
      }
      if (plannedDays.length > 0) {
        void createClient()
          .from('user_state')
          .upsert({
            key: 'hangzhou-trip-itinerary',
            value: plannedDays as unknown as object,
            updated_at: new Date().toISOString(),
          });
      }
    }
  }, [activities]);

  // Clamp the cloud-synced font size into the supported range.
  useEffect(() => {
    if (fontSize < 10 || fontSize > 24) setFontSize(20);
  }, [fontSize, setFontSize]);

  const getActivityAt = useCallback((day: number, hour: number): Activity | null => {
    return activities.find(
      a => a.day === day && hour >= a.startHour && hour < a.startHour + a.duration
    ) || null;
  }, [activities]);

  const isActivityStart = (day: number, hour: number): Activity | null => {
    return activities.find(a => a.day === day && a.startHour === hour) || null;
  };

  const handleCellClick = (day: number, hour: number) => {
    setSelectedCell({ day, hour });
    const existing = isActivityStart(day, hour);
    if (existing) setEditingActivity(existing);
  };
  // handleCellClick is wired up to grid cells (see the time-grid onClick)
  void handleCellClick;

  const handleAddActivity = (day: number, hour: number) => {
    const newActivity: Activity = {
      id: `act-${Date.now()}`,
      title: '新活動',
      day,
      startHour: hour,
      duration: 1,
      color: COLORS[Math.floor(Math.random() * COLORS.length)].bg,
      cost: 0,
    };
    setActivities(prev => [...prev, newActivity]);
    setEditingActivity(newActivity);
    setSelectedCell({ day, hour });
  };

  const updateActivity = useCallback((id: string, updates: Partial<Activity>) => {
    pushHistory(activities);
    setActivities(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, [activities, pushHistory]);

  const deleteActivity = (id: string) => {
    pushHistory(activities);
    setActivities(prev => prev.filter(a => a.id !== id));
    setEditingActivity(null);
    setSelectedCell(null);
  };

  const handleDragStart = (e: React.MouseEvent, activity: Activity, mode: 'move' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    setDragState({
      activity,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      originalDay: activity.day,
      originalHour: activity.startHour,
      originalDuration: activity.duration,
    });
  };

  useEffect(() => {
    if (!dragState) return;

    const onMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragState.startX;
      const _dy = e.clientY - dragState.startY;
      const colW = gridRef.current?.querySelector('[class*="flex-1 min-w-32"]')?.clientWidth ?? 120;
      const hourW = colW / HOURS.length;
      const hourDelta = Math.round(dx / hourW);

      if (dragState.mode === 'move') {
        const dayDelta = Math.round(dx / colW);
        const newDay = Math.max(1, Math.min(8, dragState.originalDay + dayDelta));
        const newHour = Math.max(5, Math.min(24 - dragState.originalDuration, dragState.originalHour + hourDelta));
        updateActivity(dragState.activity.id, { day: newDay, startHour: newHour });
      } else {
        const newDuration = Math.max(1, Math.min(8, dragState.originalDuration + hourDelta));
        updateActivity(dragState.activity.id, { duration: newDuration });
      }
    };

    const onMouseUp = () => {
      setDragState(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragState, activities, updateActivity]);

  // ── Export PDF ──────────────────────────────────────────────────────────────
  const exportPDF = async () => {
    const el = document.getElementById('planner-grid');
    if (!el) return;
    try {
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      // Capture the grid as image (html2canvas handles Chinese fonts via CSS)
      const canvas = await html2canvas(el, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const imgH = (canvas.height * pageW) / canvas.width;
      pdf.addImage(imgData, 'JPEG', 0, 0, pageW, Math.min(imgH, pageH));

      pdf.save('杭州行程規劃.pdf');
    } catch (err) {
      console.error('PDF export failed:', err);
      toast.error('PDF 匯出失敗，請重試');
    }
  };

  // 計算每日總費用
  const dayCosts = DAYS.map((_, i) => {
    const day = i + 1;
    return activities.filter(a => a.day === day).reduce((s, a) => s + (a.cost ?? 0), 0);
  });

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto mb-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <Link href="/travel" className="text-indigo-600 hover:text-indigo-800 text-sm">
            ← 杭州之旅
          </Link>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <h1 className="text-2xl font-bold text-gray-800">
            💰 行程價格規劃器
          </h1>
          <div className="flex gap-2">
            <button
              onClick={undo}
              disabled={history.length === 0}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                history.length === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-orange-500 text-white hover:bg-orange-600'
              }`}
            >
              ↩️ 復原 {history.length > 0 && `(${history.length})`}
            </button>
            <button
              onClick={exportPDF}
              className="px-3 py-1 rounded text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              📄 匯出 PDF
            </button>
            <Link
              href="/travel/postcard"
              className="px-3 py-1 rounded text-sm bg-pink-500 text-white hover:bg-pink-600 transition-colors no-underline"
            >
              🎨 圖卡生成器
            </Link>
            <button
              onClick={() => setShowMemberManager(true)}
              className="px-3 py-1 rounded text-sm bg-purple-600 text-white hover:bg-purple-700 transition-colors"
              title="管理成員名單"
            >
              👥 成員
            </button>
            <button
              onClick={() => {
                const data = {
                  activities,
                  members,
                  ticketAssignments,
                  costTarget: localStorage.getItem(COST_STORAGE_KEY) || '2',
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'hangzhou-trip-planner.json';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-3 py-1 rounded text-sm bg-teal-600 text-white hover:bg-teal-700 transition-colors"
              title="匯出行程資料"
            >
              💾 匯出
            </button>
            <label
              className="px-3 py-1 rounded text-sm bg-teal-500 text-white hover:bg-teal-600 transition-colors cursor-pointer"
              title="匯入行程資料"
            >
              📂 匯入
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    try {
                      const data = JSON.parse(ev.target?.result as string);
                      if (data.activities) {
                        setActivities(data.activities);
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.activities));
                      }
                      if (data.members) {
                        setMembers(data.members);
                        localStorage.setItem(MEMBER_STORAGE_KEY, JSON.stringify(data.members));
                      }
                      if (data.ticketAssignments) {
                        setTicketAssignments(data.ticketAssignments);
                        localStorage.setItem(TICKET_STORAGE_KEY, JSON.stringify(data.ticketAssignments));
                      }
                      if (data.costTarget) localStorage.setItem(COST_STORAGE_KEY, data.costTarget);
                      toast.success('匯入成功 ✓');
                    } catch {
                      toast.error('匯入失敗，檔案格式錯誤');
                    }
                  };
                  reader.readAsText(file);
                  e.target.value = '';
                }}
              />
            </label>
            <div className="flex items-center gap-1 ml-2">
              <span className="text-xs text-gray-500">格子大小：</span>
              <button
                onClick={() => setFontSize(f => Math.max(10, f - 1))}
                className="w-7 h-7 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold flex items-center justify-center"
              >A−</button>
              <span className="px-2 text-sm font-medium text-gray-700 min-w-[3ch] text-center">{fontSize}</span>
              <button
                onClick={() => setFontSize(f => Math.min(24, f + 1))}
                className="w-7 h-7 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold flex items-center justify-center"
              >A+</button>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          點擊格子新增活動 · 拖曳移動調整時間 · 拖曳底部邊緣調整長度 · 編輯活動設定價格
        </p>

        {/* Budget Summary */}
        <BudgetSummary activities={activities} memberCount={members.length} onPersonCountChange={(n) => {
          // 增減成員時維持名單穩定，只改變數量（不影響已選的購票狀態）
          handlePersonCountChange(n);
        }} />
      </div>

      {/* Main Grid */}
      <div id="planner-grid" className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="flex">
          {/* Time labels column (sticky left) */}
          <div className="w-16 flex-shrink-0 border-r border-gray-200 bg-gray-50 sticky left-0 z-20 shadow-sm">
            {/* Header spacer */}
            <div className="h-14 border-b bg-gray-100 flex items-center justify-center">
              <span className="text-xs text-gray-500 font-medium">時間</span>
            </div>
            {/* Hour labels */}
            <div className="relative" style={{ height: HOURS.length * cellSize }}>
              {HOURS.map(hour => (
                <div
                  key={hour}
                  className="border-b border-dashed border-gray-200 flex items-center justify-center"
                  style={{ height: cellSize }}
                >
                  <span className="text-xs text-gray-500 font-medium">
                    {hour.toString().padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Days grid */}
          <div className="flex-1 overflow-x-auto" ref={gridRef}>
            <div className="flex">
              {DAYS.map((dayObj, index) => (
                <div key={dayObj.label} className="flex-1 min-w-36 border-r last:border-r-0">
                  {/* Day header with cost */}
                  <DayHeader
                    dayObj={dayObj}
                    dayCost={dayCosts[index] * members.length}
                  />
                  {/* Hour cells */}
                  <div className="relative" style={{ height: HOURS.length * cellSize }}>
                    {HOURS.map(hour => {
                      const activityStart = isActivityStart(index + 1, hour);
                      const activityAt = getActivityAt(index + 1, hour);
                      const isSelected = selectedCell?.day === index + 1 && selectedCell?.hour === hour;

                      return (
                        <div
                          key={hour}
                          onClick={() => {
                            if (activityAt) {
                              setEditingActivity(activityAt);
                            } else {
                              handleAddActivity(index + 1, hour);
                            }
                          }}
                          className={`
                            border-b border-dashed transition-colors
                            ${activityAt ? 'cursor-pointer' : 'cursor-pointer'}
                            ${isSelected ? 'bg-blue-100' : activityAt ? '' : 'hover:bg-gray-50'}
                          `}
                          style={{ height: cellSize, position: 'relative' }}
                        >
                          {activityStart && (
                            <ActivityBlock
                              activity={activityStart}
                              cellSize={cellSize}
                              fontSize={fontSize}
                              members={members}
                              onEdit={() => setEditingActivity(activityStart)}
                              onDragStart={(e) => handleDragStart(e, activityStart, 'move')}
                              onResizeStart={(e) => handleDragStart(e, activityStart, 'resize')}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="max-w-7xl mx-auto mt-4 bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">顏色標籤</h3>
        <div className="flex flex-wrap gap-2">
          {COLORS.map(c => (
            <div key={c.name} className="flex items-center gap-1">
              <div className={`w-4 h-4 rounded ${c.bg}`} />
              <span className="text-xs text-gray-600">{c.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Editor Modal */}
      {editingActivity && (
        <ActivityEditor
          activity={editingActivity}
          members={members}
          onUpdate={updateActivity}
          onDelete={deleteActivity}
          onClose={() => setEditingActivity(null)}
        />
      )}

      {/* Member Manager Modal */}
      {showMemberManager && (
        <MemberManager
          members={members}
          onUpdate={(updated) => setMembers(updated)}
          onClose={() => setShowMemberManager(false)}
        />
      )}
    </div>
  );
}

// ── Day Header Component ────────────────────────────────────────────────────
function DayHeader({ dayObj, dayCost }: { dayObj: { label: string; date: string }; dayCost: number }) {
  return (
    <div className="h-14 border-b bg-gradient-to-r from-blue-500 to-blue-600 flex flex-col items-center justify-center">
      <span className="text-white font-semibold text-sm">{dayObj.label}</span>
      <span className="text-white/80 text-xs">{dayObj.date}</span>
      {dayCost > 0 && (
        <span className="text-white font-bold text-xs mt-0.5 bg-black/20 px-2 py-0.5 rounded-full">
          NT$ {fmt(dayCost)}
        </span>
      )}
    </div>
  );
}

// ── Activity Block Component ─────────────────────────────────────────────────
function ActivityBlock({
  activity,
  cellSize,
  fontSize,
  members,
  onEdit,
  onDragStart,
  onResizeStart,
}: {
  activity: Activity;
  cellSize: number;
  fontSize: number;
  members: Member[];
  onEdit: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  onResizeStart: (e: React.MouseEvent) => void;
}) {
  const scaledHeight = Math.max(cellSize * activity.duration - 4, cellSize - 4);
  const hasCost = (activity.cost ?? 0) > 0;
  const [showTooltip, setShowTooltip] = useState(false);

  // 從 activity.tickets 計算已購買/未購買
  const ticketArray = Array.isArray(activity.tickets) ? activity.tickets : [];
  const purchasedBy = ticketArray.length > 0
    ? members.filter(m => ticketArray.some((t: TicketType) => t.purchasedBy.includes(m.id)))
    : [];
  const notPurchased = members.filter(m => !purchasedBy.some((p: Member) => p.id === m.id));
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

// ── Activity Editor Modal ───────────────────────────────────────────────────
function ActivityEditor({
  activity,
  members,
  onUpdate,
  onDelete,
  onClose,
}: {
  activity: Activity;
  members: Member[];
  onUpdate: (id: string, updates: Partial<Activity>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(activity.title);
  const [notes, setNotes] = useState(activity.notes || '');
  const [duration, setDuration] = useState(activity.duration);
  const [color, setColor] = useState(activity.color);
  const [cost, setCost] = useState(activity.cost ?? 0);
  const [costType, setCostType] = useState(activity.costType || 'ticket');
  const [tickets, setTickets] = useState<TicketType[]>(Array.isArray(activity.tickets) ? activity.tickets : activity.tickets ? JSON.parse(activity.tickets as unknown as string) : []);

  const handleSave = () => {
    onUpdate(activity.id, { title, notes, duration, color, cost, costType, tickets });
    onClose();
  };

  const addTicket = () => {
    const id = `t${Date.now()}`;
    setTickets(prev => [...prev, { id, name: '全票', price: 0, purchasedBy: [] }]);
  };

  const removeTicket = (id: string) => {
    setTickets(prev => prev.filter(t => t.id !== id));
  };

  const updateTicket = (id: string, field: 'name' | 'price', value: string | number) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const toggleMember = (ticketId: string, memberId: string) => {
    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t;
      const has = t.purchasedBy.includes(memberId);
      return {
        ...t,
        purchasedBy: has
          ? t.purchasedBy.filter(id => id !== memberId)
          : [...t.purchasedBy, memberId],
      };
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">編輯活動</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">活動名稱</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="輸入活動名稱"
            />
          </div>

          {/* Cost Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">💰 費用類型</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'ticket',        label: '🎫 門票' },
                { value: 'food',          label: '🍜 餐飲' },
                { value: 'transport',     label: '🚗 交通' },
                { value: 'accommodation', label: '🏨 住宿' },
                { value: 'flight',        label: '✈️ 機票' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCostType(opt.value as any)}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
                    ${costType === opt.value
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-emerald-400'
                    }
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cost — 最重要 */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-emerald-700 mb-2">
              💰 每人費用（TWD）
            </label>
            <div className="flex items-center gap-3">
              <span className="text-gray-500 text-sm">NT$</span>
              <input
                type="number"
                min="0"
                step="10"
                value={cost}
                onChange={(e) => setCost(Math.max(0, parseInt(e.target.value) || 0))}
                className="flex-1 px-3 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-lg font-bold text-emerald-700"
                placeholder="0"
              />
              <span className="text-gray-500 text-sm">元 / 人</span>
            </div>
            <p className="text-xs text-emerald-600 mt-1">
              輸入 0 表示免費（如交通、住宿補助等）
            </p>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              持續時間（小時）
            </label>
            <input
              type="number"
              min="1"
              max="8"
              value={duration}
              onChange={(e) => setDuration(Math.max(1, Math.min(8, parseInt(e.target.value) || 1)))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">顏色</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button
                  key={c.name}
                  onClick={() => setColor(c.bg)}
                  className={`
                    w-8 h-8 rounded-lg ${c.bg} transition-transform
                    ${color === c.bg ? 'ring-2 ring-offset-2 ring-gray-500 scale-110' : ''}
                  `}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
              placeholder="新增備註..."
            />
          </div>

          {/* Ticket Management */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-amber-700">🎫 票種管理</label>
              <button
                onClick={addTicket}
                className="text-xs px-2 py-1 bg-amber-500 text-white rounded hover:bg-amber-600"
              >
                + 新增票種
              </button>
            </div>
            {tickets.length === 0 && (
              <p className="text-xs text-amber-600 italic">尚無票種，點「新增票種」新增</p>
            )}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {tickets.map(ticket => (
                <div key={ticket.id} className="bg-white border rounded-lg p-3">
                  {/* Ticket name + price */}
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={ticket.name}
                      onChange={e => updateTicket(ticket.id, 'name', e.target.value)}
                      className="flex-1 px-2 py-1 border rounded text-sm"
                      placeholder="票種名稱（例：全票）"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400 text-xs">NT$</span>
                      <input
                        type="number"
                        min="0"
                        value={ticket.price}
                        onChange={e => updateTicket(ticket.id, 'price', parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border rounded text-sm text-right"
                        placeholder="0"
                      />
                    </div>
                    <button
                      onClick={() => removeTicket(ticket.id)}
                      className="text-gray-400 hover:text-red-500 text-lg px-1"
                      title="刪除此票種"
                    >
                      ×
                    </button>
                  </div>
                  {/* Member toggle grid */}
                  <div className="flex flex-wrap gap-1">
                    {members.map(m => {
                      const bought = ticket.purchasedBy.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => toggleMember(ticket.id, m.id)}
                          title={`${m.name} — ${bought ? '已買 ✓' : '未買 ✗'}`}
                          className={`
                            w-8 h-8 rounded-full text-white text-xs font-bold
                            transition-all ${m.color}
                            ${bought ? 'ring-2 ring-green-500 opacity-100' : 'opacity-35'}
                          `}
                        >
                          {m.name[0]}
                        </button>
                      );
                    })}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {ticket.purchasedBy.length}/{members.length} 人已購買
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Day/Time info */}
          <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
            <div>日期：Day {activity.day}（{DAYS[activity.day - 1]?.date}）</div>
            <div>開始時間：{activity.startHour.toString().padStart(2, '0')}:00</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between p-4 border-t bg-gray-50 rounded-b-xl">
          <button
            onClick={() => onDelete(activity.id)}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            刪除
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              儲存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Member Manager Modal ───────────────────────────────────────────────────
interface MemberManagerProps {
  members: Member[];
  onUpdate: (members: Member[]) => void;
  onClose: () => void;
}

function MemberManager({ members, onUpdate, onClose }: MemberManagerProps) {
  const COLORS = [
    'bg-blue-500', 'bg-pink-500', 'bg-green-500', 'bg-yellow-500',
    'bg-purple-500', 'bg-red-500', 'bg-teal-500', 'bg-orange-500', 'bg-indigo-500',
  ];
  const [drafts, setDrafts] = useState<Member[]>([...members]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const updateDraft = (id: string, field: 'name' | 'color', value: string) => {
    setDrafts(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const addMember = () => {
    const id = `m${Date.now()}`;
    const usedColors = drafts.map(m => m.color);
    const nextColor = COLORS.find(c => !usedColors.includes(c)) ?? COLORS[0];
    setDrafts(prev => [...prev, { id, name: '', color: nextColor }]);
    setEditingId(id);
    setNewName('');
  };

  const removeMember = (id: string) => {
    setDrafts(prev => prev.filter(m => m.id !== id));
  };

  const handleSave = () => {
    const valid = drafts.map((m, i) => ({
      ...m,
      name: m.name.trim() || `成員${i + 1}`,
      color: m.color,
    }));
    onUpdate(valid);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-800">👥 成員管理</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
        </div>

        {/* Member list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {drafts.map(member => (
            <div key={member.id} className="flex items-center gap-2 border rounded-lg p-2">
              {/* Color avatar */}
              <div className={`w-9 h-9 rounded-full ${member.color} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                {member.name ? member.name[0] : '?'}
              </div>
              {/* Name input / display */}
              {editingId === member.id ? (
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onBlur={() => {
                    updateDraft(member.id, 'name', newName || member.name);
                    setEditingId(null);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      updateDraft(member.id, 'name', newName || member.name);
                      setEditingId(null);
                    }
                  }}
                  className="flex-1 px-2 py-1 border rounded text-sm"
                  placeholder="成員名稱"
                />
              ) : (
                <span
                  className="flex-1 text-sm font-medium text-gray-800 cursor-pointer hover:text-blue-600"
                  onClick={() => { setEditingId(member.id); setNewName(member.name); }}
                  title="點擊編輯"
                >
                  {member.name || <span className="text-gray-400 italic">未命名</span>}
                </span>
              )}
              {/* Color picker */}
              <div className="flex gap-1">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => updateDraft(member.id, 'color', c)}
                    className={`w-5 h-5 rounded-full ${c} ${member.color === c ? 'ring-2 ring-offset-1 ring-gray-500' : 'opacity-50'} hover:opacity-100 transition-opacity`}
                  />
                ))}
              </div>
              {/* Delete */}
              <button
                onClick={() => removeMember(member.id)}
                className="text-gray-400 hover:text-red-500 text-lg px-1"
                title="移除"
              >
                ×
              </button>
            </div>
          ))}

          {/* Add member */}
          <button
            onClick={addMember}
            className="w-full py-2 border-2 border-dashed border-blue-300 text-blue-500 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors text-sm font-medium"
          >
            + 新增成員
          </button>

          <p className="text-xs text-gray-400 text-center">點擊名字可編輯 · 點顏色可換色</p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 p-4 border-t bg-gray-50 rounded-b-xl flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">取消</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">儲存</button>
        </div>
      </div>
    </div>
  );
}