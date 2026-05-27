"use client";
import { useState, useEffect } from "react";
import {
  generateMVConcept,
  getMVConcept,
  exportMVConcept,
  Character,
  getAllReferenceImages,
  PortfolioImage,
} from "@/lib/api";

interface MVScene {
  id: number;
  scene_number: number;
  lyric_segment: string;
  visual_prompt: string;
  camera_movement: string;
  mood: string;
  subject: string;
  background: string;
  atmosphere: string;
  character_ids: number[];
  duration_hint: string;
  seeddance_prompt: string;
}

interface MVConcept {
  id: number;
  song_id: number;
  title: string;
  global_style: string;
  visual_palette: string;
  aspect_ratio: string;
  duration_estimate: string;
  character_configs: any[];
  status: string;
  scenes: MVScene[];
  available_characters?: Character[];
  song?: any;
}

interface MVConceptModalProps {
  songId: number;
  songTitle: string;
  onClose: () => void;
}

const VISUAL_STYLES = [
  { value: "Cinematic real footage", label: "電影寫實風格" },
  { value: "Anime cel-shaded", label: "動漫厚塗風格" },
  { value: "Cyberpunk neon", label: "賽博龐克霓虹" },
  { value: "Vintage film grain", label: "復古膠卷顆粒" },
  { value: "Soft pastel dream", label: "柔和水彩夢幻" },
  { value: "Noir black and white", label: "黑白 Noir" },
  { value: "Retro 90s MTV", label: "90年代 MTV 風格" },
  { value: "Gothic dark fantasy", label: "哥德式暗黑奇幻" },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function MVConceptModal({ songId, songTitle, onClose }: MVConceptModalProps) {
  const [mvConcept, setMVConcept] = useState<MVConcept | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedCharIds, setSelectedCharIds] = useState<number[]>([]);
  const [visualStyle, setVisualStyle] = useState("Cinematic real footage");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [expandedScenes, setExpandedScenes] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<"scenes" | "export" | "references">("scenes");
  const [exportContent, setExportContent] = useState("");
  const [referenceImages, setReferenceImages] = useState<PortfolioImage[]>([]);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [droppedPath, setDroppedPath] = useState<string | null>(null);

  useEffect(() => {
    loadMVConcept();
    loadReferenceImages();
  }, [songId]);

  useEffect(() => {
    // Load reference images when switching to references tab
    if (activeTab === "references") {
      loadReferenceImages();
    }
  }, [activeTab]);

  const loadMVConcept = async () => {
    try {
      const data = await getMVConcept(songId);
      if (data.exists === false) {
        setMVConcept(null);
      } else {
        setMVConcept(data);
        if (data.available_characters) {
          // Pre-select characters from character_configs
          const preSelected = data.character_configs?.map((c: any) => c.id) || [];
          setSelectedCharIds(preSelected);
        }
      }
    } catch (error) {
      console.error("Failed to load MV concept:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadReferenceImages = async () => {
    try {
      const data = await getAllReferenceImages();
      setReferenceImages(data.images || []);
    } catch (error) {
      console.error("Failed to load reference images:", error);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const data = await generateMVConcept(songId, {
        character_ids: selectedCharIds,
        visual_style: visualStyle,
        aspect_ratio: aspectRatio,
      });
      setMVConcept(data);
      setSelectedCharIds(data.character_configs?.map((c: any) => c.id) || []);
    } catch (error) {
      console.error("Failed to generate MV concept:", error);
      alert("生成失敗，請稍後再試");
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async (format: "json" | "markdown") => {
    if (!mvConcept) return;
    try {
      const data = await exportMVConcept(mvConcept.id, format);
      setExportContent(data.content);
      setActiveTab("export");
    } catch (error) {
      console.error("Failed to export:", error);
    }
  };

  const toggleScene = (sceneNum: number) => {
    const newExpanded = new Set(expandedScenes);
    if (newExpanded.has(sceneNum)) {
      newExpanded.delete(sceneNum);
    } else {
      newExpanded.add(sceneNum);
    }
    setExpandedScenes(newExpanded);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("已複製到剪貼簿");
  };

  const getCharacterName = (charId: number): string => {
    if (!mvConcept?.available_characters) return `角色 ${charId}`;
    const char = mvConcept.available_characters.find((c) => c.id === charId);
    return char?.name || `角色 ${charId}`;
  };

  const copyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const getImageUrl = (path: string) => {
    if (!path) return "/placeholder.png";
    if (path.startsWith("/") || path.startsWith("\\")) {
      return `file://${path}`;
    }
    if (path.startsWith("http")) {
      return path;
    }
    return path;
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add("border-purple-400", "bg-purple-50");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("border-purple-400", "bg-purple-50");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove("border-purple-400", "bg-purple-50");
    const path = e.dataTransfer.getData("text/plain");
    if (path) {
      setDroppedPath(path);
      navigator.clipboard.writeText(path);
      setTimeout(() => setDroppedPath(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold">MV 腳本生成器</h2>
            <p className="text-gray-500 mt-1">{songTitle}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            </div>
          ) : !mvConcept ? (
            /* Generation Form */
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Visual Style */}
              <div>
                <label className="block text-sm font-medium mb-2">視覺風格</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {VISUAL_STYLES.map((style) => (
                    <button
                      key={style.value}
                      onClick={() => setVisualStyle(style.value)}
                      className={`p-3 rounded-lg border text-sm transition-all ${
                        visualStyle === style.value
                          ? "border-purple-500 bg-purple-50 text-purple-700"
                          : "border-gray-200 hover:border-purple-300"
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio */}
              <div>
                <label className="block text-sm font-medium mb-2">比例</label>
                <div className="flex gap-2">
                  {["16:9", "9:16", "1:1", "4:3"].map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => setAspectRatio(ratio)}
                      className={`px-4 py-2 rounded-lg border text-sm ${
                        aspectRatio === ratio
                          ? "border-purple-500 bg-purple-50 text-purple-700"
                          : "border-gray-200 hover:border-purple-300"
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              {/* Character Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">選擇角色（可多選）</label>
                <p className="text-xs text-gray-500 mb-3">選擇將在 MV 中出現的角色</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(mvConcept as unknown as MVConcept)?.available_characters?.map((char) => (
                    <button
                      key={char.id}
                      onClick={() => {
                        setSelectedCharIds((prev) =>
                          prev.includes(char.id)
                            ? prev.filter((id) => id !== char.id)
                            : [...prev, char.id]
                        );
                      }}
                      className={`p-3 rounded-lg border text-sm transition-all flex items-center gap-2 ${
                        selectedCharIds.includes(char.id)
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-gray-200 hover:border-green-300"
                      }`}
                    >
                      <span>{selectedCharIds.includes(char.id) ? "✓" : ""}</span>
                      <span className="truncate">{char.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">📝 生成說明</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 系統將根據歌詞自動拆解為 10-20 個場景</li>
                  <li>• 每個場景包含獨立的 SeedDance prompt</li>
                  <li>• 維持角色一致性與視覺風格統一</li>
                  <li>• 可匯出為 JSON 或 Markdown 格式</li>
                </ul>
              </div>
            </div>
          ) : (
            /* MV Concept View */
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Tabs */}
              <div className="flex border-b">
                <button
                  onClick={() => setActiveTab("scenes")}
                  className={`px-6 py-3 text-sm font-medium border-b-2 ${
                    activeTab === "scenes"
                      ? "border-purple-500 text-purple-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  場景腳本 ({mvConcept.scenes?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab("references")}
                  className={`px-6 py-3 text-sm font-medium border-b-2 flex items-center gap-2 ${
                    activeTab === "references"
                      ? "border-purple-500 text-purple-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  📷 參考圖
                  {referenceImages.length > 0 && (
                    <span className="bg-yellow-400 text-yellow-900 text-xs px-1.5 py-0.5 rounded-full">
                      {referenceImages.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("export")}
                  className={`px-6 py-3 text-sm font-medium border-b-2 ${
                    activeTab === "export"
                      ? "border-purple-500 text-purple-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  匯出
                </button>
              </div>

              {activeTab === "scenes" ? (
                <div className="flex-1 overflow-y-auto p-6">
                  {/* Global Style */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 mb-6">
                    <h3 className="font-medium text-purple-800 mb-2">全域風格設定</h3>
                    <p className="text-sm text-purple-700 mb-2">{mvConcept.global_style}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded">
                        {mvConcept.visual_palette}
                      </span>
                      <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded">
                        {mvConcept.aspect_ratio}
                      </span>
                      <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded">
                        {mvConcept.duration_estimate}
                      </span>
                    </div>
                  </div>

                  {/* Reference Images Quick Access */}
                  {referenceImages.length > 0 && (
                    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                        ⭐ 參考圖片（拖曳到場景使用）
                      </h4>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {referenceImages.slice(0, 10).map((img) => (
                          <div
                            key={img.id}
                            className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 border-yellow-300 cursor-pointer relative group"
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/plain", img.image_path);
                            }}
                            onClick={() => copyPath(img.image_path)}
                            title={`點擊複製：${img.image_path}`}
                          >
                            <img
                              src={getImageUrl(img.image_path)}
                              alt={img.character_name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                              <span className="text-white text-xs opacity-0 group-hover:opacity-100">
                                {copiedPath === img.image_path ? "✓" : "📋"}
                              </span>
                            </div>
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                              <p className="text-white text-[8px] truncate">
                                {img.character_name}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-yellow-700 mt-2">
                        💡 可拖曳圖片到外部應用（如 SeedDance），或點擊複製路徑
                      </p>
                    </div>
                  )}

                  {/* Character Configs */}
                  {mvConcept.character_configs && mvConcept.character_configs.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-medium mb-3">角色設定</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {mvConcept.character_configs.map((config: any, idx: number) => (
                          <div key={idx} className="bg-gray-50 rounded-lg p-3">
                            <div className="font-medium">{config.name}</div>
                            <div className="text-xs text-gray-600 mt-1">{config.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Scenes */}
                  <div className="space-y-4">
                    <h3 className="font-medium">場景列表</h3>
                    {mvConcept.scenes?.map((scene) => (
                      <div key={scene.scene_number} className="border rounded-lg overflow-hidden">
                        {/* Scene Header */}
                        <button
                          onClick={() => toggleScene(scene.scene_number)}
                          className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold">
                              {scene.scene_number}
                            </span>
                            <div className="text-left">
                              <div className="font-medium text-sm">
                                {scene.lyric_segment?.slice(0, 40)}
                                {scene.lyric_segment?.length > 40 ? "..." : ""}
                              </div>
                              <div className="text-xs text-gray-500">
                                {scene.mood} | {scene.camera_movement} | {scene.duration_hint}
                              </div>
                            </div>
                          </div>
                          <span className={`transition-transform ${expandedScenes.has(scene.scene_number) ? "rotate-90" : ""}`}>
                            ▶
                          </span>
                        </button>

                        {/* Scene Details */}
                        {expandedScenes.has(scene.scene_number) && (
                          <div className="p-4 space-y-4">
                            {/* Lyric */}
                            <div>
                              <label className="text-xs font-medium text-gray-500">對應歌詞</label>
                              <p className="text-sm mt-1 italic">&quot;{scene.lyric_segment}&quot;</p>
                            </div>

                            {/* Characters in scene */}
                            {scene.character_ids && Array.isArray(scene.character_ids) && scene.character_ids.length > 0 && (
                              <div>
                                <label className="text-xs font-medium text-gray-500">場景角色</label>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {(Array.isArray(scene.character_ids) ? scene.character_ids : JSON.parse(scene.character_ids || "[]")).map((charId: number) => (
                                    <span key={charId} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                      {getCharacterName(charId)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Visual Prompt */}
                            <div>
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-gray-500">視覺描述</label>
                                <button
                                  onClick={() => copyToClipboard(scene.visual_prompt)}
                                  className="text-xs text-purple-600 hover:text-purple-800"
                                >
                                  複製
                                </button>
                              </div>
                              <p className="text-sm mt-1 bg-gray-50 p-2 rounded">{scene.visual_prompt}</p>
                            </div>

                            {/* Subject / Background / Atmosphere */}
                            <div className="grid grid-cols-3 gap-3 text-xs">
                              <div>
                                <label className="font-medium text-gray-500">主體</label>
                                <p className="mt-1 text-gray-700">{scene.subject}</p>
                              </div>
                              <div>
                                <label className="font-medium text-gray-500">背景</label>
                                <p className="mt-1 text-gray-700">{scene.background}</p>
                              </div>
                              <div>
                                <label className="font-medium text-gray-500">氛圍</label>
                                <p className="mt-1 text-gray-700">{scene.atmosphere}</p>
                              </div>
                            </div>

                            {/* SeedDance Prompt */}
                            <div>
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-gray-500">SeedDance Prompt</label>
                                <button
                                  onClick={() => copyToClipboard(scene.seeddance_prompt)}
                                  className="text-xs text-purple-600 hover:text-purple-800"
                                >
                                  複製
                                </button>
                              </div>
                              <p className="text-xs mt-1 bg-purple-50 p-3 rounded font-mono whitespace-pre-wrap">
                                {scene.seeddance_prompt}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : activeTab === "references" ? (
                /* References Tab */
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-bold mb-2">角色參考圖片</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      這裡展示所有角色影集中標記為「參考圖」的照片。
                      <br />
                      你可以拖曳圖片複製路徑，或點擊複製按鈕。
                    </p>
                    <div
                      className="p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 text-center"
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <p className="text-gray-500 mb-2">
                        {droppedPath ? (
                          <>
                            <span className="text-green-600 font-medium">✓ 路徑已複製！</span>
                            <br />
                            <code className="text-xs break-all">{droppedPath}</code>
                          </>
                        ) : (
                          "將外部圖片拖曳到這裡即可複製路徑"
                        )}
                      </p>
                    </div>
                  </div>

                  {referenceImages.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">目前沒有參考圖片</p>
                      <p className="text-sm text-gray-400 mt-1">
                        前往「角色影集」頁面生成圖片並標記為參考圖
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Group by character */}
                      {(() => {
                        const grouped: { [key: string]: PortfolioImage[] } = {};
                        referenceImages.forEach((img) => {
                          const key = `${img.character_name} (${img.character_number})`;
                          if (!grouped[key]) grouped[key] = [];
                          grouped[key].push(img);
                        });

                        return Object.entries(grouped).map(([charName, images]) => (
                          <div key={charName}>
                            <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">
                                {images[0]?.character_number?.replace("C", "") || "?"}
                              </span>
                              {charName}
                              <span className="text-xs text-gray-400">({images.length}張)</span>
                            </h4>
                            <div className="grid grid-cols-4 gap-3">
                              {images.map((img) => (
                                <div
                                  key={img.id}
                                  className="relative group border rounded-lg overflow-hidden"
                                >
                                  <img
                                    src={getImageUrl(img.image_path)}
                                    alt={img.character_name}
                                    className="w-full aspect-square object-cover bg-gray-100"
                                    draggable
                                    onDragStart={(e) => {
                                      e.dataTransfer.setData("text/plain", img.image_path);
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => copyPath(img.image_path)}
                                      className="p-2 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="複製路徑"
                                    >
                                      {copiedPath === img.image_path ? (
                                        <span className="text-green-600 text-sm">✓</span>
                                      ) : (
                                        <span className="text-gray-700 text-sm">📋</span>
                                      )}
                                    </button>
                                  </div>
                                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                    <p className="text-white text-xs truncate">
                                      {img.scene_type} | {img.scene_description || "無描述"}
                                    </p>
                                    <p className="text-gray-300 text-[10px] truncate font-mono">
                                      {img.image_path.split("/").pop()}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              ) : (
                /* Export Tab */
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => handleExport("json")}
                      className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600"
                    >
                      匯出 JSON
                    </button>
                    <button
                      onClick={() => handleExport("markdown")}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600"
                    >
                      匯出 Markdown
                    </button>
                  </div>
                  {exportContent && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium">匯出內容</label>
                        <button
                          onClick={() => copyToClipboard(exportContent)}
                          className="text-xs text-purple-600 hover:text-purple-800"
                        >
                          複製全部
                        </button>
                      </div>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap max-h-96">
                        {exportContent}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-between">
          {mvConcept ? (
            <>
              <button
                onClick={() => {
                  setMVConcept(null);
                  setExportContent("");
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                重新生成
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
              >
                完成
              </button>
            </>
          ) : (
            <>
              <div></div>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-purple-300 flex items-center gap-2"
              >
                {generating && (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                )}
                {generating ? "生成中..." : "生成 MV 腳本"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
