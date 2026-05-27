"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { getCharactersGallery, getCharacterGallery, deleteCharacterImage } from "@/lib/api";

interface CharacterSummary {
  id: number;
  character_number: string;
  name: string;
  core_features: string;
  anchor_features: string;
  style: string;
  latest_image: string | null;
  image_count: number;
  outfit_options: string[];
  expression_options: string[];
}

interface GalleryImage {
  id: number;
  image_path: string;
  prompt: string;
  outfit: string;
  expression: string;
  angle: string;
  variant_info?: { [key: string]: string };
  created_at: string;
}

interface GalleryData {
  character: {
    id: number;
    character_number: string;
    name: string;
    core_features: string;
    anchor_features: string;
    style: string;
  };
  images: GalleryImage[];
  total_count: number;
  filter_type: string | null;
}

export default function CharacterGalleryPage() {
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [selectedChar, setSelectedChar] = useState<CharacterSummary | null>(null);
  const [gallery, setGallery] = useState<GalleryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [viewMode, _setViewMode] = useState<"grid" | "masonry">("grid");
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);

  useEffect(() => {
    loadCharacters();
  }, []);

  useEffect(() => {
    if (selectedChar) {
      loadGallery(selectedChar.id);
    }
  }, [selectedChar, filterType]);

  const loadCharacters = async () => {
    try {
      const data = await getCharactersGallery();
      setCharacters(data);
      if (data.length > 0 && !selectedChar) {
        setSelectedChar(data[0]);
      }
    } catch (error) {
      console.error("Failed to load characters:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadGallery = async (charId: number) => {
    try {
      const type = filterType === "all" ? undefined : filterType;
      const data = await getCharacterGallery(charId, type);
      setGallery(data);
    } catch (error) {
      console.error("Failed to load gallery:", error);
    }
  };

  const handleDeleteImage = async (imgId: number) => {
    if (!selectedChar || !confirm("確定要刪除這張圖片嗎？此操作無法復原。")) {
      return;
    }

    setDeletingImageId(imgId);
    try {
      await deleteCharacterImage(selectedChar.id, imgId);
      // 重新載入圖集
      await loadGallery(selectedChar.id);
    } catch (error) {
      console.error("Failed to delete image:", error);
      alert("刪除失敗");
    } finally {
      setDeletingImageId(null);
    }
  };

  const getImageUrl = (path: string) => {
    if (!path) return "/placeholder.png";
    const normalized = path.replace("/Volumes/Transcend/manga-studio", "");
    return `http://localhost:8000${normalized}`;
  };

  const getUniqueValues = (type: "outfit" | "expression" | "angle") => {
    if (!gallery?.images) return [];
    const values = new Set<string>();
    gallery.images.forEach((img: GalleryImage) => {
      const info = img.variant_info || {};
      if (info[type] && info[type] !== "neutral" && info[type] !== "front view") {
        values.add(info[type]);
      }
    });
    return Array.from(values);
  };

  const outfits = getUniqueValues("outfit");
  const expressions = getUniqueValues("expression");
  const angles = getUniqueValues("angle");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">載入中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/characters" className="text-blue-500 hover:underline">
                ← 返回角色管理
              </Link>
              <h1 className="text-2xl font-bold">角色圖集</h1>
              <Link href="/characters/songs" className="text-pink-600 hover:underline font-medium">
                🎵 角色音樂
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {characters.length} 個角色
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Character Sidebar */}
          <div className="w-72 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="font-semibold mb-4">角色列表</h2>
              <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto">
                {characters.map((char) => (
                  <button
                    key={char.id}
                    onClick={() => setSelectedChar(char)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedChar?.id === char.id
                        ? "bg-blue-50 border-2 border-blue-500"
                        : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                        {char.latest_image ? (
                          <img
                            src={getImageUrl(char.latest_image)}
                            alt={char.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            無圖
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-500">
                            {char.character_number}
                          </span>
                          <span className="font-medium truncate">{char.name}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {char.image_count} 張圖片
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {characters.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    尚無角色
                    <Link href="/characters" className="block text-blue-500 mt-2">
                      前往創建 →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Gallery */}
          <div className="flex-1">
            {selectedChar && gallery ? (
              <div className="bg-white rounded-lg shadow-sm">
                {/* Character Header */}
                <div className="p-6 border-b">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl font-bold">{selectedChar.name}</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm font-mono rounded">
                          {selectedChar.character_number}
                        </span>
                      </div>
                      {selectedChar.core_features && (
                        <p className="text-gray-600 text-sm mb-2">
                          {selectedChar.core_features}
                        </p>
                      )}
                      {selectedChar.anchor_features && (
                        <p className="text-gray-500 text-xs">
                          錨點：{selectedChar.anchor_features}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-blue-600">
                        {gallery.total_count}
                      </div>
                      <div className="text-gray-500 text-sm">張圖片</div>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="mt-4 flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">篩選：</span>
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-3 py-1.5 border rounded-lg text-sm"
                      >
                        <option value="all">全部</option>
                        {outfits.length > 0 && <option value="outfit">按服裝</option>}
                        {expressions.length > 0 && (
                          <option value="expression">按表情</option>
                        )}
                        {angles.length > 0 && <option value="angle">按角度</option>}
                      </select>
                    </div>

                    {filterType !== "all" && gallery.total_count > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {gallery.images.map((img: GalleryImage, idx: number) => {
                          const info = img.variant_info || {};
                          const label = info[filterType] || "預設";
                          return (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                            >
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Gallery Grid */}
                <div className="p-6">
                  {gallery.images.length > 0 ? (
                    <div
                      className={
                        viewMode === "masonry"
                          ? "columns-3 space-y-4"
                          : "grid grid-cols-3 gap-4"
                      }
                    >
                      {gallery.images.map((img: GalleryImage) => {
                        const info = img.variant_info || {};
                        return (
                          <div
                            key={img.id}
                            className={`relative group rounded-lg overflow-hidden bg-gray-100 ${
                              viewMode === "masonry" ? "break-inside-avoid" : ""
                            }`}
                          >
                            <img
                              src={getImageUrl(img.image_path)}
                              alt={`${selectedChar.name} variant`}
                              className="w-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                            {/* Delete Button - Always Visible */}
                            <button
                              onClick={() => handleDeleteImage(img.id)}
                              disabled={deletingImageId === img.id}
                              className={`absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg z-10 ${
                                deletingImageId === img.id ? "opacity-50 cursor-not-allowed" : ""
                              }`}
                              title="刪除圖片"
                            >
                              {deletingImageId === img.id ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                            </button>
                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-end">
                              <div className="p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity w-full">
                                <div className="text-xs space-y-1">
                                  {info.outfit && info.outfit !== "default" && (
                                    <div>服裝：{info.outfit}</div>
                                  )}
                                  {info.expression && (
                                    <div>表情：{info.expression}</div>
                                  )}
                                  {info.angle && (
                                    <div>角度：{info.angle}</div>
                                  )}
                                  {!info.outfit &&
                                    !info.expression &&
                                    !info.angle && (
                                      <div>初始形象</div>
                                    )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <p>尚無圖片</p>
                      <Link
                        href="/characters"
                        className="text-blue-500 hover:underline mt-2 inline-block"
                      >
                        前往生成 →
                      </Link>
                    </div>
                  )}
                </div>

                {/* Quick Stats */}
                {(outfits.length > 0 ||
                  expressions.length > 0 ||
                  angles.length > 0) && (
                  <div className="px-6 pb-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-medium text-sm mb-3">變體統計</h3>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        {outfits.length > 0 && (
                          <div>
                            <div className="text-2xl font-bold text-purple-600">
                              {outfits.length}
                            </div>
                            <div className="text-xs text-gray-500">服裝變化</div>
                          </div>
                        )}
                        {expressions.length > 0 && (
                          <div>
                            <div className="text-2xl font-bold text-orange-600">
                              {expressions.length}
                            </div>
                            <div className="text-xs text-gray-500">表情變化</div>
                          </div>
                        )}
                        {angles.length > 0 && (
                          <div>
                            <div className="text-2xl font-bold text-green-600">
                              {angles.length}
                            </div>
                            <div className="text-xs text-gray-500">角度變化</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <div className="text-gray-400 text-6xl mb-4">📁</div>
                <h2 className="text-xl font-semibold mb-2">選擇一個角色</h2>
                <p className="text-gray-500">
                  從左側列表選擇角色以查看其圖集
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
