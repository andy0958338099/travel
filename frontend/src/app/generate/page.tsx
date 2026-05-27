"use client";
import { useState, useEffect } from "react";
import { getCharacters, getScenes, getEpisodes, generateFrame, getJobs } from "@/lib/api";

export default function GeneratePage() {
  const [characters, setCharacters] = useState<any[]>([]);
  const [scenes, setScenes] = useState<any[]>([]);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedChar, setSelectedChar] = useState("");
  const [selectedScene, setSelectedScene] = useState("");
  const [selectedEp, setSelectedEp] = useState("");
  const [prompt, setPrompt] = useState("");
  const [seed, setSeed] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    Promise.all([getCharacters(), getScenes(), getEpisodes(), getJobs()]).then(
      ([chars, scns, eps, jbs]) => {
        setCharacters(Array.isArray(chars) ? chars : []);
        setScenes(Array.isArray(scns) ? scns : []);
        setEpisodes(Array.isArray(eps) ? eps : []);
        setJobs(Array.isArray(jbs) ? jbs : []);
      }
    );
  }, []);

  const handleGenerate = async () => {
    if (!selectedChar || !selectedScene) {
      alert("請選擇角色和場景");
      return;
    }
    if (!prompt.trim()) {
      alert("請輸入提示詞");
      return;
    }

    setGenerating(true);
    setResult(null);

    try {
      const data: any = {
        character_id: parseInt(selectedChar),
        scene_id: parseInt(selectedScene),
        prompt,
      };
      if (selectedEp) data.episode_id = parseInt(selectedEp);
      if (seed) data.seed = parseInt(seed);

      const res = await generateFrame(data);
      setResult(res);
      setJobs(await getJobs());
    } catch (err) {
      setResult({ status: "error", error: String(err) });
    } finally {
      setGenerating(false);
    }
  };

  const selectedCharacter = characters.find((c: any) => c.id === parseInt(selectedChar));
  const selectedSceneData = scenes.find((s: any) => s.id === parseInt(selectedScene));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">生成漫劇</h1>
        <a href="/dashboard" className="text-blue-500 hover:underline">← 返回儀表板</a>
      </div>

      {/* Generation Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left: Form */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg space-y-4">
            <h2 className="font-bold">選擇角色與場景</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">角色</label>
                <select
                  className="w-full border p-2 rounded"
                  value={selectedChar}
                  onChange={(e) => setSelectedChar(e.target.value)}
                >
                  <option value="">-- 選擇角色 --</option>
                  {characters.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.style ? `(${c.style})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">場景</label>
                <select
                  className="w-full border p-2 rounded"
                  value={selectedScene}
                  onChange={(e) => setSelectedScene(e.target.value)}
                >
                  <option value="">-- 選擇場景 --</option>
                  {scenes.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.style ? `(${s.style})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">集數（可選）</label>
                <select
                  className="w-full border p-2 rounded"
                  value={selectedEp}
                  onChange={(e) => setSelectedEp(e.target.value)}
                >
                  <option value="">-- 選擇集數 --</option>
                  {episodes.map((ep: any) => (
                    <option key={ep.id} value={ep.id}>{ep.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Seed（可選，留空隨機）</label>
                <input
                  type="number"
                  placeholder="-1（隨機）"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  className="w-full border p-2 rounded"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h2 className="font-bold mb-2">生成提示詞</h2>
            <textarea
              className="w-full border p-2 rounded h-32"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="描述這一幕的畫面...（如：在教室裡，主角抬頭看著窗外的櫻花）」
"
            />
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="mt-3 bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 disabled:opacity-50"
            >
              {generating ? "生成中..." : "開始生成"}
            </button>
          </div>
        </div>

        {/* Right: Info */}
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-bold mb-2">選定的角色</h3>
            {selectedCharacter ? (
              <div>
                <p className="font-medium">{selectedCharacter.name}</p>
                <p className="text-sm text-gray-600">{selectedCharacter.description || "無描述"}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Style: {selectedCharacter.style || "anime"}
                  {selectedCharacter.seed && ` | Seed: ${selectedCharacter.seed}`}
                </p>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">請選擇角色</p>
            )}
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-bold mb-2">選定的場景</h3>
            {selectedSceneData ? (
              <div>
                <p className="font-medium">{selectedSceneData.name}</p>
                <p className="text-sm text-gray-600">{selectedSceneData.description || "無描述"}</p>
                <p className="text-xs text-gray-400 mt-1">Style: {selectedSceneData.style || "anime"}</p>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">請選擇場景</p>
            )}
          </div>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="mb-8 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-bold mb-2">生成結果</h3>
          <pre className="text-sm overflow-auto">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      {/* Recent Jobs */}
      <div>
        <h2 className="text-xl font-bold mb-4">最近生成任務</h2>
        <div className="space-y-2">
          {jobs.slice(0, 10).map((job: any) => (
            <div key={job.id} className="border p-3 rounded flex items-center justify-between">
              <div>
                <span className="font-medium">#{job.id}</span>
                <span className="text-gray-400 mx-2">|</span>
                <span className="text-sm">{job.character_name || "未知角色"}</span>
                <span className="text-gray-400 mx-1">×</span>
                <span className="text-sm">{job.scene_name || "未知場景"}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded ${
                  job.status === "success" ? "bg-green-200 text-green-700" :
                  job.status === "generating" ? "bg-yellow-200 text-yellow-700" :
                  job.status === "error" ? "bg-red-200 text-red-700" :
                  "bg-gray-200 text-gray-700"
                }`}>
                  {job.status}
                </span>
                <span className="text-xs text-gray-400">Seed: {job.seed}</span>
              </div>
            </div>
          ))}
        </div>
        {jobs.length === 0 && (
          <p className="text-gray-500 text-center py-4">還沒有生成任務</p>
        )}
      </div>
    </div>
  );
}
