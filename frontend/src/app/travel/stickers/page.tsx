'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  STICKER_STYLES,
  EXPRESSION_SETS,
  buildStickerPrompt,
  loadTripMembers,
  saveTripMembers,
  loadGeneratedStickers,
  saveGeneratedStickers,
  GeneratedSticker
} from '@/utils/stickerService';

interface StickerJob {
  id: string;
  memberName: string;
  styleId: string;
  expression: string;
  prompt: string;
  status: 'pending' | 'generating' | 'done' | 'failed';
  imageUrl?: string;
  retryCount?: number;
}

type Tab = 'create' | 'preview' | 'members';

export default function StickersPage() {
  const [tab, setTab] = useState<Tab>('create');
  const [members, setMembers] = useState<string[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<string>('cute');
  const [selectedExpressions, setSelectedExpressions] = useState<string[]>([]);
  const [jobs, setJobs] = useState<StickerJob[]>([]);
  const [generatedStickers, setGeneratedStickers] = useState<GeneratedSticker[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [memberInput, setMemberInput] = useState('');
  const [activeStyleTab, setActiveStyleTab] = useState<string>('basic');
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Load members and generated stickers on mount
  useEffect(() => {
    const loaded = loadTripMembers();
    setMembers(loaded);
    if (loaded.length > 0) setSelectedMember(loaded[0]);
    setGeneratedStickers(loadGeneratedStickers());
  }, []);

  // Sync generated stickers to localStorage
  useEffect(() => {
    saveGeneratedStickers(generatedStickers);
  }, [generatedStickers]);

  // Expression set for selected style tab
  const currentExpressionSet = EXPRESSION_SETS[activeStyleTab as keyof typeof EXPRESSION_SETS];

  const toggleExpression = (exp: string) => {
    setSelectedExpressions(prev =>
      prev.includes(exp) ? prev.filter(e => e !== exp) : [...prev, exp]
    );
  };

  const selectAllExpressions = () => {
    const allExprs = currentExpressionSet?.expressions || [];
    setSelectedExpressions(prev => [...new Set([...prev, ...allExprs])]);
  };

  const clearExpressions = () => {
    // Remove expressions from current tab only
    const allExprs = currentExpressionSet?.expressions || [];
    setSelectedExpressions(prev => prev.filter(e => !allExprs.includes(e)));
  };

  const startGeneration = async () => {
    if (!selectedMember || selectedExpressions.length === 0) return;

    const newJobs: StickerJob[] = selectedExpressions.map((expression, i) => ({
      id: `job-${Date.now()}-${i}`,
      memberName: selectedMember,
      styleId: selectedStyle,
      expression,
      prompt: buildStickerPrompt(selectedMember, selectedStyle, expression),
      status: 'pending' as const
    }));

    setJobs(newJobs);
    setProgress({ done: 0, total: newJobs.length });
    setIsGenerating(true);
    processQueue(newJobs);
  };

  const processQueue = async (allJobs: StickerJob[]) => {
    const pending = allJobs.filter(j => j.status === 'pending' || j.status === 'failed');

    for (const job of pending) {
      if (!isGenerating) break;

      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'generating' as const } : j));

      try {
        const imageUrl = await generateImage(job.prompt);
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'done' as const, imageUrl } : j));
      } catch {
        const retry = (job.retryCount || 0) + 1;
        if (retry <= 2) {
          setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'pending' as const, retryCount: retry } : j));
        } else {
          setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'failed' as const } : j));
        }
      }

      setProgress(prev => ({ ...prev, done: prev.done + 1 }));
    }

    setIsGenerating(false);
  };

  // Add generated stickers to the collection
  useEffect(() => {
    const doneJobs = jobs.filter(j => j.status === 'done' && j.imageUrl);
    if (doneJobs.length === 0) return;

    const newStickers: GeneratedSticker[] = doneJobs.map(j => ({
      id: j.id,
      memberName: j.memberName,
      styleId: j.styleId,
      expression: j.expression,
      imageUrl: j.imageUrl!,
      createdAt: Date.now()
    }));

    setGeneratedStickers(prev => {
      const existing = new Set(prev.map(s => `${s.memberName}-${s.styleId}-${s.expression}`));
      const filtered = newStickers.filter(ns => !existing.has(`${ns.memberName}-${ns.styleId}-${ns.expression}`));
      return [...prev, ...filtered];
    });
  }, [jobs]);

  const downloadSticker = async (sticker: GeneratedSticker) => {
    try {
      const response = await fetch(sticker.imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sticker.memberName}_${sticker.expression}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('下載失敗，請稍後重試');
    }
  };

  const downloadAll = async () => {
    const stickers = generatedStickers.filter(s => s.memberName === selectedMember && s.styleId === selectedStyle);
    for (const sticker of stickers) {
      await downloadSticker(sticker);
      await new Promise(r => setTimeout(r, 500));
    }
  };

  const addMember = () => {
    const name = memberInput.trim();
    if (!name || members.includes(name)) return;
    const updated = [...members, name];
    setMembers(updated);
    saveTripMembers(updated);
    setMemberInput('');
    if (!selectedMember) setSelectedMember(name);
  };

  const removeMember = (name: string) => {
    const updated = members.filter(m => m !== name);
    setMembers(updated);
    saveTripMembers(updated);
    if (selectedMember === name) setSelectedMember(updated[0] || '');
  };

  const startEditMember = (name: string) => {
    setEditingMember(name);
    setEditName(name);
  };

  const saveEditMember = () => {
    if (!editingMember || !editName.trim()) return;
    if (members.includes(editName.trim()) && editName.trim() !== editingMember) {
      alert('成員名稱已存在');
      return;
    }
    const updated = members.map(m => m === editingMember ? editName.trim() : m);
    setMembers(updated);
    saveTripMembers(updated);
    if (selectedMember === editingMember) setSelectedMember(editName.trim());
    setEditingMember(null);
    setEditName('');
  };

  const _retryFailed = () => {
    const failed = jobs.filter(j => j.status === 'failed');
    if (failed.length === 0) return;
    setIsGenerating(true);
    processQueue(failed.map(j => ({ ...j, retryCount: 0 })));
  };

  const expressionCount = selectedExpressions.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/travel" className="text-gray-500 hover:text-gray-700 text-sm">← 旅遊</Link>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎨</span>
            <h1 className="text-xl font-bold text-gray-800">LINE 貼圖生成器</h1>
          </div>
        </div>
        {/* Tab bar */}
        <div className="max-w-6xl mx-auto px-4 flex border-b">
          {([['create','創作'], ['preview','預覽'], ['members','成員']] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-pink-500 text-pink-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {tab === 'create' && (
          <div className="space-y-6">
            {/* Style selector */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4">🎨 選擇風格</h2>
              <div className="grid grid-cols-4 gap-3">
                {Object.values(STICKER_STYLES).map(style => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${selectedStyle === style.id ? 'border-pink-500 bg-pink-50' : 'border-gray-100 hover:border-pink-200'}`}
                  >
                    <div className="text-3xl mb-1">{style.emoji}</div>
                    <div className="text-sm font-medium">{style.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Expression set tabs */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">😊 選擇表情（{selectedExpressions.length} 已選）</h2>
                <div className="flex gap-2">
                  <button onClick={selectAllExpressions} className="text-xs px-3 py-1 bg-pink-100 text-pink-600 rounded-full hover:bg-pink-200">全選</button>
                  <button onClick={clearExpressions} className="text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200">清除</button>
                </div>
              </div>
              {/* Expression set tabs */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {Object.values(EXPRESSION_SETS).map(set => (
                  <button
                    key={set.id}
                    onClick={() => setActiveStyleTab(set.id)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeStyleTab === set.id ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-pink-100'}`}
                  >
                    <span>{set.emoji}</span>
                    <span>{set.name}</span>
                  </button>
                ))}
              </div>
              {/* Expression grid */}
              <div className="grid grid-cols-4 gap-2">
                {currentExpressionSet?.expressions.map(exp => (
                  <button
                    key={exp}
                    onClick={() => toggleExpression(exp)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${selectedExpressions.includes(exp) ? 'bg-pink-500 text-white' : 'bg-gray-50 text-gray-700 hover:bg-pink-50'}`}
                  >
                    {exp}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary & Generate */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold mb-1">📋 生成任務</h2>
                  <p className="text-sm text-gray-500">已選擇：{selectedExpressions.length} 張表情</p>
                  {expressionCount > 0 && expressionCount < 40 && (
                    <p className="text-xs text-amber-500 mt-1">⚠️ LINE 最低需 40 張，建議再選 {40 - expressionCount} 種表情</p>
                  )}
                </div>
                {generatedStickers.length > 0 && (
                  <button onClick={downloadAll} className="px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600">
                    下載全部（{generatedStickers.length}）
                  </button>
                )}
              </div>

              {isGenerating ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">生成中...</span>
                    <span className="text-sm font-medium text-pink-600">{progress.done}/{progress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-pink-500 h-2 rounded-full transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
                  </div>
                </div>
              ) : (
                <button
                  onClick={startGeneration}
                  disabled={!selectedMember || selectedExpressions.length === 0}
                  className={`w-full py-3 rounded-xl font-bold text-base transition-colors ${!selectedMember || selectedExpressions.length === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600'}`}
                >
                  {selectedExpressions.length === 0 ? '選擇表情後開始生成' : `🚀 開始生成 ${selectedExpressions.length} 張貼圖`}
                </button>
              )}
            </div>

            {/* Generated preview */}
            {jobs.filter(j => j.status === 'done').length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-bold mb-4">✅ 生成完成</h2>
                <div className="grid grid-cols-8 gap-2">
                  {jobs.filter(j => j.status === 'done').map(job => (
                    <div key={job.id} className="relative aspect-square bg-gray-50 rounded-lg overflow-hidden">
                      <img src={job.imageUrl} alt={job.expression} className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-0.5">{job.expression}</div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">{jobs.filter(j => j.status === 'failed').length > 0 && `⚠️ ${jobs.filter(j => j.status === 'failed').length} 張生成失敗`}</p>
              </div>
            )}
          </div>
        )}

        {tab === 'preview' && (
          <div className="space-y-6">
            {/* Filter */}
            <div className="flex gap-3 items-center bg-white rounded-2xl shadow-sm p-4">
              <select
                value={selectedMember}
                onChange={e => setSelectedMember(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">全部成員</option>
                {[...new Set(generatedStickers.map(s => s.memberName))].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select
                value={selectedStyle}
                onChange={e => setSelectedStyle(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">全部風格</option>
                {Object.values(STICKER_STYLES).map(s => (
                  <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>
                ))}
              </select>
            </div>

            {/* Count */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">📸 我的貼圖收藏</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    共 {generatedStickers.length} 張
                    {selectedMember && ` · ${selectedMember}`}
                    {selectedStyle && ` · ${STICKER_STYLES[selectedStyle as keyof typeof STICKER_STYLES]?.name}`}
                  </p>
                </div>
                {generatedStickers.length >= 40 && (
                  <div className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">符合 LINE 上架標準 ✓</div>
                )}
              </div>
            </div>

            {/* Sticker grid */}
            {generatedStickers.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <div className="text-5xl mb-4">🎨</div>
                <h3 className="text-lg font-bold mb-2">還沒有生成任何貼圖</h3>
                <p className="text-sm text-gray-500">去「創作」頁面選擇風格和表情，開始製作 LINE 貼圖</p>
                <button onClick={() => setTab('create')} className="mt-4 px-6 py-2 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600">開始創作</button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="grid grid-cols-6 gap-3">
                  {generatedStickers.map(sticker => (
                    <div key={sticker.id} className="relative group">
                      <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden border hover:border-pink-300 transition-colors">
                        <img src={sticker.imageUrl} alt={sticker.expression} className="w-full h-full object-cover" />
                      </div>
                      <div className="mt-1 text-center">
                        <div className="text-xs font-medium truncate">{sticker.expression}</div>
                        <div className="text-xs text-gray-400">{sticker.memberName}</div>
                      </div>
                      <button
                        onClick={() => downloadSticker(sticker)}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="text-white text-sm">下載</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'members' && (
          <div className="space-y-6">
            {/* Add member */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4">👥 管理成員</h2>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={memberInput}
                  onChange={e => setMemberInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addMember()}
                  placeholder="輸入成員名稱"
                  className="flex-1 px-4 py-2 border rounded-lg"
                />
                <button onClick={addMember} className="px-6 py-2 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600">新增</button>
              </div>
              <p className="text-xs text-gray-400 mt-2">成員名稱將作為 AI 貼圖的角色名稱</p>
            </div>

            {/* Member list */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4">成員列表（{members.length} 人）</h2>
              <div className="space-y-2">
                {members.map(name => (
                  <div key={name} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-lg">
                      {name[0]}
                    </div>
                    {editingMember === name ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveEditMember()}
                          className="flex-1 px-3 py-1 border rounded-lg"
                          autoFocus
                        />
                        <button onClick={saveEditMember} className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm">儲存</button>
                        <button onClick={() => setEditingMember(null)} className="px-3 py-1 bg-gray-200 rounded-lg text-sm">取消</button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1">
                          <div className="font-medium">{name}</div>
                          <div className="text-xs text-gray-400">
                            {generatedStickers.filter(s => s.memberName === name).length} 張貼圖
                          </div>
                        </div>
                        <button onClick={() => startEditMember(name)} className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700">編輯</button>
                        <button onClick={() => removeMember(name)} className="px-3 py-1 text-sm text-red-400 hover:text-red-600">刪除</button>
                      </>
                    )}
                  </div>
                ))}
              </div>
              {members.length === 0 && (
                <div className="text-center py-8 text-gray-400">尚無成員，請新增</div>
              )}
            </div>

            {/* Info */}
            <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-bold mb-3">💡 LINE 貼圖小知識</h2>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• LINE 貼圖最少需 <strong>40 張</strong> 才能上架</li>
                <li>• 建議生成 40-160 張（一組）</li>
                <li>• 所有貼圖需為同一角色（同一成員）</li>
                <li>• 風格需統一（如：全部可愛風）</li>
                <li>• 圖片尺寸：370×320 px，背景透明</li>
                <li>• 生成完成後可下載並透過 LINE Creators Market 上架</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

async function generateImage(prompt: string): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_MINIMAX_API_KEY;
  const groupId = process.env.NEXT_PUBLIC_MINIMAX_GROUP_ID;

  if (!apiKey || !groupId) {
    throw new Error('Missing API key');
  }

  const response = await fetch(`https://api.minimax.io/v1/image_generation?GroupId=${encodeURIComponent(groupId)}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'stable-diffusion',
      prompt,
      aspect_ratio: '1:1',
      num_images: 1
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  if (!data.images || !data.images[0]?.url) {
    throw new Error('No image URL in response');
  }
  return data.images[0].url;
}