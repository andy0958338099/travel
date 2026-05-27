"use client";
import { useState, useEffect } from "react";
import { getScenes, createScene, uploadSceneImage } from "@/lib/api";

export default function ScenesPage() {
  const [scenes, setScenes] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", description: "", style: "anime" });
  const [uploading, setUploading] = useState<number | null>(null);

  useEffect(() => {
    loadScenes();
  }, []);

  const loadScenes = () => {
    getScenes().then(setScenes);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const newScene = await createScene(form);
    setScenes([newScene, ...scenes]);
    setForm({ name: "", description: "", style: "anime" });
  };

  const handleFileUpload = async (sceneId: number, file: File) => {
    setUploading(sceneId);
    try {
      await uploadSceneImage(sceneId, file);
      loadScenes(); // Refresh to show new path
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">場景管理</h1>
        <a href="/dashboard" className="text-blue-500 hover:underline">← 返回儀表板</a>
      </div>

      <form onSubmit={handleSubmit} className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="font-bold mb-3">新增場景</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            placeholder="場景名稱（如：教室、臥室）"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border p-2 rounded"
            required
          />
          <input
            placeholder="描述（如：明亮的教室、窗外有櫻花）"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="border p-2 rounded"
          />
          <select
            value={form.style}
            onChange={(e) => setForm({ ...form, style: e.target.value })}
            className="border p-2 rounded"
          >
            <option value="anime">動漫風</option>
            <option value="realistic">寫實風</option>
            <option value="cyberpunk">賽博龐克</option>
            <option value="watercolor">水墨風</option>
          </select>
        </div>
        <button
          type="submit"
          className="mt-3 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          新增場景
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scenes.map((scene) => (
          <div key={scene.id} className="border rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-bold text-lg">{scene.name}</h3>
              <span className="text-xs bg-gray-200 px-2 py-1 rounded">{scene.style || "anime"}</span>
            </div>
            <p className="text-sm text-gray-600 mb-3">{scene.description || "無描述"}</p>
            {scene.background_path && (
              <p className="text-xs text-green-600 mb-2">✓ 已上傳背景</p>
            )}
            <label className="flex-1">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileUpload(scene.id, e.target.files[0]);
                  }
                }}
                disabled={uploading === scene.id}
              />
              <span className="block text-center bg-green-500 text-white px-3 py-1 rounded text-sm cursor-pointer hover:bg-green-600">
                {uploading === scene.id ? "上傳中..." : "上傳背景圖"}
              </span>
            </label>
          </div>
        ))}
      </div>

      {scenes.length === 0 && (
        <p className="text-gray-500 text-center py-8">還沒有場景，請先新增</p>
      )}
    </div>
  );
}
