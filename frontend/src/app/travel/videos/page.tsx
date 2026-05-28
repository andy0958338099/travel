'use client';

import { useState, useEffect, useRef } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Video {
  id: string;
  url: string;
  embedUrl: string;
  platform: 'youtube' | 'vimeo' | 'bilibili' | 'direct';
  title: string;
  category: string;
  addedAt: string;
}

interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

interface Member {
  id: string;
  name: string;
  color: string;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function getEmbedUrl(url: string): { embedUrl: string; platform: Video['platform'] } {
  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  if (ytMatch) {
    return {
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`,
      platform: 'youtube',
    };
  }

  // Bilibili
  const biliMatch = url.match(/bilibili\.com\/video\/(BV[\w]+)/);
  if (biliMatch) {
    return {
      embedUrl: `https://player.bilibili.com/player.html?bvid=${biliMatch[1]}&autoplay=0`,
      platform: 'bilibili',
    };
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return {
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      platform: 'vimeo',
    };
  }

  // Direct MP4/WebM
  if (url.match(/\.(mp4|webm|mov)(\?.*)?$/i)) {
    return { embedUrl: url, platform: 'direct' };
  }

  return { embedUrl: url, platform: 'direct' };
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const CATEGORIES = [
  '全部',
  '行前準備',
  '景點介紹',
  '美食推薦',
  '交通參考',
  '住宿推薦',
];

const PLATFORM_LABELS: Record<Video['platform'], string> = {
  youtube: '▶ YouTube',
  bilibili: '📺 Bilibili',
  vimeo: '🎬 Vimeo',
  direct: '🎥 直接連結',
};

// ─── Member Loader ───────────────────────────────────────────────────────────

function useMembers(): Member[] {
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('hangzhou-trip-members');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMembers(parsed);
          return;
        }
      }
    } catch {}
    // Fallback members
    setMembers([
      { id: 'm1', name: '阿喜', color: 'bg-blue-500' },
      { id: 'm2', name: '黃阿分', color: 'bg-pink-500' },
      { id: 'm3', name: '阿美', color: 'bg-green-500' },
      { id: 'm4', name: '宸瑋', color: 'bg-yellow-500' },
      { id: 'm5', name: '恩齊', color: 'bg-purple-500' },
      { id: 'm6', name: '黃倩', color: 'bg-teal-500' },
      { id: 'm7', name: '吳董', color: 'bg-red-500' },
      { id: 'm8', name: '大宇', color: 'bg-orange-500' },
      { id: 'm9', name: '小宇', color: 'bg-indigo-500' },
      { id: 'm10', name: '宇橋', color: 'bg-cyan-500' },
      { id: 'm11', name: '雅茹', color: 'bg-rose-500' },
      { id: 'm12', name: '義伸', color: 'bg-amber-500' },
    ]);
  }, []);

  return members;
}

// ─── Data Hooks ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'travel-videos';

function useVideos(): [Video[], (v: Video) => void, (id: string) => void, boolean] {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setVideos(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  const addVideo = (video: Video) => {
    setVideos((prev) => {
      const next = [video, ...prev];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const deleteVideo = (id: string) => {
    setVideos((prev) => {
      const next = prev.filter((v) => v.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      // Clean up comments
      localStorage.removeItem(`travel-video-comments-${id}`);
      return next;
    });
  };

  return [videos, addVideo, deleteVideo, loaded];
}

function useComments(videoId: string): [Comment[], (c: Comment) => void, (id: string) => void] {
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`travel-video-comments-${videoId}`);
      if (raw) setComments(JSON.parse(raw));
    } catch {}
  }, [videoId]);

  const addComment = (comment: Comment) => {
    setComments((prev) => {
      const next = [...prev, comment];
      localStorage.setItem(`travel-video-comments-${videoId}`, JSON.stringify(next));
      return next;
    });
  };

  const deleteComment = (id: string) => {
    setComments((prev) => {
      const next = prev.filter((c) => c.id !== id);
      localStorage.setItem(`travel-video-comments-${videoId}`, JSON.stringify(next));
      return next;
    });
  };

  return [comments, addComment, deleteComment];
}

// ─── Add Video Form ───────────────────────────────────────────────────────────

function AddVideoForm({
  onAdd,
  onCancel,
}: {
  onAdd: (v: Video) => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('景點介紹');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('請輸入影片網址');
      return;
    }
    const { embedUrl, platform } = getEmbedUrl(url.trim());
    if (!embedUrl) {
      setError('無法解析影片格式，請確認是 YouTube / Bilibili / Vimeo 連結');
      return;
    }
    onAdd({
      id: `vid-${Date.now()}`,
      url: url.trim(),
      embedUrl,
      platform,
      title: title.trim() || embedUrl.substring(0, 60),
      category,
      addedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">➕ 新增影片</h2>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
        >
          ×
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            影片網址 <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(''); }}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            影片標題
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="自動從網址抓取，也可自行填寫"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">分類</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.slice(1).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  category === cat
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        {error && (
          <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}
        <button
          type="submit"
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-xl transition-colors"
        >
          分享影片
        </button>
      </form>
    </div>
  );
}

// ─── Video Card ───────────────────────────────────────────────────────────────

function VideoCard({
  video,
  comments,
  members,
  onDeleteVideo,
  onDeleteComment,
  onAddComment,
}: {
  video: Video;
  comments: Comment[];
  members: Member[];
  onDeleteVideo: () => void;
  onDeleteComment: (id: string) => void;
  onAddComment: (c: Comment) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [author, setAuthor] = useState('');
  const [commentText, setCommentText] = useState('');
  const [showAuthorSelect, setShowAuthorSelect] = useState(true);
  const [adminUnlocked, setAdminUnlocked] = useState(false);

  const getMemberColor = (name: string) => {
    const m = members.find((mm) => mm.name === name);
    return m?.color ?? 'bg-gray-400';
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!author) { alert('請選擇留言者'); return; }
    if (!commentText.trim()) { alert('請填寫留言內容'); return; }
    onAddComment({
      id: `cmt-${Date.now()}`,
      author,
      text: commentText.trim(),
      createdAt: new Date().toISOString(),
    });
    setCommentText('');
  };

  const handleDeleteVideo = () => {
    if (adminUnlocked) {
      onDeleteVideo();
    } else {
      setShowDeleteConfirm(true);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className={`text-xs px-2 py-0.5 rounded-full text-white font-medium flex-shrink-0 ${
            video.category === '景點介紹' ? 'bg-green-500' :
            video.category === '美食推薦' ? 'bg-orange-500' :
            video.category === '交通參考' ? 'bg-blue-500' :
            video.category === '住宿推薦' ? 'bg-purple-500' :
            video.category === '行前準備' ? 'bg-teal-500' : 'bg-gray-500'
          }`}>
            {video.category}
          </span>
          <span className="text-xs text-gray-400">{PLATFORM_LABELS[video.platform]}</span>
          <h3 className="text-sm font-semibold text-gray-800 truncate">{video.title}</h3>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-xs text-gray-400">{comments.length}則留言</span>
          {adminUnlocked ? (
            <button
              onClick={handleDeleteVideo}
              className="text-red-500 hover:text-red-700 text-lg leading-none ml-1"
              title="刪除影片"
            >
              🗑️
            </button>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-gray-300 hover:text-red-400 text-lg leading-none ml-1"
              title="刪除影片"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* Video Player */}
      <div className="aspect-video bg-black">
        {video.platform === 'direct' ? (
          <video
            src={video.embedUrl}
            controls
            className="w-full h-full"
          />
        ) : (
          <iframe
            src={video.embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={video.title}
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 flex items-center justify-between">
        <span className="text-xs text-gray-400">{formatDate(video.addedAt)}</span>
        <button
          onClick={() => setShowComments(!showComments)}
          className={`text-sm font-medium px-4 py-1.5 rounded-full transition-colors ${
            showComments
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          💬 {showComments ? '收起留言' : `留言 (${comments.length})`}
        </button>
      </div>

      {/* Comments Panel */}
      {showComments && (
        <div className="border-t border-gray-100 px-4 py-4 bg-gray-50">
          {/* Comment List */}
          {comments.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-4">尚無留言，搶沙發！</p>
          )}
          <div className="space-y-3 mb-4">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-2">
                <div className={`w-8 h-8 rounded-full ${getMemberColor(c.author)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                  {c.author.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-gray-800">{c.author}</span>
                    <span className="text-xs text-gray-400">{formatDate(c.createdAt)}</span>
                    <button
                      onClick={() => onDeleteComment(c.id)}
                      className="text-gray-300 hover:text-red-400 text-xs ml-auto"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{c.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Add Comment Form */}
          <form onSubmit={handleAddComment} className="space-y-2">
            {showAuthorSelect ? (
              <div>
                <p className="text-xs text-gray-500 mb-1.5">選擇留言者</p>
                <div className="flex flex-wrap gap-1.5">
                  {members.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => { setAuthor(m.name); setShowAuthorSelect(false); }}
                      className={`w-8 h-8 rounded-full ${m.color} flex items-center justify-center text-white text-xs font-bold hover:scale-110 transition-transform`}
                      title={m.name}
                    >
                      {m.name.charAt(0)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full ${getMemberColor(author)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                  {author.charAt(0)}
                </div>
                <span className="text-sm font-semibold text-gray-700">{author}</span>
                <button
                  type="button"
                  onClick={() => { setAuthor(''); setShowAuthorSelect(true); }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  切換
                </button>
              </div>
            )}

            {author && (
              <div className="flex gap-2 items-end">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="寫下你的想法..."
                  rows={2}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold flex-shrink-0"
                >
                  送出
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-bold text-gray-800 mb-3">🔐 管理員驗證</h3>
            <p className="text-sm text-gray-500 mb-4">請輸入管理員密碼以刪除此影片</p>
            <input
              type="password"
              id="admin-pwd-video"
              placeholder="管理員密碼"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-red-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value;
                  if (val === 'admin') {
                    setAdminUnlocked(true);
                    setShowDeleteConfirm(false);
                    onDeleteVideo();
                  } else {
                    alert('密碼錯誤');
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={() => {
                  const input = document.getElementById('admin-pwd-video') as HTMLInputElement;
                  if (input.value === 'admin') {
                    setAdminUnlocked(true);
                    setShowDeleteConfirm(false);
                    onDeleteVideo();
                  } else {
                    alert('密碼錯誤');
                    input.value = '';
                  }
                }}
                className="flex-1 bg-red-500 text-white py-2 rounded-xl text-sm font-semibold hover:bg-red-600"
              >
                刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VideosPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeCategory, setActiveCategory] = useState('全部');
  const [videos, addVideo, deleteVideo, loaded] = useVideos();
  const members = useMembers();

  const filtered =
    activeCategory === '全部'
      ? videos
      : videos.filter((v) => v.category === activeCategory);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <a href="/travel" className="text-white/80 hover:text-white text-sm">
              ← 返回首頁
            </a>
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold mb-1">🎬 影片分享牆</h1>
              <p className="text-white/70 text-sm">推薦行程相關影片，留言供大家參考</p>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className={`px-5 py-2.5 rounded-full font-semibold text-sm transition-all ${
                showAddForm
                  ? 'bg-white/20 text-white hover:bg-white/30'
                  : 'bg-white text-indigo-600 hover:bg-indigo-50 shadow-lg'
              }`}
            >
              {showAddForm ? '× 取消' : '➕ 新增影片'}
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 mt-5 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat
                    ? 'bg-white text-indigo-600 shadow'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        {showAddForm && (
          <AddVideoForm
            onAdd={(v) => { addVideo(v); setShowAddForm(false); }}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        {/* Member Legend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 mb-6 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-xs text-gray-500 font-medium">成員：</span>
          {members.map((m) => (
            <span key={m.id} className="flex items-center gap-1.5">
              <span className={`w-5 h-5 rounded-full ${m.color} flex items-center justify-center text-white text-[10px] font-bold`}>
                {m.name.charAt(0)}
              </span>
              <span className="text-xs text-gray-600">{m.name}</span>
            </span>
          ))}
        </div>

        {/* Video Grid */}
        {!loaded ? (
          <div className="text-center py-16 text-gray-400">載入中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-4">🎬</div>
            <p>尚無影片，點擊上方「➕ 新增影片」分享第一支影片！</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {filtered.map((video) => (
              <VideoCardWithComments
                key={video.id}
                video={video}
                members={members}
                onDeleteVideo={() => deleteVideo(video.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Wrapper to hold per-video comment state
function VideoCardWithComments({
  video,
  members,
  onDeleteVideo,
}: {
  video: Video;
  members: Member[];
  onDeleteVideo: () => void;
}) {
  const [comments, addComment, deleteComment] = useComments(video.id);

  return (
    <VideoCard
      video={video}
      comments={comments}
      members={members}
      onDeleteVideo={onDeleteVideo}
      onDeleteComment={deleteComment}
      onAddComment={addComment}
    />
  );
}
