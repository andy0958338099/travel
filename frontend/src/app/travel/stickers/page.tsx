'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  STICKER_STYLES,
  EXPRESSION_SETS,
  buildStickerPrompt,
  loadTripMembers,
  saveTripMembers,
  loadGeneratedStickers,
  saveGeneratedStickers,
  uploadMemberPhoto,
  deleteMemberPhoto,
  generateStickerImage,
  TripMember,
  GeneratedSticker
} from '@/utils/stickerService';

interface StickerJob {
  id: string;
  memberName: string;
  styleId: string;
  expression: string;
  prompt: string;
  photoUrl?: string;
  status: 'pending' | 'generating' | 'done' | 'failed';
  imageUrl?: string;
  retryCount?: number;
}

type Tab = 'create' | 'preview' | 'members';

export default function StickersPage() {
  const [tab, setTab] = useState<Tab>('create');
  const [members, setMembers] = useState<TripMember[]>([]);
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
  const [uploadingMember, setUploadingMember] = useState<string | null>(null);
  const [uploadingPhotoIdx, setUploadingPhotoIdx] = useState<number | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Load members and generated stickers on mount
  useEffect(() => {
    const loaded = loadTripMembers();
    setMembers(loaded);
    if (loaded.length > 0) setSelectedMember(loaded[0].name);
    setGeneratedStickers(loadGeneratedStickers());
  }, []);

  // Sync generated stickers to localStorage
  useEffect(() => {
    saveGeneratedStickers(generatedStickers);
  }, [generatedStickers]);

  const currentMember = members.find(m => m.name === selectedMember);
  const currentExpressionSet = EXPRESSION_SETS[activeStyleTab as keyof typeof EXPRESSION_SETS];

  const toggleExpression = (exp: string) => {
    setSelectedExpressions(prev =>
      prev.includes(exp) ? prev.filter(e => e !== exp) : [...prev, exp]
    );
  };

  const selectAllExpressions = () => {
    const allExprs = currentExpressionSet?.expressions || [];
    setSelectedExpressions(prev => Array.from(new Set([...prev, ...allExprs])));
  };

  const clearExpressions = () => {
    const allExprs = currentExpressionSet?.expressions || [];
    setSelectedExpressions(prev => prev.filter(e => !allExprs.includes(e)));
  };

  const startGeneration = async () => {
    if (!selectedMember || selectedExpressions.length === 0) return;

    const photoUrl = currentMember?.photo?.url;
    const newJobs: StickerJob[] = selectedExpressions.map((expression, i) => ({
      id: `job-${Date.now()}-${i}`,
      memberName: selectedMember,
      styleId: selectedStyle,
      expression,
      prompt: buildStickerPrompt(selectedMember, selectedStyle, expression),
      photoUrl,
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
        const imageUrl = await generateStickerImage(job.prompt, job.photoUrl);
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
    if (!name || members.some(m => m.name === name)) return;
    const updated = [...members, { name }];
    setMembers(updated);
    saveTripMembers(updated);
    setMemberInput('');
    if (!selectedMember) setSelectedMember(name);
  };

  const removeMember = (name: string) => {
    const member = members.find(m => m.name === name);
    if (member?.photo?.filename) {
      deleteMemberPhoto(member.photo.filename).catch(console.warn);
    }
    const updated = members.filter(m => m.name !== name);
    setMembers(updated);
    saveTripMembers(updated);
    if (selectedMember === name) setSelectedMember(updated[0]?.name || '');
  };

  const startEditMember = (name: string) => {
    setEditingMember(name);
    setEditName(name);
  };

  const saveEditMember = () => {
    if (!editingMember || !editName.trim()) return;
    if (members.some(m => m.name === editName.trim() && m.name !== editingMember)) {
      alert('成員名稱已存在');
      return;
    }
    const updated = members.map(m => m.name === editingMember ? { ...m, name: editName.trim() } : m);
    setMembers(updated);
    saveTripMembers(updated);
    if (selectedMember === editingMember) setSelectedMember(editName.trim());
    setEditingMember(null);
    setEditName('');
  };

  const handlePhotoUpload = async (memberName: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('請上傳圖片檔案');
      return;
    }
    setUploadingPhotoIdx(members.findIndex(m => m.name === memberName));
    try {
      const photo = await uploadMemberPhoto(memberName, file);
      const updated = members.map(m => m.name === memberName ? { ...m, photo } : m);
      setMembers(updated);
      saveTripMembers(updated);
    } catch (err: unknown) {
      alert(`上傳失敗：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUploadingPhotoIdx(null);
    }
  };

  const handleDeletePhoto = async (memberName: string) => {
    const member = members.find(m => m.name === memberName);
    if (!member?.photo) return;
    await deleteMemberPhoto(member.photo.filename);
    const updated = members.map(m => m.name === memberName ? { ...m, photo: undefined } : m);
    setMembers(updated);
    saveTripMembers(updated);
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
            {/* Member + Photo selector */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4">👤 選擇成員</h2>
              <div className="flex gap-3 flex-wrap">
                {members.map(m => (
                  <button
                    key={m.name}
                    onClick={() => setSelectedMember(m.name)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${
                      selectedMember === m.name
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-100 hover:border-pink-200'
                    }`}
                  >
                    {m.photo ? (
                      <img src={m.photo.url} alt={m.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">👤</div>
                    )}
                    <span className="font-medium text-sm">{m.name}</span>
                  </button>
                ))}
              </div>
              {currentMember?.photo && (
                <div className="mt-3 flex items-center gap-3">
                  <img src={currentMember.photo.url} alt="reference" className="w-20 h-20 rounded-xl object-cover border" />
                  <div>
                    <p className="text-sm text-gray-500">參考照片（用於保持角色一致性）</p>
                    <p className="text-xs text-gray-400">MiniMax 會以這张照片為基礎生成貼圖</p>
                  </div>
                </div>
              )}
              {currentMember && !currentMember.photo && (
                <p className="mt-3 text-sm text-amber-500">⚠️ 建議上傳成員照片，这样生成的贴图会更像本人</p>
              )}
            </div>

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
            <div className="flex gap-3 items-center bg-white rounded-2xl shadow-sm p-4">
              <select
                value={selectedMember}
                onChange={e => setSelectedMember(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">全部成員</option>
                {members.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
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

            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">📸 我的貼圖收藏</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    共 {generatedStickers.length} 張
                    {selectedMember && ` · ${selectedMember}`}
                  </p>
                </div>
              </div>

              {generatedStickers.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-5xl mb-3">🎨</div>
                  <p>還沒有生成的貼圖</p>
                  <p className="text-sm">去創作頁面選擇表情開始生成吧！</p>
                </div>
              ) : (
                <div className="grid grid-cols-8 gap-3 mt-4">
                  {generatedStickers
                    .filter(s => !selectedMember || s.memberName === selectedMember)
                    .filter(s => !selectedStyle || s.styleId === selectedStyle)
                    .map(sticker => (
                      <div key={sticker.id} className="relative group aspect-square bg-gray-50 rounded-xl overflow-hidden cursor-pointer" onClick={() => downloadSticker(sticker)}>
                        <img src={sticker.imageUrl} alt={sticker.expression} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                          <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-medium">下載</span>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-0.5 truncate">{sticker.expression}</div>
                      </div>
                    ))}
                </div>
              )}
            </div>
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
                  className="flex-1 px-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
                <button onClick={addMember} className="px-6 py-2 bg-pink-500 text-white rounded-xl text-sm font-medium hover:bg-pink-600">
                  新增
                </button>
              </div>
            </div>

            {/* Member list */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4">成員列表（{members.length} 人）</h2>
              <div className="space-y-4">
                {members.map((member, idx) => (
                  <div key={member.name} className="flex items-center gap-4 p-4 border rounded-xl">
                    {/* Photo */}
                    <div className="flex-shrink-0">
                      {member.photo ? (
                        <div className="relative">
                          <img src={member.photo.url} alt={member.name} className="w-16 h-16 rounded-xl object-cover" />
                          <button
                            onClick={() => handleDeletePhoto(member.name)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                            title="刪除照片"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">👤</div>
                      )}
                    </div>

                    {/* Name */}
                    <div className="flex-1">
                      {editingMember === member.name ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && saveEditMember()}
                            className="px-3 py-1 border rounded-lg text-sm"
                            autoFocus
                          />
                          <button onClick={saveEditMember} className="px-3 py-1 bg-pink-500 text-white rounded-lg text-xs">儲存</button>
                          <button onClick={() => setEditingMember(null)} className="px-3 py-1 bg-gray-200 rounded-lg text-xs">取消</button>
                        </div>
                      ) : (
                        <p className="font-bold text-lg">{member.name}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        ref={el => { fileInputRefs.current[member.name] = el; }}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoUpload(member.name, file);
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRefs.current[member.name]?.click()}
                        disabled={uploadingPhotoIdx === idx}
                        className="px-4 py-2 bg-pink-100 text-pink-600 rounded-lg text-xs font-medium hover:bg-pink-200 disabled:opacity-50"
                      >
                        {uploadingPhotoIdx === idx ? '上傳中...' : (member.photo ? '更換照片' : '上傳照片')}
                      </button>
                      <button onClick={() => startEditMember(member.name)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200">編輯</button>
                      <button onClick={() => removeMember(member.name)} className="px-4 py-2 bg-red-50 text-red-500 rounded-lg text-xs font-medium hover:bg-red-100">刪除</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div className="bg-blue-50 rounded-2xl p-6">
              <h3 className="font-bold text-blue-800 mb-2">💡 LINE 貼圖小知識</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• LINE 貼圖最少需要 40 張，建议一次做一套（8 種表情 × 8 種風格 = 64 張）</li>
                <li>• 上傳成員照片可以大幅提升角色一致性，生成更像本人的貼圖</li>
                <li>• 建議選擇「可愛風」或「動漫風」，人物會更一致、更可爱</li>
                <li>• 生成完成後可在預覽頁面下載，再透過 LINE Creator Market 上架</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Polyfill Array.from for Set spread (ES2017 target handles this, but keep for safety)
function arrayFromSet<T>(set: Set<T>): T[] {
  return Array.from(set);
}