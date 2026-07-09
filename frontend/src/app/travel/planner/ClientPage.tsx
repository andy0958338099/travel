'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { toast } from '@/components/GlobalToastHost';
import Link from 'next/link';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useCloudState } from '@/utils/useCloudState';
import ShareButtons from '@/components/ShareButtons';
import { createClient } from '@/utils/supabase/client';
import {
  loadActivities,
  syncActivities,
  mirrorItineraryToUserState,
  loadMembers,
  syncMembers,
  syncCostTarget,
} from '@/utils/plannerService';
import type { Activity, Member } from './types';
import {
  COLORS,
  COST_STORAGE_KEY,
  DAY_TITLES,
  DAYS,
  HOURS,
  MEMBER_STORAGE_KEY,
  STORAGE_KEY,
  TICKET_STORAGE_KEY,
} from './constants';
import BudgetSummary from './BudgetSummary';
import DayHeader from './DayHeader';
import ActivityBlock from './ActivityBlock';
import ActivityEditor from './ActivityEditor';
import MemberManager from './MemberManager';
import SyncStatusIndicator from './SyncStatusIndicator';

const HISTORY_LIMIT = 19;

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
  // 同步最新 activities — 讓 handleAddActivity/deleteActivity 在 setActivities 後能拿到新 array 並立即 sync
  const activitiesRef = useRef<Activity[]>([]);
  useEffect(() => { activitiesRef.current = activities; }, [activities]);
  const [members, setMembers] = useState<Member[]>([]);
  const [ticketAssignments, setTicketAssignments] = useState<Record<string, string[]>>({});
  // 成員管理 Modal
  const [showMemberManager, setShowMemberManager] = useState(false);
  // 同步狀態：'idle' | 'saving' | 'saved' | 'error' — 用於手動儲存按鈕 + 反饋
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false); // 防止手動 saveToCloud 期間被 debounce 自動 sync 蓋掉狀態

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
    setHistory(prev => [...prev.slice(-(HISTORY_LIMIT)), [...current]]);
  }, []);

  // 手動立即儲存到雲端 — 不等 debounce
  // 任何 await 期間把狀態設為 'saving'，結束後設 'saved' / 'error'
  // 並自動還原為 'idle'（3 秒後）以避免 UI 一直亮著
  const saveToCloud = useCallback(async (source: string = 'manual') => {
    // 從 ref 拿最新（handleAddActivity 同步呼叫時 React state 還沒更新，
    // 但 activitiesRef.current 已被我們手動同步）
    const acts = activitiesRef.current;
    if (acts.length === 0) return;
    savingRef.current = true;
    setSyncStatus('saving');
    setSyncError(null);
    // 取消 debounce 中的自動 sync（避免兩個 sync 同時跑）
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    try {
      // localStorage 先寫一份（就算雲端失敗也不丟失）
      localStorage.setItem(STORAGE_KEY, JSON.stringify(acts));
      const [sbResult, mirrorResult] = await Promise.all([
        syncActivities(acts),
        mirrorItineraryToUserState(acts),
      ]);
      if (sbResult.ok && mirrorResult.ok) {
        setSyncStatus('saved');
        setLastSavedAt(new Date());
      } else {
        const errMsg = sbResult.error || mirrorResult.error || '未知錯誤';
        setSyncStatus('error');
        setSyncError(errMsg);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setSyncStatus('error');
      setSyncError(msg);
    } finally {
      savingRef.current = false;
    }
    // 3 秒後還原為 idle — 讓 UI 有時間顯示「✓ 已儲存」但不持續閃爍
    setTimeout(() => {
      setSyncStatus(prev => (prev === 'saving' ? prev : 'idle'));
    }, 3000);
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

  // Sync activities to Supabase (its own table) + localStorage (backup) +
  // mirror to user_state → hangzhou-trip-itinerary so /travel and /travel/journal see updates.
  // Debounce 500ms: drag/連續編輯期間不重複 upsert，最後一次靜止後才寫入
  // — 解決 drag mousemove 期間瘋狂 race upsert 問題
  useEffect(() => {
    if (activities.length === 0) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      // 手動儲存中 → 跳過自動 sync（避免狀態競爭）
      if (savingRef.current) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
      const [sbResult, mirrorResult] = await Promise.all([
        syncActivities(activities),
        mirrorItineraryToUserState(activities),
      ]);
      if (sbResult.ok && mirrorResult.ok) {
        setSyncStatus('saved');
        setLastSavedAt(new Date());
        // 3 秒後還原 idle
        setTimeout(() => setSyncStatus(prev => (prev === 'saving' ? prev : 'idle')), 3000);
      } else {
        setSyncStatus('error');
        setSyncError(sbResult.error || mirrorResult.error || '未知錯誤');
      }
    }, 500);
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
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

  const isActivityStart = useCallback((day: number, hour: number): Activity | null => {
    return activities.find(a => a.day === day && a.startHour === hour) || null;
  }, [activities]);

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
    const next = [...activitiesRef.current, newActivity];
    setActivities(next);
    activitiesRef.current = next;
    setEditingActivity(newActivity);
    setSelectedCell({ day, hour });
    // 立即 sync（不等 debounce）— 新增完就進雲端
    void saveToCloud('add');
  };

  const updateActivity = useCallback((id: string, updates: Partial<Activity>) => {
    pushHistory(activities);
    setActivities(prev => prev.map(a => (a.id === id ? { ...a, ...updates } : a)));
    // 注意：updateActivity 在編輯器 onChange 過程中會被多次呼叫（drag、ticket toggle 等）
    // 這裡只更新 React state，sync 由 saveToCloud 觸發或 debounce 自動接管，
    // 避免每次 keystroke 都打 Supabase。handleSave 會主動觸發 saveToCloud。
  }, [activities, pushHistory]);

  const deleteActivity = (id: string) => {
    pushHistory(activities);
    const next = activitiesRef.current.filter(a => a.id !== id);
    setActivities(next);
    activitiesRef.current = next;
    setEditingActivity(null);
    setSelectedCell(null);
    // 立即 sync（不等 debounce）
    void saveToCloud('delete');
  };

  const handleDragStart = (e: React.MouseEvent, activity: Activity, mode: 'move' | 'resize') => {
    // 只記錄意圖；真正的 drag 由下面的 useEffect 用距離門檻 (≥4px) 觸發
    // — 解決「想點一下打開編輯器，卻被當成 drag」誤判
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

    const dayCount = DAYS.length; // was hardcoded 8; now data-driven
    const DRAG_THRESHOLD = 4; // px — 距離小於此值視為 click，不視為 drag
    let dragActivated = false;

    const onMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // 距離門檻內不觸發任何 update — 保留原狀，讓 click 事件能 fire onEdit
      if (!dragActivated && dist < DRAG_THRESHOLD) return;

      // 第一次超過門檻才標記啟動（避免重複觸發）
      if (!dragActivated) {
        dragActivated = true;
      }

      const colW = gridRef.current?.querySelector('[class*="flex-1 min-w-32"]')?.clientWidth ?? 120;
      const hourW = colW / HOURS.length;
      const hourDelta = Math.round(dx / hourW);

      if (dragState.mode === 'move') {
        const dayDelta = Math.round(dx / colW);
        const newDay = Math.max(1, Math.min(dayCount, dragState.originalDay + dayDelta));
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

  // 計算每日總費用 — single pass O(N) (was DAYS.map × activities.filter)
  const dayCosts = useMemo(() => {
    const sums = new Array(DAYS.length).fill(0);
    for (const a of activities) {
      const idx = a.day - 1;
      if (idx >= 0 && idx < sums.length) sums[idx] += a.cost ?? 0;
    }
    return sums;
  }, [activities]);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto mb-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <Link href="/travel" className="text-red-600 hover:text-red-800 text-sm">
            ← 杭州之旅
          </Link>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <h1 className="text-2xl font-bold text-gray-800">
            💰 行程價格規劃器
          </h1>
          <ShareButtons
            title="行程價格規劃器"
            text="2026 江南水鄉八日 💰 行程價格規劃器 · 一鍵分帳 + 預算追蹤"
            variant="icon"
          />
            {/* 同步狀態指示 — 取代純文字「最後儲存」時間 */}
            <SyncStatusIndicator
              status={syncStatus}
              lastSavedAt={lastSavedAt}
              error={syncError}
            />
            {/* 手動「立即儲存到雲端」按鈕 — bypass debounce */}
            <button
              onClick={() => saveToCloud('manual')}
              disabled={syncStatus === 'saving' || activities.length === 0}
              title="立即將目前所有變更寫入 Supabase 雲端"
              className={`px-3 py-1 rounded text-sm transition-colors ${
                syncStatus === 'saving'
                  ? 'bg-blue-400 text-white cursor-wait'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {syncStatus === 'saving' ? '⏳ 儲存中…' : '💾 儲存到雲端'}
            </button>
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
              className="px-3 py-1 rounded text-sm jn-cta-secondary"
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
        <p className="text-sm text-gray-600">
          點擊格子新增活動 · 拖曳移動調整時間 · 拖曳底部邊緣調整長度 · 編輯活動設定價格
        </p>
        </div>

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
          onSave={async (_id, _updates) => {
            // 編輯器關閉前已 onUpdate → React state 更新；
            // 用 useEffect 監聽 activities 變化自動 debounce sync，
            // 但這裡要立即 sync（bypass debounce）— 編輯完就寫雲端
            await saveToCloud('edit');
          }}
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