"use client";
import { useState, useEffect } from "react";
import { getCharacters, generateCharacter, generateCharacterVariant, deleteCharacter, Character } from "@/lib/api";

export default function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [generating, setGenerating] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [variantModal, setVariantModal] = useState<{ char: Character; variants: string[] } | null>(null);
  const [variantForm, setVariantForm] = useState({
    outfit: "",
    expression: "",
    angle: "front view",
    num_images: 3,
  });
  const [generatingVariant, setGeneratingVariant] = useState(false);
  const [form, setForm] = useState({
    name: "",
    core_features: "",
    anchor_features: "",
    default_outfit: "",
    hairstyle: "",
    skin_tone: "",
    style: "photorealistic",
    use_reference: false,
  });

  useEffect(() => {
    loadCharacters();
  }, []);

  const loadCharacters = () => {
    getCharacters().then(setCharacters);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.core_features.trim()) return;
    
    setGenerating(true);
    setPreviewImage(null);
    try {
      const result = await generateCharacter(form);
      if (result.images && result.images.length > 0) {
        const imageUrl = result.images[0].replace("/Volumes/Transcend/manga-studio", "");
        setPreviewImage(`http://localhost:8000${imageUrl}`);
      }
      loadCharacters();
      setForm({
        name: "",
        core_features: "",
        anchor_features: "",
        default_outfit: "",
        hairstyle: "",
        skin_tone: "",
        style: "photorealistic",
        use_reference: false,
      });
    } catch (err) {
      console.error(err);
      alert("生成失敗");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateVariant = async () => {
    if (!variantModal) return;
    
    setGeneratingVariant(true);
    try {
      const result = await generateCharacterVariant(variantModal.char.id, variantForm);
      if (result.images && result.images.length > 0) {
        const variantUrls = result.images.map((path: string) => 
          `http://localhost:8000${path.replace("/Volumes/Transcend/manga-studio", "")}`
        );
        setVariantModal({ ...variantModal, variants: variantUrls });
        
        // 顯示成功訊息（包含部分成功的警告）
        if (result.message) {
          alert(result.message);
        } else {
          alert(`成功生成 ${result.images.length} 張圖片！`);
        }
        
        // 重新載入角色列表以更新圖片計數
        loadCharacters();
      } else {
        alert("生成失敗：沒有成功生成的圖片");
      }
    } catch (err: any) {
      console.error(err);
      const errorMsg = err?.response?.data?.detail || err?.message || "生成變體失敗";
      alert(`生成變體失敗: ${errorMsg}`);
    } finally {
      setGeneratingVariant(false);
    }
  };

  const handleDeleteCharacter = async (charId: number, charName: string) => {
    if (!confirm(`確定要刪除角色「${charName}」嗎？\n\n這會刪除角色及其所有 ${characters.find(c => c.id === charId)?.image_count || 0} 張圖片，此操作無法復原。`)) {
      return;
    }

    try {
      await deleteCharacter(charId);
      loadCharacters();
    } catch (err) {
      console.error(err);
      alert("刪除失敗");
    }
  };

  const getImageUrl = (imagePath: string | null | undefined) => {
    if (!imagePath) return null;
    return `http://localhost:8000${imagePath.replace("/Volumes/Transcend/manga-studio", "")}`;
  };

  const angles = [
    { value: "front view", label: "正面" },
    { value: "side view", label: "側面" },
    { value: "back view", label: "背面" },
    { value: "close-up portrait", label: "特寫" },
    { value: "wide shot", label: "全景" },
    { value: "three-quarter view", label: "三分視角" },
  ];

  // Backend already parses JSON fields, so these are already arrays
  const outfits = variantModal?.char?.outfit_options || [];
  const expressions = variantModal?.char?.expression_options || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">角色管理</h1>
        <div className="flex items-center gap-4">
          <a href="/story-bible" className="text-indigo-600 hover:underline font-medium" target="_blank">
            📖 故事聖經
          </a>
          <a href="/characters/diaries" className="text-purple-600 hover:underline font-medium">
            📔 角色日記
          </a>
          <a href="/characters/gallery" className="text-purple-600 hover:underline font-medium">
            📖 角色圖集
          </a>
          <a href="/characters/songs" className="text-pink-600 hover:underline font-medium">
            🎵 角色音樂
          </a>
          <a href="/characters/portfolio" className="text-yellow-600 hover:underline font-medium">
            📷 角色影集
          </a>
          <a href="/characters/voice-test" className="text-pink-600 hover:underline font-medium">
            🎤 音色測試
          </a>
          <a href="/dashboard" className="text-blue-500 hover:underline">← 返回儀表板</a>
        </div>
      </div>

      {/* Preview */}
      {previewImage && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-2">生成預覽</h3>
          <img 
            src={previewImage} 
            alt="Generated preview" 
            className="max-w-xs rounded-lg shadow-lg"
          />
        </div>
      )}

      {/* Create Form */}
      <form onSubmit={handleSubmit} className="mb-8 p-6 bg-gray-50 rounded-lg shadow-sm">
        <h2 className="font-bold text-lg mb-4">新增角色（AI 生成）</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">角色名稱 *</label>
            <input
              placeholder="例如：陽光運動妹"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border p-2 rounded"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">風格</label>
            <select
              value={form.style}
              onChange={(e) => setForm({ ...form, style: e.target.value })}
              className="w-full border p-2 rounded"
            >
              <option value="photorealistic">寫實風</option>
              <option value="anime">動漫風</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">核心特徵 *（必填，確保跨集一致性）</label>
            <textarea
              placeholder="例如：A 23-year-old Taiwanese athletic woman, fit and toned physique, high ponytail, energetic sparkling eyes, confident radiant smile"
              value={form.core_features}
              onChange={(e) => setForm({ ...form, core_features: e.target.value })}
              className="w-full border p-2 rounded h-20"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">錨點特徵（痣、酒窩、胎記等，確保同一人）</label>
            <input
              placeholder="例如：Small dimple on the left cheek, tiny mole under the right eye"
              value={form.anchor_features}
              onChange={(e) => setForm({ ...form, anchor_features: e.target.value })}
              className="w-full border p-2 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">髮型</label>
            <input
              placeholder="例如：high ponytail with slightly messy black hair"
              value={form.hairstyle}
              onChange={(e) => setForm({ ...form, hairstyle: e.target.value })}
              className="w-full border p-2 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">膚色</label>
            <input
              placeholder="例如：sun-kissed tanned skin"
              value={form.skin_tone}
              onChange={(e) => setForm({ ...form, skin_tone: e.target.value })}
              className="w-full border p-2 rounded"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">預設穿著</label>
            <input
              placeholder="例如：premium sage green sports bra and high-waisted yoga leggings"
              value={form.default_outfit}
              onChange={(e) => setForm({ ...form, default_outfit: e.target.value })}
              className="w-full border p-2 rounded"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={generating || !form.name.trim() || !form.core_features.trim()}
          className="mt-4 bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {generating ? "生成中..." : "生成角色"}
        </button>
      </form>

      {/* Characters Grid */}
      <h2 className="font-bold text-lg mb-4">角色列表（共 {characters.length} 人）</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {characters.map((char) => {
          const imageUrl = getImageUrl(char.image_path);
          return (
            <div key={char.id} className="border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
              {/* 縮圖 */}
              {imageUrl ? (
                <div className="aspect-square bg-gray-100 relative">
                  <img 
                    src={imageUrl}
                    alt={char.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-square bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400">無圖片</span>
                </div>
              )}
              
              {/* 資訊 */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {char.character_number}
                    </span>
                    <h3 className="font-bold text-lg mt-1">{char.name}</h3>
                  </div>
                  <span className="text-xs bg-gray-200 px-2 py-1 rounded">{char.style || "anime"}</span>
                </div>
                <p className="text-sm text-gray-600 mb-1 line-clamp-2">
                  {char.core_features?.slice(0, 80)}...
                </p>
                {char.anchor_features && (
                  <p className="text-xs text-gray-500 mb-2">
                    錨點: {char.anchor_features?.slice(0, 40)}...
                  </p>
                )}
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span>{char.image_count || 0} / 20 張圖片</span>
                  {(char.image_count ?? 0) >= 20 && (
                    <span className="text-red-500 font-medium">已達上限</span>
                  )}
                </div>
                <button
                  onClick={() => setVariantModal({ char, variants: [] })}
                  disabled={(char.image_count ?? 0) >= 20}
                  className={`w-full mt-2 px-4 py-2 rounded transition-colors ${
                    (char.image_count ?? 0) >= 20
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-green-500 text-white hover:bg-green-600"
                  }`}
                >
                  {(char.image_count ?? 0) >= 20 ? "已達上限" : "繼續生成"}（{char.image_count || 0}/20）
                </button>
                <button
                  onClick={() => handleDeleteCharacter(char.id, char.name)}
                  className="w-full mt-2 px-4 py-2 rounded border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
                >
                  刪除角色
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {characters.length === 0 && (
        <p className="text-gray-500 text-center py-8">還沒有角色，請使用上方表單新增</p>
      )}

      {/* Variant Modal */}
      {variantModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {variantModal.char.character_number}
                  </span>
                  <h2 className="text-xl font-bold">繼續生成：{variantModal.char.name}</h2>
                  <span className="text-sm text-gray-500">
                    {variantModal.char.image_count || 0}/20 張
                  </span>
                </div>
                <button
                  onClick={() => setVariantModal(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* 當前角色的核心特徵（鎖定） */}
              <div className="mb-4 p-3 bg-gray-100 rounded text-sm">
                <div className="font-medium mb-1">核心特徵（固定不變）</div>
                <p className="text-gray-600">{variantModal.char.core_features}</p>
                {variantModal.char.anchor_features && (
                  <p className="text-gray-500 mt-1">錨點: {variantModal.char.anchor_features}</p>
                )}
              </div>

              {/* 變體選項 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">角度</label>
                  <select
                    value={variantForm.angle}
                    onChange={(e) => setVariantForm({ ...variantForm, angle: e.target.value })}
                    className="w-full border p-2 rounded"
                  >
                    {angles.map(a => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">表情</label>
                  <input
                    placeholder="例如：happy smile, surprised"
                    value={variantForm.expression}
                    onChange={(e) => setVariantForm({ ...variantForm, expression: e.target.value })}
                    className="w-full border p-2 rounded"
                  />
                  {expressions.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {expressions.map((exp: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => setVariantForm({ ...variantForm, expression: exp })}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                        >
                          {exp}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">穿著</label>
                  <input
                    placeholder="例如：white dress, casual jeans"
                    value={variantForm.outfit}
                    onChange={(e) => setVariantForm({ ...variantForm, outfit: e.target.value })}
                    className="w-full border p-2 rounded"
                  />
                  {outfits.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {outfits.map((out: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => setVariantForm({ ...variantForm, outfit: out })}
                          className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                        >
                          {out}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">生成數量</label>
                <select
                  value={variantForm.num_images}
                  onChange={(e) => setVariantForm({ ...variantForm, num_images: parseInt(e.target.value) })}
                  className="border p-2 rounded"
                >
                  <option value={1}>1 張</option>
                  <option value={3}>3 張</option>
                  <option value={5}>5 張</option>
                  <option value={9}>9 張</option>
                </select>
                {(variantModal.char.image_count ?? 0) >= 20 && (
                  <p className="text-red-500 text-sm mt-2">已達上限，無法繼續生成</p>
                )}
                {(variantModal.char.image_count ?? 0) + variantForm.num_images > 20 && (
                  <p className="text-orange-500 text-sm mt-2">
                    注意：將超出 20 張上限，請減少生成數量（目前 {variantModal.char.image_count ?? 0} 張，還可生成 {20 - (variantModal.char.image_count ?? 0)} 張）
                  </p>
                )}
              </div>

              <button
                onClick={handleGenerateVariant}
                disabled={generatingVariant || (variantModal.char.image_count ?? 0) >= 20}
                className="w-full bg-green-500 text-white px-6 py-3 rounded hover:bg-green-600 disabled:bg-gray-400 text-lg font-medium"
              >
                {generatingVariant ? "生成中..." : `生成 ${variantForm.num_images} 張變體`}
              </button>

              {/* 顯示生成的變體 */}
              {variantModal.variants.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-medium mb-3">生成結果</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {variantModal.variants.map((url, i) => (
                      <div key={i} className="aspect-square bg-gray-100 rounded overflow-hidden">
                        <img src={url} alt={`Variant ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
