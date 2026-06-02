"use client";
import { useState } from "react";
import { useCloudState } from "@/utils/useCloudState";

interface PackingItem {
  id: string;
  name: string;
  category: string;
  checked: boolean;
}

interface PackingCategory {
  key: string;
  emoji: string;
  label: string;
  items: string[];
}

const PACKING_LIST: PackingCategory[] = [
  {
    key: "documents",
    emoji: "📄",
    label: "證件文件",
    items: [
      "護照（有效期6個月以上）",
      "台胞證",
      "機票確認信",
      "飯店預訂確認",
      "旅平險保單",
      "緊急聯絡卡",
      "身分證"
    ],
  },
  {
    key: "money",
    emoji: "💰",
    label: "金錢",
    items: [
      "信用卡（Visa/Mastercard）",
      "金融卡（開通國外提款）",
      "新台幣現金",
      "支付寶設定完成",
      "零錢包"
    ],
  },
  {
    key: "electronics",
    emoji: "📱",
    label: "電子設備",
    items: [
      "手機",
      "充电器",
      "萬用轉接頭（兩腳扁型）",
      "行動電源",
      "相機/GoPro",
      "耳機",
      "筆電/平板（選帶）"
    ],
  },
  {
    key: "clothing",
    emoji: "👕",
    label: "穿搭建議",
    items: [
      "夏季輕薄衣物（3-4套）",
      "薄外套/防曬衫",
      "遮陽帽",
      "太陽眼鏡",
      "涼鞋/拖鞋",
      "舒適步行鞋",
      "雨具（折疊傘）",
      "泳衣（西湖邊可戲水）"
    ],
  },
  {
    key: "toiletries",
    emoji: "🧴",
    label: "盥洗用品",
    items: [
      "牙刷/牙膏",
      "洗臉慕斯",
      "防曬乳（SPF50+）",
      "曬後修復",
      "面膜（曬後保養）",
      "隱形眼鏡/藥水",
      "個人藥物",
      "常備藥（感冒藥/腸胃藥）"
    ],
  },
  {
    key: "travel",
    emoji: "🧳",
    label: "旅遊必備",
    items: [
      "行李箱",
      "隨身小包",
      "頸枕/眼罩（機上用）",
      "保溫水壺",
      "濕紙巾",
      "衛生紙",
      "口罩"
    ],
  },
];

const STORAGE_KEY = "hangzhou-trip-packing";

// Default packing items (built once at module load — SSR-safe).
const DEFAULT_PACKING_ITEMS: PackingItem[] = PACKING_LIST.flatMap(cat =>
  cat.items.map(item => ({
    id: `${cat.key}-${item}`,
    name: item,
    category: cat.key,
    checked: false,
  }))
);

export default function PackingChecklist() {
  // Cloud-synced packing list. The default is derived from PACKING_LIST,
  // computed once at module scope below.
  const [items, setItems] = useCloudState<PackingItem[]>(
    STORAGE_KEY,
    DEFAULT_PACKING_ITEMS
  );
  const [showOnlyUnchecked, setShowOnlyUnchecked] = useState(false);

  function toggleItem(id: string) {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  }

  function checkAll() {
    setItems(items.map(item => ({ ...item, checked: true })));
  }

  function uncheckAll() {
    setItems(items.map(item => ({ ...item, checked: false })));
  }

  const checkedCount = items.filter(i => i.checked).length;
  const totalCount = items.length;
  const percentPacked = Math.round((checkedCount / totalCount) * 100);

  const filteredItems = showOnlyUnchecked
    ? items.filter(i => !i.checked)
    : items;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-bold">📦 行李清單</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowOnlyUnchecked(!showOnlyUnchecked)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              showOnlyUnchecked
                ? "bg-teal-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {showOnlyUnchecked ? "顯示全部" : "只看未打包"}
          </button>
          <button
            onClick={checkAll}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
          >
            全選
          </button>
          <button
            onClick={uncheckAll}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
          >
            全取消
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-gray-100 rounded-full h-4 overflow-hidden">
        <div
          className="h-full transition-all duration-300 bg-gradient-to-r from-teal-400 to-teal-600"
          style={{ width: `${percentPacked}%` }}
        />
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">
          已打包 {checkedCount} / {totalCount} 項
        </span>
        <span className="text-teal-600 font-medium">{percentPacked}% 完成</span>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {PACKING_LIST.map(cat => {
          const catItems = filteredItems.filter(i => i.category === cat.key);
          if (catItems.length === 0 && showOnlyUnchecked) return null;
          
          const catChecked = catItems.filter(i => i.checked).length;
          
          return (
            <div key={cat.key} className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{cat.emoji}</span>
                  <span className="font-medium text-sm">{cat.label}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {catChecked} / {catItems.length}
                </span>
              </div>
              <div className="divide-y">
                {catItems.map(item => (
                  <label
                    key={item.id}
                    className={`flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                      item.checked ? "bg-gray-50/50" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleItem(item.id)}
                      className="w-4 h-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                    />
                    <span className={`text-sm ${
                      item.checked ? "text-gray-400 line-through" : "text-gray-700"
                    }`}>
                      {item.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reminder */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
        <div className="text-sm font-medium text-blue-800 mb-1">💡 出發前檢查</div>
        <ul className="text-xs text-blue-700 space-y-0.5">
          <li>• 確認護照有效期大於6個月</li>
          <li>• 支付寶已開通並充值</li>
          <li>• 手機開通國際漫遊 or 購買中國門號卡</li>
          <li>• 行李秤重（經濟艙約23kg限重）</li>
        </ul>
      </div>
    </div>
  );
}
