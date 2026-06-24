import { useState } from 'react';
import type { Member, MemberManagerProps } from './types';
import { MEMBER_COLORS } from './constants';

export default function MemberManager({ members, onUpdate, onClose }: MemberManagerProps) {
  const [drafts, setDrafts] = useState<Member[]>([...members]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const updateDraft = (id: string, field: 'name' | 'color', value: string) => {
    setDrafts(prev => prev.map(m => (m.id === id ? { ...m, [field]: value } : m)));
  };

  const addMember = () => {
    const id = `m${Date.now()}`;
    const usedColors = drafts.map(m => m.color);
    const nextColor = MEMBER_COLORS.find(c => !usedColors.includes(c)) ?? MEMBER_COLORS[0];
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
                {MEMBER_COLORS.map(c => (
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