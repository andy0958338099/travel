"use client";
import { useState, useEffect } from "react";
import { getEpisodes, createEpisode } from "@/lib/api";

export default function EpisodesPage() {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", script: "" });

  useEffect(() => {
    getEpisodes().then(setEpisodes);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const newEp = await createEpisode(form);
    setEpisodes([newEp, ...episodes]);
    setForm({ title: "", script: "" });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-gray-200 text-gray-700",
      generating: "bg-yellow-200 text-yellow-700",
      complete: "bg-green-200 text-green-700",
    };
    const labels: Record<string, string> = {
      draft: "草稿",
      generating: "生成中",
      complete: "完成",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs ${styles[status] || styles.draft}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">集數管理</h1>
        <a href="/dashboard" className="text-blue-500 hover:underline">← 返回儀表板</a>
      </div>

      <form onSubmit={handleSubmit} className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="font-bold mb-3">新增集數</h2>
        <div className="space-y-3">
          <input
            placeholder="集數標題"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border p-2 rounded"
            required
          />
          <textarea
            placeholder="腳本內容..."
            value={form.script}
            onChange={(e) => setForm({ ...form, script: e.target.value })}
            className="w-full border p-2 rounded h-32"
          />
        </div>
        <button
          type="submit"
          className="mt-3 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          新增集數
        </button>
      </form>

      <div className="space-y-4">
        {episodes.map((ep) => (
          <div key={ep.id} className="border rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-bold text-lg">{ep.title}</h3>
              {getStatusBadge(ep.status)}
            </div>
            {ep.script && (
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">{ep.script}</p>
            )}
            <p className="text-xs text-gray-400">
              {new Date(ep.created_at).toLocaleDateString("zh-TW")}
            </p>
          </div>
        ))}
      </div>

      {episodes.length === 0 && (
        <p className="text-gray-500 text-center py-8">還沒有集數，請先新增</p>
      )}
    </div>
  );
}
