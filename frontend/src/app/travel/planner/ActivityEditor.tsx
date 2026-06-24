import { useState } from 'react';
import type { Activity, Member, TicketType } from './types';
import { COLORS, COST_TYPE_OPTIONS, DAYS } from './constants';

interface ActivityEditorProps {
  activity: Activity;
  members: Member[];
  onUpdate: (id: string, updates: Partial<Activity>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function ActivityEditor({
  activity,
  members,
  onUpdate,
  onDelete,
  onClose,
}: ActivityEditorProps) {
  const [title, setTitle] = useState(activity.title);
  const [notes, setNotes] = useState(activity.notes || '');
  const [duration, setDuration] = useState(activity.duration);
  const [color, setColor] = useState(activity.color);
  const [cost, setCost] = useState(activity.cost ?? 0);
  const [costType, setCostType] = useState(activity.costType || 'ticket');
  const [tickets, setTickets] = useState<TicketType[]>(
    Array.isArray(activity.tickets)
      ? activity.tickets
      : activity.tickets
      ? JSON.parse(activity.tickets as unknown as string)
      : []
  );

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
    setTickets(prev => prev.map(t => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const toggleMember = (ticketId: string, memberId: string) => {
    setTickets(prev =>
      prev.map(t => {
        if (t.id !== ticketId) return t;
        const has = t.purchasedBy.includes(memberId);
        return {
          ...t,
          purchasedBy: has
            ? t.purchasedBy.filter(id => id !== memberId)
            : [...t.purchasedBy, memberId],
        };
      })
    );
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
              {COST_TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCostType(opt.value as Activity['costType'])}
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