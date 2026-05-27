"use client";

import { useState, useEffect } from "react";
import { Character, getCharacters, getCharacterImages } from "@/lib/api";
import {
  getCharacterPortfolio,
  generatePortfolio,
  generatePortfolioPrompt,
  updatePortfolioImage,
  deletePortfolioImage,
  addPortfolioImage,
  searchPortfolioImages,
  uploadPortfolioVideo,
  PortfolioImage,
} from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const SCENE_TYPES = [
  { value: "solo", label: "獨照", icon: "👤" },
  { value: "outfit", label: "穿搭", icon: "👗" },
  { value: "expression", label: "表情", icon: "😊" },
  { value: "angle", label: "角度", icon: "📐" },
  { value: "action", label: "動作", icon: "🏃" },
];

const TAGS = ["室內", "室外", "暗戀", "工作", "日常", "友情", "運動", "休閒"];

// Character image type
interface CharacterImage {
  id: number;
  character_id: number;
  image_path: string;
  variant_info: string;
  created_at: string;
  scene_type?: string; // 解析 variant_info 後可取得
}

// Helper to parse variant_info and get scene type label
function getSceneTypeLabel(variantInfo: string): string {
  try {
    const parsed = JSON.parse(variantInfo);
    if (parsed.outfit) return `穿搭: ${parsed.outfit}`;
    if (parsed.expression) return `表情: ${parsed.expression}`;
    if (parsed.angle) return `角度: ${parsed.angle}`;
    if (parsed.action) return `動作: ${parsed.action}`;
    return "變體";
  } catch {
    return "變體";
  }
}

export default function PortfolioPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioImage[]>([]);
  const [characterImages, setCharacterImages] = useState<CharacterImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [showOnlyReference, setShowOnlyReference] = useState(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [addingManual, setAddingManual] = useState(false);
  const [manualPath, setManualPath] = useState("");
  const [selectedExistingImages, setSelectedExistingImages] = useState<Set<string>>(new Set());
  const [showCharImagePicker, setShowCharImagePicker] = useState(false);
  const [addingToPortfolio, setAddingToPortfolio] = useState(false);
  // 搜尋功能
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PortfolioImage[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  // 選中圖片詳情
  const [selectedImage, setSelectedImage] = useState<PortfolioImage | null>(null);
  // SeedDance 提示詞生成結果
  const [generatedPromptResult, setGeneratedPromptResult] = useState<any>(null);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  // 影片拖放上傳
  const [draggingVideoOverId, setDraggingVideoOverId] = useState<number | null>(null);
  const [uploadingVideoId, setUploadingVideoId] = useState<number | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<number | null>(null);

  useEffect(() => {
    loadCharacters();
  }, []);

  // 點擊空白處停止影片播放
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // 如果點擊的不是影片卡片或影片控制項，停止播放
      if (!target.closest(".video-card") && !target.closest("video")) {
        setPlayingVideoId(null);
      }
    };
    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, []);

  useEffect(() => {
    if (selectedChar) {
      loadPortfolio(selectedChar.id);
      loadCharacterImages(selectedChar.id);
      setSelectedExistingImages(new Set());
      setShowCharImagePicker(false);
    }
  }, [selectedChar]);

  useEffect(() => {
    if (selectedChar) {
      loadPortfolio(selectedChar.id);
    }
  }, [filterType, showOnlyReference]);

  const loadCharacters = async () => {
    try {
      const data = await getCharacters();
      setCharacters(data);
      if (data.length > 0 && !selectedChar) {
        setSelectedChar(data[0]);
      }
    } catch (err) {
      console.error("Failed to load characters:", err);
    }
  };

  const loadCharacterImages = async (charId: number) => {
    try {
      const data = await getCharacterImages(charId);
      // API returns an array directly, not { images: [...] }
      setCharacterImages(Array.isArray(data) ? data : (data.images || []));
    } catch (err) {
      console.error("Failed to load character images:", err);
    }
  };

  const loadPortfolio = async (charId: number) => {
    setLoading(true);
    try {
      const options: { scene_type?: string; is_reference?: number } = {};
      if (filterType) options.scene_type = filterType;
      if (showOnlyReference) options.is_reference = 1;

      const data = await getCharacterPortfolio(charId, options);
      const images = (data.images || []).map((img: any) => {
        // 解析 JSON 字串欄位
        const parseJson = (val: any, fallback: any = []) => {
          if (Array.isArray(val)) return val;
          if (typeof val === "string") {
            try { return JSON.parse(val); } catch { return fallback; }
          }
          return fallback;
        };
        return {
          ...img,
          tags: parseJson(img.tags),
          location_tags: parseJson(img.location_tags),
          emotion_tags: parseJson(img.emotion_tags),
          action_tags: parseJson(img.action_tags),
        };
      });
      setPortfolio(images);
    } catch (err) {
      console.error("Failed to load portfolio:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (sceneType: string) => {
    if (!selectedChar) return;
    setGenerating(true);
    try {
      // 取得目前標記為 reference 的圖片路徑
      const refImages = portfolio
        .filter((p) => p.is_reference === 1)
        .map((p) => p.image_path);

      const result = await generatePortfolio(selectedChar.id, {
        scene_type: sceneType,
        count: 3,
        reference_paths: refImages,
      });
      console.log("生成結果:", result);
      // 重新載入
      await loadPortfolio(selectedChar.id);
    } catch (err) {
      console.error("Failed to generate:", err);
    } finally {
      setGenerating(false);
    }
  };

  // 只生成 SeedDance 提示詞（不生成圖片）
  const handleGeneratePromptOnly = async (sceneType: string) => {
    if (!selectedChar) return;
    setIsGeneratingPrompt(true);
    try {
      const result = await generatePortfolioPrompt(selectedChar.id, {
        scene_type: sceneType,
      });
      console.log("提示詞生成結果:", result);
      setGeneratedPromptResult(result);
      await loadPortfolio(selectedChar.id);
    } catch (err) {
      console.error("Failed to generate prompt:", err);
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handleToggleReference = async (img: PortfolioImage) => {
    if (!selectedChar) return;
    try {
      await updatePortfolioImage(selectedChar.id, img.id, {
        is_reference: img.is_reference === 1 ? false : true,
      });
      await loadPortfolio(selectedChar.id);
    } catch (err) {
      console.error("Failed to update:", err);
    }
  };

  const handleDelete = async (portfolioId: number) => {
    if (!selectedChar) return;
    if (!confirm("確定要刪除這張圖片嗎？")) return;
    try {
      await deletePortfolioImage(selectedChar.id, portfolioId);
      await loadPortfolio(selectedChar.id);
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const handleAddManual = async () => {
    if (!selectedChar || !manualPath.trim()) return;
    try {
      await addPortfolioImage(selectedChar.id, {
        image_path: manualPath.trim(),
        scene_type: "solo",
        is_reference: false,
      });
      setManualPath("");
      setAddingManual(false);
      await loadPortfolio(selectedChar.id);
    } catch (err) {
      console.error("Failed to add manual image:", err);
    }
  };

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  // 上傳 SeedDance 影片（點擊選擇檔案）
  const handleSaveVideoUrl = async (img: PortfolioImage) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/mp4,video/quicktime,video/webm,video/x-msvideo,.mp4,.mov,.webm,.avi";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !selectedChar) return;
      setUploadingVideoId(img.id);
      try {
        const result = await uploadPortfolioVideo(selectedChar.id, img.id, file);
        await loadPortfolio(selectedChar.id);
        if (selectedImage?.id === img.id) {
          setSelectedImage({ ...img, seeddance_video_url: result.path });
        }
      } catch (err: any) {
        alert(err.message || "上傳失敗");
      } finally {
        setUploadingVideoId(null);
      }
    };
    input.click();
  };

  // 處理影片拖放上傳
  const handleVideoDrop = async (e: React.DragEvent, img: PortfolioImage) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingVideoOverId(null);

    if (!selectedChar) return;

    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find(f => f.type.startsWith("video/") || /\.(mp4|mov|webm|avi)$/i.test(f.name));

    if (!videoFile) {
      alert("請拖放影片檔案（mp4, mov, webm, avi）");
      return;
    }

    setUploadingVideoId(img.id);
    try {
      const result = await uploadPortfolioVideo(selectedChar.id, img.id, videoFile);
      console.log("影片上傳成功:", result);
      await loadPortfolio(selectedChar.id);

      // 如果這個項目正在顯示詳情，更新它
      if (selectedImage?.id === img.id) {
        const updated = portfolio.find(p => p.id === img.id);
        if (updated) setSelectedImage({ ...updated, seeddance_video_url: result.path });
      }
    } catch (err: any) {
      console.error("Failed to upload video:", err);
      alert(err.message || "上傳失敗");
    } finally {
      setUploadingVideoId(null);
    }
  };

  const handleVideoDragOver = (e: React.DragEvent, img: PortfolioImage) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingVideoOverId(img.id);
  };

  const handleVideoDragLeave = (e: React.DragEvent, img: PortfolioImage) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingVideoOverId(null);
  };

  // 搜尋影集圖片
  const handleSearch = async () => {
    if (!selectedChar || !searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const result = await searchPortfolioImages(selectedChar.id, searchQuery.trim());
      const images = (result.results || []).map((img: any) => {
        // 解析 JSON 字串欄位
        const parseJson = (val: any, fallback: any = []) => {
          if (Array.isArray(val)) return val;
          if (typeof val === "string") {
            try { return JSON.parse(val); } catch { return fallback; }
          }
          return fallback;
        };
        return {
          ...img,
          tags: parseJson(img.tags),
          location_tags: parseJson(img.location_tags),
          emotion_tags: parseJson(img.emotion_tags),
          action_tags: parseJson(img.action_tags),
        };
      });
      setSearchResults(images);
    } catch (err) {
      console.error("Failed to search:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
  };

  const toggleExistingImage = (path: string) => {
    setSelectedExistingImages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const handleAddSelectedToPortfolio = async () => {
    if (!selectedChar || selectedExistingImages.size === 0) return;
    setAddingToPortfolio(true);
    try {
      for (const imagePath of Array.from(selectedExistingImages)) {
        await addPortfolioImage(selectedChar.id, {
          image_path: imagePath,
          scene_type: "solo",
          is_reference: true, // 從角色圖片加入的預設為參考圖
        });
      }
      setSelectedExistingImages(new Set());
      await loadPortfolio(selectedChar.id);
      alert(`已成功加入 ${selectedExistingImages.size} 張圖片到影集！`);
    } catch (err) {
      console.error("Failed to add images:", err);
      alert("加入失敗");
    } finally {
      setAddingToPortfolio(false);
    }
  };

  const getImageUrl = (path: string) => {
    if (!path) return "/placeholder.png";
    // 將本地路徑轉換為後端 HTTP URL
    if (path.startsWith("/Volumes/Transcend/manga-studio")) {
      const normalized = path.replace("/Volumes/Transcend/manga-studio", "");
      return `http://localhost:8000${normalized}`;
    }
    // 如果是相對路徑
    if (path.startsWith("/")) {
      return `http://localhost:8000${path}`;
    }
    // 如果是外部 URL，直接使用
    if (path.startsWith("http")) {
      return path;
    }
    return path;
  };

  const currentCount = portfolio.length;
  const referenceCount = portfolio.filter((p) => p.is_reference === 1).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">角色影集</h1>
            <p className="text-sm text-gray-500 mt-1">
              為角色生成各式場景圖片，用於 MV 腳本參考
            </p>
          </div>
          <div className="text-sm text-gray-500">
            每個角色最多 50 張影集圖片
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-140px)]">
        {/* Left Sidebar - Character List */}
        <div className="w-64 bg-white border-r overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">角色列表</h2>
            <div className="space-y-2">
              {characters.map((char) => (
                <button
                  key={char.id}
                  onClick={() => setSelectedChar(char)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedChar?.id === char.id
                      ? "bg-blue-50 border-blue-200"
                      : "hover:bg-gray-50 border-transparent"
                  } border`}
                >
                  <div className="flex items-center gap-3">
                    {char.image_path ? (
                      <img
                        src={getImageUrl(char.image_path)}
                        alt={char.name}
                        className="w-10 h-10 rounded-full object-cover bg-gray-100"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                        {char.gender === "female" ? "♀" : "♂"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {char.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {char.character_number}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {selectedChar ? (
            <div className="p-6">
              {/* Character Header */}
              <div className="bg-white rounded-lg border p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {selectedChar.image_path ? (
                      <img
                        src={getImageUrl(selectedChar.image_path)}
                        alt={selectedChar.name}
                        className="w-16 h-16 rounded-full object-cover bg-gray-100"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl text-gray-500">
                        {selectedChar.gender === "female" ? "♀" : "♂"}
                      </div>
                    )}
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {selectedChar.name}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {selectedChar.job || selectedChar.character_number}
                      </p>
                      <div className="flex gap-4 mt-1 text-xs text-gray-400">
                        <span>影集: {currentCount}/50</span>
                        <span>參考圖: {referenceCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAddingManual(!addingManual)}
                      className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      + 手動新增
                    </button>
                  </div>
                </div>

                {/* Manual Add Form */}
                {addingManual && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">
                      輸入圖片路徑（本地路徑或 URL）：
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={manualPath}
                        onChange={(e) => setManualPath(e.target.value)}
                        placeholder="/Volumes/Transcend/... 或 https://..."
                        className="flex-1 px-3 py-2 border rounded-lg text-sm"
                      />
                      <button
                        onClick={handleAddManual}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                      >
                        新增
                      </button>
                      <button
                        onClick={() => {
                          setAddingManual(false);
                          setManualPath("");
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}

                {/* Generate Buttons */}
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-3">
                    根據角色特色生成影集圖片：
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SCENE_TYPES.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => handleGenerate(type.value)}
                        disabled={generating || currentCount >= 50}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          generating || currentCount >= 50
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-blue-500 text-white hover:bg-blue-600"
                        }`}
                      >
                        {type.icon} {type.label}
                        {generating && " (生成中...)"}
                      </button>
                    ))}
                  </div>
                  {currentCount >= 50 && (
                    <p className="text-sm text-red-500 mt-2">
                      已達影集上限 (50張)，請刪除部分圖片後再生成。
                    </p>
                  )}
                </div>

                {/* Generate SeedDance Prompt Only */}
                <div className="mt-4 pt-4 border-t border-dashed border-purple-300">
                  <p className="text-sm text-purple-700 mb-3 flex items-center gap-2">
                    <span>🎬</span> 生成 SeedDance 提示詞（用於自行到 SeedDance 生成影片）
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SCENE_TYPES.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => handleGeneratePromptOnly(type.value)}
                        disabled={isGeneratingPrompt || currentCount >= 50}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isGeneratingPrompt || currentCount >= 50
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-purple-500 text-white hover:bg-purple-600"
                        }`}
                      >
                        {type.icon} 生成 {type.label} 提示詞
                        {isGeneratingPrompt && " (生成中...)"}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-purple-600 mt-2">
                    💡 提示詞生成後可複製到 SeedDance 生成影片，完成後將影片網址貼回此頁面
                  </p>
                </div>

                {/* Character Image Picker Section */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-gray-600">
                      從角色圖庫選擇圖片加入影集：
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowCharImagePicker(!showCharImagePicker)}
                        className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg transition-colors"
                      >
                        {showCharImagePicker ? "隱藏圖庫" : "顯示圖庫"}
                        {characterImages.length > 0 && ` (${characterImages.length}張)`}
                      </button>
                    </div>
                  </div>

                  {showCharImagePicker && characterImages.length > 0 && (
                    <div className="mt-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm text-purple-700">
                          已選擇 {selectedExistingImages.size} 張圖片
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              if (selectedExistingImages.size === characterImages.length) {
                                setSelectedExistingImages(new Set());
                              } else {
                                setSelectedExistingImages(new Set(characterImages.map(img => img.image_path)));
                              }
                            }}
                            className="px-2 py-1 text-xs bg-white text-purple-700 hover:bg-purple-100 rounded transition-colors"
                          >
                            {selectedExistingImages.size === characterImages.length ? "取消全選" : "全選"}
                          </button>
                          <button
                            onClick={handleAddSelectedToPortfolio}
                            disabled={selectedExistingImages.size === 0 || addingToPortfolio}
                            className={`px-3 py-1 text-xs rounded transition-colors ${
                              selectedExistingImages.size === 0 || addingToPortfolio
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-purple-500 text-white hover:bg-purple-600"
                            }`}
                          >
                            {addingToPortfolio ? "加入中..." : `+ 加入影集 (${selectedExistingImages.size})`}
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto">
                        {characterImages.map((img) => (
                          <div
                            key={img.id}
                            onClick={() => toggleExistingImage(img.image_path)}
                            className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                              selectedExistingImages.has(img.image_path)
                                ? "border-purple-500 ring-2 ring-purple-300"
                                : "border-gray-200 hover:border-purple-300"
                            }`}
                          >
                            <img
                              src={getImageUrl(img.image_path)}
                              alt="Character"
                              className="w-full aspect-square object-cover bg-gray-100"
                            />
                            {selectedExistingImages.has(img.image_path) && (
                              <div className="absolute top-1 right-1 bg-purple-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                                ✓
                              </div>
                            )}
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent p-1">
                              <p className="text-white text-xs truncate">
                                {getSceneTypeLabel(img.variant_info)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-purple-600 mt-2">
                        💡 點擊圖片選擇/取消，選擇完成後點擊「加入影集」將圖片新增為參考圖
                      </p>
                    </div>
                  )}

                  {showCharImagePicker && characterImages.length === 0 && (
                    <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                      <p className="text-gray-500 text-sm">角色還沒有生成的圖片</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Search Bar */}
              <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-purple-700">🔍 搜尋影集：</span>
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="搜尋地點、情緒、動作...例如：捷運、咖啡廳、心動"
                      className="flex-1 px-4 py-2 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                    />
                    <button
                      onClick={handleSearch}
                      disabled={isSearching || !searchQuery.trim()}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isSearching || !searchQuery.trim()
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-purple-500 text-white hover:bg-purple-600"
                      }`}
                    >
                      {isSearching ? "搜尋中..." : "搜尋"}
                    </button>
                    {searchResults !== null && (
                      <button
                        onClick={clearSearch}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                      >
                        清除
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-purple-600 mt-2">
                  💡 可搜尋：地點（捷運、咖啡廳）、情緒（心動、悲傷）、動作（奔跑、等待）或 SeedDance 提示詞內容
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">篩選類型：</span>
                  <button
                    onClick={() => setFilterType(null)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      !filterType
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    全部
                  </button>
                  {SCENE_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setFilterType(type.value)}
                      className={`px-3 py-1 text-sm rounded-full transition-colors ${
                        filterType === type.value
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {type.icon} {type.label}
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-600 ml-auto">
                  <input
                    type="checkbox"
                    checked={showOnlyReference}
                    onChange={(e) => setShowOnlyReference(e.target.checked)}
                    className="rounded"
                  />
                  只顯示參考圖
                </label>
              </div>

              {/* Reference Images Section */}
              {referenceCount > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="text-yellow-500">★</span>
                    參考圖片（可拖曳到 MV 腳本使用）
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    {portfolio
                      .filter((p) => p.is_reference === 1)
                      .map((img) => (
                        <div
                          key={img.id}
                          className="relative group border-2 border-yellow-400 rounded-lg overflow-hidden"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData(
                              "text/plain",
                              img.image_path
                            );
                          }}
                        >
                          <img
                            src={getImageUrl(img.image_path)}
                            alt="Reference"
                            className="w-full aspect-square object-cover bg-gray-100"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all" />
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-white text-xs truncate">
                              {img.scene_type}
                            </p>
                          </div>
                          <div className="absolute top-2 right-2">
                            <span className="bg-yellow-400 text-yellow-900 text-xs px-2 py-0.5 rounded-full">
                              參考
                            </span>
                          </div>
                          {/* Copy Path Button */}
                          <button
                            onClick={() => handleCopyPath(img.image_path)}
                            className="absolute top-2 left-2 bg-black/50 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            title="複製路徑"
                          >
                            {copiedPath === img.image_path ? (
                              <span className="text-xs">✓</span>
                            ) : (
                              <span className="text-xs">📋</span>
                            )}
                          </button>
                        </div>
                      ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 拖曳圖片即可複製路徑，或點擊 📋 複製
                  </p>
                </div>
              )}

              {/* Search Results */}
              {searchResults !== null && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-purple-700 mb-3 flex items-center gap-2">
                    <span>🔍</span>
                    搜尋結果 {searchResults.length > 0 && `（${searchResults.length} 張符合「${searchQuery}」）`}
                  </h3>
                  {searchResults.length === 0 ? (
                    <div className="text-center py-8 bg-white rounded-lg border border-purple-100">
                      <p className="text-gray-500">沒有找到符合「{searchQuery}」的影集圖片</p>
                      <p className="text-sm text-gray-400 mt-1">
                        嘗試搜尋其他關鍵字，如：捷運、咖啡廳、心動、悲傷
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-4">
                      {searchResults.map((img) => (
                        <div
                          key={img.id}
                          className={`relative group rounded-lg overflow-hidden border cursor-pointer transition-all hover:shadow-lg ${
                            img.is_reference === 1
                              ? "border-purple-400"
                              : "border-gray-200"
                          }`}
                          onClick={() => setSelectedImage(img)}
                        >
                          {/* Placeholder UI for pending entries */}
                          {img.image_path?.includes("placeholder") ? (
                            <div
                              className={`w-full aspect-square flex flex-col items-center justify-center p-4 transition-all ${
                                draggingVideoOverId === img.id
                                  ? "bg-purple-200 border-4 border-dashed border-purple-500"
                                  : "bg-gradient-to-br from-purple-100 to-pink-100"
                              }`}
                              onDrop={(e) => handleVideoDrop(e, img)}
                              onDragOver={(e) => handleVideoDragOver(e, img)}
                              onDragLeave={(e) => handleVideoDragLeave(e, img)}
                              onClick={(e) => {
                                if (!draggingVideoOverId) setSelectedImage(img);
                              }}
                            >
                              {uploadingVideoId === img.id ? (
                                <>
                                  <div className="animate-spin text-4xl mb-2">⏳</div>
                                  <p className="text-xs text-purple-700 text-center font-medium">上傳中...</p>
                                </>
                              ) : img.seeddance_video_url && !img.seeddance_video_url.includes("placeholder") ? (
                                <div
                                  className={`w-full h-full flex flex-col items-center justify-center relative cursor-pointer video-card transition-all ${
                                    draggingVideoOverId === img.id
                                      ? "ring-4 ring-purple-500 bg-purple-100"
                                      : ""
                                  }`}
                                  onDrop={(e) => handleVideoDrop(e, img)}
                                  onDragOver={(e) => handleVideoDragOver(e, img)}
                                  onDragLeave={(e) => handleVideoDragLeave(e, img)}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (playingVideoId === img.id) {
                                      setPlayingVideoId(null);
                                    } else {
                                      setPlayingVideoId(img.id);
                                    }
                                  }}
                                >
                                  {playingVideoId === img.id ? (
                                    <video
                                      src={getImageUrl(img.seeddance_video_url)}
                                      className="w-full h-full object-cover rounded-lg"
                                      autoPlay
                                      controls
                                      playsInline
                                      onEnded={() => setPlayingVideoId(null)}
                                    />
                                  ) : (
                                    <>
                                      <video
                                        src={getImageUrl(img.seeddance_video_url)}
                                        className="w-full h-full object-cover rounded-lg"
                                        muted
                                        playsInline
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-white text-5xl">▶️</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end bg-gradient-to-t from-black/60 to-transparent p-3 rounded-b-lg">
                                  <span className="text-3xl mb-1">
                                    {draggingVideoOverId === img.id ? "📂" : "🎬"}
                                  </span>
                                  <p className="text-xs text-white text-center font-medium">
                                    {draggingVideoOverId === img.id ? "放開以上傳" : "點擊或拖放上傳影片"}
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <img
                              src={getImageUrl(img.image_path)}
                              alt="Portfolio"
                              className="w-full aspect-square object-cover bg-gray-100"
                            />
                          )}

                          {/* Overlay */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all" />

                          {/* Quick Tags Preview */}
                          {((img.location_tags?.length ?? 0) > 0 || (img.emotion_tags?.length ?? 0) > 0) && (
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex flex-wrap gap-1">
                                {img.location_tags?.slice(0, 2).map((tag: string) => (
                                  <span key={tag} className="text-xs bg-green-500/80 text-white px-1.5 py-0.5 rounded">
                                    {tag}
                                  </span>
                                ))}
                                {img.emotion_tags?.slice(0, 2).map((tag: string) => (
                                  <span key={tag} className="text-xs bg-pink-500/80 text-white px-1.5 py-0.5 rounded">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Reference Badge */}
                          {img.is_reference === 1 && (
                            <div className="absolute top-2 left-2">
                              <span className="bg-yellow-400 text-yellow-900 text-xs px-2 py-0.5 rounded-full">
                                ★ 參考
                              </span>
                            </div>
                          )}

                          {/* Click hint */}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                              點擊查看詳情
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* All Images Grid */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  全部影集 ({currentCount})
                </h3>
                {loading ? (
                  <div className="text-center py-12 text-gray-500">
                    載入中...
                  </div>
                ) : portfolio.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg border">
                    <p className="text-gray-500">還沒有影集圖片</p>
                    <p className="text-sm text-gray-400 mt-1">
                      點擊上方按鈕生成第一張！
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-4">
                    {portfolio.map((img) => (
                      <div
                        key={img.id}
                        className={`relative group rounded-lg overflow-hidden border ${
                          img.is_reference === 1
                            ? "border-yellow-400"
                            : "border-gray-200"
                        }`}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", img.image_path);
                        }}
                      >
                        {/* Placeholder UI for pending entries */}
                        {img.image_path?.includes("placeholder") ? (
                          <div
                            className={`w-full aspect-square flex flex-col items-center justify-center p-4 transition-all ${
                              draggingVideoOverId === img.id
                                ? "bg-purple-200 border-4 border-dashed border-purple-500"
                                : "bg-gradient-to-br from-purple-100 to-pink-100"
                            }`}
                            onDrop={(e) => handleVideoDrop(e, img)}
                            onDragOver={(e) => handleVideoDragOver(e, img)}
                            onDragLeave={(e) => handleVideoDragLeave(e, img)}
                          >
                            {/* 上傳中狀態 */}
                            {uploadingVideoId === img.id ? (
                              <>
                                <div className="animate-spin text-4xl mb-2">⏳</div>
                                <p className="text-xs text-purple-700 text-center font-medium">
                                  上傳中...
                                </p>
                              </>
                            ) : img.seeddance_video_url && !img.seeddance_video_url.includes("placeholder") ? (
                              /* 已上傳影片 - 顯示影片（支援拖放置換） */
                              <div
                                className={`w-full h-full flex flex-col items-center justify-center relative cursor-pointer video-card transition-all ${
                                  draggingVideoOverId === img.id
                                    ? "ring-4 ring-purple-500 bg-purple-100"
                                    : ""
                                }`}
                                onDrop={(e) => handleVideoDrop(e, img)}
                                onDragOver={(e) => handleVideoDragOver(e, img)}
                                onDragLeave={(e) => handleVideoDragLeave(e, img)}
                                onClick={() => {
                                  if (playingVideoId === img.id) {
                                    setPlayingVideoId(null);
                                  } else {
                                    setPlayingVideoId(img.id);
                                  }
                                }}
                              >
                                {playingVideoId === img.id ? (
                                  <>
                                    <video
                                      src={getImageUrl(img.seeddance_video_url)}
                                      className="w-full h-full object-cover rounded-lg"
                                      autoPlay
                                      controls
                                      playsInline
                                      onEnded={() => setPlayingVideoId(null)}
                                    />
                                  </>
                                ) : (
                                  <>
                                    <video
                                      src={getImageUrl(img.seeddance_video_url)}
                                      className="w-full h-full object-cover rounded-lg"
                                      muted
                                      playsInline
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <span className="text-white text-5xl">▶️</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            ) : (
                              /* 待填入狀態 */
                              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end bg-gradient-to-t from-black/60 to-transparent p-3 rounded-b-lg">
                                <span className="text-3xl mb-1">
                                  {draggingVideoOverId === img.id ? "📂" : "🎬"}
                                </span>
                                <p className="text-xs text-white text-center font-medium">
                                  {draggingVideoOverId === img.id ? "放開以上傳" : "點擊或拖放上傳影片"}
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <img
                            src={getImageUrl(img.image_path)}
                            alt="Portfolio"
                            className="w-full aspect-square object-cover bg-gray-100"
                          />
                        )}

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all" />

                        {/* Actions on Hover */}
                        <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setSelectedImage(img)}
                            className="p-2 bg-purple-500 text-white rounded-full hover:bg-purple-600"
                            title="查看 SeedDance 提示詞"
                          >
                            🎬
                          </button>
                          <button
                            onClick={() => handleToggleReference(img)}
                            className={`p-2 rounded-full transition-colors ${
                              img.is_reference === 1
                                ? "bg-yellow-400 text-yellow-900 hover:bg-yellow-500"
                                : "bg-white text-gray-700 hover:bg-gray-100"
                            }`}
                            title={
                              img.is_reference === 1
                                ? "取消參考圖"
                                : "設為參考圖"
                            }
                          >
                            {img.is_reference === 1 ? "★" : "☆"}
                          </button>
                          <button
                            onClick={() => handleCopyPath(img.image_path)}
                            className="p-2 bg-white text-gray-700 rounded-full hover:bg-gray-100"
                            title="複製路徑"
                          >
                            {copiedPath === img.image_path ? "✓" : "📋"}
                          </button>
                          <button
                            onClick={() => handleDelete(img.id)}
                            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                            title="刪除"
                          >
                            🗑️
                          </button>
                        </div>

                        {/* Reference Badge */}
                        {img.is_reference === 1 && (
                          <div className="absolute top-2 left-2">
                            <span className="bg-yellow-400 text-yellow-900 text-xs px-2 py-0.5 rounded-full">
                              ★ 參考
                            </span>
                          </div>
                        )}

                        {/* SeedDance Video Badge */}
                        {img.seeddance_video_url && (
                          <div className="absolute top-2 right-12">
                            <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-0.5 rounded-full">
                              🎬 已填
                            </span>
                          </div>
                        )}

                        {/* Pending (no image) Badge */}
                        {img.image_path?.includes("placeholder") && (
                          <div className="absolute top-2 right-12">
                            <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                              ⏳ 待填
                            </span>
                          </div>
                        )}

                        {/* Scene Type Badge */}
                        <div className="absolute bottom-2 right-2">
                          <span className="bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                            {SCENE_TYPES.find((t) => t.value === img.scene_type)
                              ?.icon || "👤"}{" "}
                            {img.scene_type}
                          </span>
                        </div>

                        {/* SeedDance Tags Preview on Hover */}
                        {img.full_seeddance_prompt && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            <p className="font-semibold text-purple-300 mb-1">🎬 SeedDance 提示詞預覽</p>
                            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap line-clamp-4">
                              {img.full_seeddance_prompt}
                            </p>
                            <p className="text-gray-500 mt-2 text-[10px]">
                              點擊 🎬 查看完整提示詞
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              請選擇一個角色
            </div>
          )}
        </div>
      </div>

      {/* SeedDance Prompt Detail Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">SeedDance 提示詞詳情</h2>
                <p className="text-sm text-gray-500">可用於影片片段生成參考</p>
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Image Preview */}
            <div className="p-6">
              <div className="flex gap-6">
                {/* Image / Video Preview */}
                <div className="w-48 flex-shrink-0">
                  {selectedImage.image_path?.includes("placeholder") ? (
                    selectedImage.seeddance_video_url && !selectedImage.seeddance_video_url.includes("placeholder") ? (
                      <video
                        src={getImageUrl(selectedImage.seeddance_video_url)}
                        className="w-full aspect-square object-cover rounded-lg bg-gray-100"
                        controls
                        playsInline
                      />
                    ) : (
                      <div
                        className={`w-full aspect-square flex flex-col items-center justify-center rounded-lg transition-all ${
                          draggingVideoOverId === selectedImage.id
                            ? "bg-purple-200 border-4 border-dashed border-purple-500"
                            : "bg-gradient-to-br from-purple-100 to-pink-100"
                        }`}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleVideoDrop(e, selectedImage);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleVideoDragOver(e, selectedImage);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleVideoDragLeave(e, selectedImage);
                        }}
                      >
                        {uploadingVideoId === selectedImage.id ? (
                          <>
                            <div className="animate-spin text-4xl mb-2">⏳</div>
                            <p className="text-xs text-purple-700 text-center font-medium">上傳中...</p>
                          </>
                        ) : (
                          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end bg-gradient-to-t from-black/60 to-transparent p-3 rounded-b-lg">
                            <span className="text-3xl mb-1">
                              {draggingVideoOverId === selectedImage.id ? "📂" : "🎬"}
                            </span>
                            <p className="text-xs text-white text-center font-medium">
                              {draggingVideoOverId === selectedImage.id ? "放開以上傳" : "點擊或拖放上傳影片"}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  ) : (
                    <img
                      src={getImageUrl(selectedImage.image_path)}
                      alt="Portfolio"
                      className="w-full aspect-square object-cover rounded-lg bg-gray-100"
                    />
                  )}
                </div>

                {/* Tags */}
                <div className="flex-1">
                  {/* Location Tags */}
                  {selectedImage.location_tags && selectedImage.location_tags.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">📍 地點</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedImage.location_tags.map((tag: string) => (
                          <span
                            key={tag}
                            className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Emotion Tags */}
                  {selectedImage.emotion_tags && selectedImage.emotion_tags.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">💕 情緒</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedImage.emotion_tags.map((tag: string) => (
                          <span
                            key={tag}
                            className="px-3 py-1 bg-pink-100 text-pink-700 text-sm rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Tags */}
                  {selectedImage.action_tags && selectedImage.action_tags.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">🏃 動作</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedImage.action_tags.map((tag: string) => (
                          <span
                            key={tag}
                            className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SeedDance Prompt Segments */}
              <div className="mt-6 space-y-4">
                <h4 className="text-sm font-semibold text-gray-900 border-b pb-2">
                  🎬 SeedDance 提示詞（可複製使用）
                </h4>

                {/* Subject */}
                {selectedImage.subject_segment && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h5 className="text-xs font-semibold text-blue-600 uppercase mb-2">Subject 主體</h5>
                    <p className="text-sm text-gray-800 font-mono leading-relaxed">
                      {selectedImage.subject_segment}
                    </p>
                    <button
                      onClick={() => handleCopyPath(selectedImage.subject_segment || "")}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                    >
                      📋 複製
                    </button>
                  </div>
                )}

                {/* Setting */}
                {selectedImage.setting_segment && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <h5 className="text-xs font-semibold text-green-600 uppercase mb-2">Setting 場景</h5>
                    <p className="text-sm text-gray-800 font-mono leading-relaxed">
                      {selectedImage.setting_segment}
                    </p>
                    <button
                      onClick={() => handleCopyPath(selectedImage.setting_segment || "")}
                      className="mt-2 text-xs text-green-600 hover:text-green-800"
                    >
                      📋 複製
                    </button>
                  </div>
                )}

                {/* Atmosphere */}
                {selectedImage.atmosphere_segment && (
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h5 className="text-xs font-semibold text-purple-600 uppercase mb-2">Atmosphere 氛圍</h5>
                    <p className="text-sm text-gray-800 font-mono leading-relaxed">
                      {selectedImage.atmosphere_segment}
                    </p>
                    <button
                      onClick={() => handleCopyPath(selectedImage.atmosphere_segment || "")}
                      className="mt-2 text-xs text-purple-600 hover:text-purple-800"
                    >
                      📋 複製
                    </button>
                  </div>
                )}

                {/* Camera */}
                {selectedImage.camera_segment && (
                  <div className="bg-orange-50 rounded-lg p-4">
                    <h5 className="text-xs font-semibold text-orange-600 uppercase mb-2">Camera 鏡頭</h5>
                    <p className="text-sm text-gray-800 font-mono leading-relaxed">
                      {selectedImage.camera_segment}
                    </p>
                    <button
                      onClick={() => handleCopyPath(selectedImage.camera_segment || "")}
                      className="mt-2 text-xs text-orange-600 hover:text-orange-800"
                    >
                      📋 複製
                    </button>
                  </div>
                )}

                {/* Technical */}
                {selectedImage.technical_segment && (
                  <div className="bg-gray-100 rounded-lg p-4">
                    <h5 className="text-xs font-semibold text-gray-600 uppercase mb-2">Technical 技術</h5>
                    <p className="text-sm text-gray-800 font-mono leading-relaxed">
                      {selectedImage.technical_segment}
                    </p>
                    <button
                      onClick={() => handleCopyPath(selectedImage.technical_segment || "")}
                      className="mt-2 text-xs text-gray-600 hover:text-gray-800"
                    >
                      📋 複製
                    </button>
                  </div>
                )}

                {/* Full Prompt */}
                {selectedImage.full_seeddance_prompt && (
                  <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-4">
                    <h5 className="text-xs font-semibold text-white uppercase mb-2">✨ 完整 SeedDance Prompt</h5>
                    <p className="text-sm text-gray-100 font-mono leading-relaxed whitespace-pre-wrap">
                      {selectedImage.full_seeddance_prompt}
                    </p>
                    <button
                      onClick={() => handleCopyPath(selectedImage.full_seeddance_prompt || "")}
                      className="mt-2 text-xs text-white/80 hover:text-white"
                    >
                      📋 複製完整提示詞
                    </button>
                  </div>
                )}

                {/* Diary Context */}
                {selectedImage.diary_context && (
                  <div className="bg-yellow-50 rounded-lg p-4 mt-4">
                    <h5 className="text-xs font-semibold text-yellow-600 uppercase mb-2">📖 日記脈絡</h5>
                    <p className="text-sm text-gray-700 italic">
                      {selectedImage.diary_context}
                    </p>
                  </div>
                )}

                {/* SeedDance Video Upload */}
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-4 mt-4">
                  <h5 className="text-xs font-semibold text-white uppercase mb-2">🎬 SeedDance 影片</h5>
                  {selectedImage.seeddance_video_url && !selectedImage.seeddance_video_url.includes("placeholder") ? (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-white">已上傳影片</span>
                        <button
                          onClick={() => handleSaveVideoUrl(selectedImage)}
                          className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white text-xs rounded transition-colors"
                        >
                          編輯
                        </button>
                      </div>
                      <p className="text-xs text-white/60 truncate">
                        {selectedImage.seeddance_video_url.split("/").pop()}
                      </p>
                    </div>
                  ) : (
                    <div
                      className={`border-2 border-dashed rounded-lg p-4 text-center transition-all cursor-pointer ${
                        draggingVideoOverId === selectedImage.id
                          ? "border-white bg-white/20"
                          : "border-white/40 hover:border-white/60 hover:bg-white/10"
                      }`}
                      onDrop={async (e) => {
                        e.preventDefault();
                        setDraggingVideoOverId(null);
                        if (!selectedChar) return;
                        const files = Array.from(e.dataTransfer.files);
                        const videoFile = files.find(f => f.type.startsWith("video/") || /\.(mp4|mov|webm|avi)$/i.test(f.name));
                        if (!videoFile) { alert("請拖放影片檔案（mp4, mov, webm, avi）"); return; }
                        setUploadingVideoId(selectedImage.id);
                        try {
                          const result = await uploadPortfolioVideo(selectedChar.id, selectedImage.id, videoFile);
                          await loadPortfolio(selectedChar.id);
                          setSelectedImage({ ...selectedImage, seeddance_video_url: result.path });
                        } catch (err: any) {
                          alert(err.message || "上傳失敗");
                        } finally {
                          setUploadingVideoId(null);
                        }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDraggingVideoOverId(selectedImage.id);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setDraggingVideoOverId(null);
                      }}
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = "video/mp4,video/quicktime,video/webm,video/x-msvideo,.mp4,.mov,.webm,.avi";
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (!file || !selectedChar) return;
                          setUploadingVideoId(selectedImage.id);
                          try {
                            const result = await uploadPortfolioVideo(selectedChar.id, selectedImage.id, file);
                            await loadPortfolio(selectedChar.id);
                            setSelectedImage({ ...selectedImage, seeddance_video_url: result.path });
                          } catch (err: any) {
                            alert(err.message || "上傳失敗");
                          } finally {
                            setUploadingVideoId(null);
                          }
                        };
                        input.click();
                      }}
                    >
                      {uploadingVideoId === selectedImage.id ? (
                        <div className="animate-spin text-2xl mb-1">⏳</div>
                      ) : (
                        <div className="text-2xl mb-1">📁</div>
                      )}
                      <p className="text-sm text-white/80 font-medium">
                        {uploadingVideoId === selectedImage.id ? "上傳中..." : "拖放影片至此或點擊上傳"}
                      </p>
                      <p className="text-xs text-white/50 mt-1">支援 mp4, mov, webm, avi</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 pt-4 border-t flex gap-3">
                <button
                  onClick={() => handleToggleReference(selectedImage)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedImage.is_reference === 1
                      ? "bg-yellow-400 text-yellow-900 hover:bg-yellow-500"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {selectedImage.is_reference === 1 ? "★ 取消參考圖" : "☆ 設為參考圖"}
                </button>
                <button
                  onClick={() => handleCopyPath(selectedImage.image_path || "")}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
                >
                  📋 複製圖片路徑
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SeedDance 提示詞生成結果 Modal */}
      {generatedPromptResult && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setGeneratedPromptResult(null)}
        >
          <div
            className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">🎬 SeedDance 提示詞已生成</h2>
                <p className="text-sm text-white/80">複製提示詞到 SeedDance 生成影片，完成後將網址貼回</p>
              </div>
              <button
                onClick={() => setGeneratedPromptResult(null)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Tags */}
              {generatedPromptResult.tags && (
                <div className="flex flex-wrap gap-3">
                  {generatedPromptResult.tags.location?.map((tag: string) => (
                    <span key={tag} className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                      📍 {tag}
                    </span>
                  ))}
                  {generatedPromptResult.tags.emotion?.map((tag: string) => (
                    <span key={tag} className="px-3 py-1 bg-pink-100 text-pink-700 text-sm rounded-full">
                      💕 {tag}
                    </span>
                  ))}
                  {generatedPromptResult.tags.action?.map((tag: string) => (
                    <span key={tag} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                      🏃 {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Segments */}
              <div className="space-y-3">
                {/* Subject */}
                {generatedPromptResult.segments?.subject && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-semibold text-blue-600 uppercase">Subject 主體</h5>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedPromptResult.segments.subject);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        📋 複製
                      </button>
                    </div>
                    <p className="text-sm text-gray-800 font-mono leading-relaxed">
                      {generatedPromptResult.segments.subject}
                    </p>
                  </div>
                )}

                {/* Setting */}
                {generatedPromptResult.segments?.setting && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-semibold text-green-600 uppercase">Setting 場景</h5>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedPromptResult.segments.setting);
                        }}
                        className="text-xs text-green-600 hover:text-green-800"
                      >
                        📋 複製
                      </button>
                    </div>
                    <p className="text-sm text-gray-800 font-mono leading-relaxed">
                      {generatedPromptResult.segments.setting}
                    </p>
                  </div>
                )}

                {/* Atmosphere */}
                {generatedPromptResult.segments?.atmosphere && (
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-semibold text-purple-600 uppercase">Atmosphere 氛圍</h5>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedPromptResult.segments.atmosphere);
                        }}
                        className="text-xs text-purple-600 hover:text-purple-800"
                      >
                        📋 複製
                      </button>
                    </div>
                    <p className="text-sm text-gray-800 font-mono leading-relaxed">
                      {generatedPromptResult.segments.atmosphere}
                    </p>
                  </div>
                )}

                {/* Camera */}
                {generatedPromptResult.segments?.camera && (
                  <div className="bg-orange-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-semibold text-orange-600 uppercase">Camera 鏡頭</h5>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedPromptResult.segments.camera);
                        }}
                        className="text-xs text-orange-600 hover:text-orange-800"
                      >
                        📋 複製
                      </button>
                    </div>
                    <p className="text-sm text-gray-800 font-mono leading-relaxed">
                      {generatedPromptResult.segments.camera}
                    </p>
                  </div>
                )}

                {/* Technical */}
                {generatedPromptResult.segments?.technical && (
                  <div className="bg-gray-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-semibold text-gray-600 uppercase">Technical 技術</h5>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedPromptResult.segments.technical);
                        }}
                        className="text-xs text-gray-600 hover:text-gray-800"
                      >
                        📋 複製
                      </button>
                    </div>
                    <p className="text-sm text-gray-800 font-mono leading-relaxed">
                      {generatedPromptResult.segments.technical}
                    </p>
                  </div>
                )}

                {/* Full Prompt */}
                {generatedPromptResult.prompt && (
                  <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-semibold text-white uppercase">✨ 完整 SeedDance Prompt</h5>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedPromptResult.prompt);
                        }}
                        className="text-xs text-white/80 hover:text-white"
                      >
                        📋 複製完整提示詞
                      </button>
                    </div>
                    <p className="text-sm text-gray-100 font-mono leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {generatedPromptResult.prompt}
                    </p>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h5 className="text-sm font-semibold text-yellow-700 mb-2">📋 操作說明</h5>
                <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                  <li>複製上方的完整提示詞或各區段提示詞</li>
                  <li>前往 <a href="https://seedance.com" target="_blank" rel="noopener noreferrer" className="text-purple-600 underline hover:text-purple-800">SeedDance</a> 生成影片</li>
                  <li>將 SeedDance 生成的影片網址貼回此頁面（點擊圖片的 🎬 按鈕）</li>
                </ol>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedPromptResult.prompt);
                  }}
                  className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                >
                  📋 複製完整提示詞
                </button>
                <button
                  onClick={() => setGeneratedPromptResult(null)}
                  className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                >
                  完成
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
