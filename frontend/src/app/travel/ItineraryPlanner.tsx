"use client";
import { useState, useEffect } from "react";
import { ALL_ATTRACTIONS, Attraction } from "./data";

interface PlannedDay {
  day: string;        // e.g. "D1", "D2"
  title: string;       // e.g. "姑蘇雅韻"
  description: string; // e.g. "漫游蘇州留園..."
  attractions: string[]; // attraction names
}

interface ItineraryPlannerProps {
  onUpdateAttractions: (attractions: string[]) => void;
}

const STORAGE_KEY = "hangzhou-trip-itinerary";

const PRESET_ITINERARY: PlannedDay[] = [
  {
    day: "D1",
    title: "台北 ➔ 上海",
    description: "上午至下午抵達上海並辦理入關。傍晚搭乘磁浮列車（NT$200）快速抵達龍陽路站。晚上前往南京東路步行街，觀賞外攤夜景（19:00點燈），晚餐享用海底撈（NT$500）。住宿南京東路附近飯店。",
    attractions: ["外攤夜景", "南京東路步行街", "海底撈火鍋"],
  },
  {
    day: "D2",
    title: "上海 ➔ 西塘",
    description: "早餐品嚐小楊生煎。上午漫遊豫園、城隍廟，並在南翔饅頭店用餐。下午前往上海南站搭乘長途巴士前往西塘古鎮（NT$40）。晚上抵達西塘，晚餐安排椒鹽醄醄火鍋。住宿西塘古鎮景區內。",
    attractions: ["小楊生煎", "豫園", "城隍廟", "南翔饅頭", "西塘古鎮"],
  },
  {
    day: "D3",
    title: "西塘 ➔ 烏鎮東柵",
    description: "清晨08:00前進入西塘景區可享免門票優惠。上午體驗江南戲曲服飾換裝拍照。下午打車離開西塘前往烏鎮。晚上於水宴餐廳用餐後入住東柵景區。",
    attractions: ["西塘古鎮", "江南戲曲服飾", "水宴餐廳", "烏鎮東柵"],
  },
  {
    day: "D4",
    title: "烏鎮西柵深度一日遊",
    description: "全天轉往烏鎮西柵。西柵規模較大且開發完善，整日於景區內自由行，感受小橋流水的慢生活。夜晚欣賞西柵著名夜景。住宿烏鎮西柵景區內飯店。",
    attractions: ["烏鎮西柵", "白蓮塔", "昭明書院", "木心美術館", "搖櫓船"],
  },
  {
    day: "D5",
    title: "烏鎮 ➔ 杭州西湖",
    description: "上午打車前往杭州市區。下午開啟西湖十景自由行模式（斷橋、蘇堤等）。晚上逛武林夜市品嚐在地小吃。住宿杭州西湖仁和飯店。",
    attractions: ["西湖（主湖區）", "斷橋殘雪", "蘇堤", "武林夜市", "河坊街"],
  },
  {
    day: "D6",
    title: "杭州宋城文化體驗",
    description: "早餐杭州老字號游埠豆漿。下午觀賞《宋城千古情》大型實景演藝（票價約NT$1,600）。晚上遊覽河坊街、南宋御街，晚餐於馬驚興餐廳。住宿杭州西湖仁和飯店。",
    attractions: ["游埠豆漿", "宋城千古情", "河坊街", "馬驚興餐廳"],
  },
  {
    day: "D7",
    title: "杭州運河與宮廷晚宴",
    description: "早餐前往大馬弄體驗最具市井氣息的早餐市集。下午參訪宮宴或安排京杭大運河巡禮（預算較高，NT$2,670）。住宿杭州西湖仁和飯店。",
    attractions: ["大馬弄", "京杭大運河遊船", "宮宴"],
  },
  {
    day: "D8",
    title: "杭州 ➔ 台北",
    description: "上午杭州市區最後巡禮，選購伴手禮。下午前往杭州蕭山機場準備登機。晚上返抵台北，回到溫暖的家。",
    attractions: ["西湖（主湖區）", "龍井茶園"],
  },
];

export default function ItineraryPlanner({ onUpdateAttractions }: ItineraryPlannerProps) {
  const [itinerary, setItinerary] = useState<PlannedDay[]>([]);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PlannedDay>>({});
  const [showAddDay, setShowAddDay] = useState(false);
  const [newDay, setNewDay] = useState({ day: "", title: "" });
  const [selectedAttraction, setSelectedAttraction] = useState<string>("");
  const [showAttractionPicker, setShowAttractionPicker] = useState<string | null>(null);
  const [showTextImport, setShowTextImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [dragState, setDragState] = useState<{ dayKey: string; fromIndex: number } | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Parse text import
  const handleTextImport = () => {
    if (!importText.trim()) return;
    
    const lines = importText.split("\n");
    const newItinerary: PlannedDay[] = [];
    let currentDay: PlannedDay | null = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Match day header like "📍 D1 启程赴沪", "D1 启程赴沪", "D1: 启程赴沪"
      const dayMatch = trimmed.match(/^[📍]*\s*D(\d+)[：:\s]+(.+)/i) 
        || trimmed.match(/^[📍]*\s*D(\d+)[　\s]*([^\n🖼️📷🎑][^\n]*)/)
        || trimmed.match(/^[📍]*\s*D(\d+)\s+(.+)/);
      if (dayMatch) {
        if (currentDay) newItinerary.push(currentDay);
        currentDay = {
          day: `D${dayMatch[1]}`,
          title: dayMatch[2] || dayMatch[3] || `Day ${dayMatch[1]}`,
          description: "",
          attractions: [],
        };
        continue;
      }
      
      // Match image line "🖼️：xxx/yyy/zzz" or "🖼️ xxx/yyy/zzz"
      const imgMatch = trimmed.match(/^[🖼️📷🎑]*[：:：\s]+(.+)/);
      if (imgMatch && currentDay) {
        const attractions = imgMatch[1].split(/[/、/／]/).map(s => s.trim()).filter(Boolean);
        currentDay.attractions = attractions;
        continue;
      }
      
      // Description text - add to current day
      if (currentDay && trimmed.length > 10 && !trimmed.startsWith('✨') && !trimmed.startsWith('🌧️')) {
        currentDay.description = trimmed;
      }
    }
    
    if (currentDay) newItinerary.push(currentDay);
    
    if (newItinerary.length > 0) {
      setItinerary(newItinerary);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newItinerary));
    }
    
    setShowTextImport(false);
    setImportText("");
  };

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure all days have attractions array
        setItinerary(parsed.map((d: PlannedDay) => ({ ...d, attractions: d.attractions || [] })));
      } catch {
        setItinerary(PRESET_ITINERARY);
      }
    } else {
      setItinerary(PRESET_ITINERARY);
    }
  }, []);

  // Save to localStorage when itinerary changes
  useEffect(() => {
    if (itinerary.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(itinerary));
    }
    // Extract all attractions and notify parent
    const allAttractions = itinerary.flatMap(d => d.attractions);
    onUpdateAttractions(allAttractions);
  }, [itinerary, onUpdateAttractions]);

  const handleEditDay = (day: PlannedDay) => {
    setEditingDay(day.day);
    setEditForm({ ...day });
  };

  const handleSaveEdit = () => {
    if (!editForm.day) return;
    setItinerary(prev => prev.map(d => d.day === editForm.day ? { ...d, ...editForm } as PlannedDay : d));
    setEditingDay(null);
    setEditForm({});
  };

  const handleCancelEdit = () => {
    setEditingDay(null);
    setEditForm({});
  };

  const handleDeleteDay = (dayToDelete: string) => {
    if (confirm(`確定要刪除 ${dayToDelete} 嗎？`)) {
      setItinerary(prev => prev.filter(d => d.day !== dayToDelete));
    }
  };

  const handleAddDay = () => {
    if (!newDay.day || !newDay.title) {
      alert("請填寫天數和標題");
      return;
    }
    // Check if day already exists
    if (itinerary.some(d => d.day === newDay.day)) {
      alert(` ${newDay.day} 已存在`);
      return;
    }
    setItinerary(prev => [...prev, { ...newDay, description: "", attractions: [] }]);
    setNewDay({ day: "", title: "" });
    setShowAddDay(false);
  };

  const handleAddAttraction = (dayKey: string) => {
    if (!selectedAttraction) return;
    setItinerary(prev => prev.map(d => {
      if (d.day === dayKey && !d.attractions.includes(selectedAttraction)) {
        return { ...d, attractions: [...d.attractions, selectedAttraction] };
      }
      return d;
    }));
    setSelectedAttraction("");
    setShowAttractionPicker(null);
  };

  const handleRemoveAttraction = (dayKey: string, attraction: string) => {
    setItinerary(prev => prev.map(d => {
      if (d.day === dayKey) {
        return { ...d, attractions: d.attractions.filter(a => a !== attraction) };
      }
      return d;
    }));
  };

  const handleMoveAttraction = (dayKey: string, fromIndex: number, direction: "up" | "down") => {
    setItinerary(prev => prev.map(d => {
      if (d.day === dayKey) {
        const newAttractions = [...d.attractions];
        const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
        if (toIndex < 0 || toIndex >= newAttractions.length) return d;
        [newAttractions[fromIndex], newAttractions[toIndex]] = [newAttractions[toIndex], newAttractions[fromIndex]];
        return { ...d, attractions: newAttractions };
      }
      return d;
    }));
  };

  const handleDragStart = (dayKey: string, fromIndex: number) => {
    setDragState({ dayKey, fromIndex });
  };

  const handleDragOver = (e: React.DragEvent, attrIndex: number) => {
    e.preventDefault();
    setDragOverIndex(attrIndex);
  };

  const handleDrop = (dayKey: string, toIndex: number) => {
    if (!dragState || dragState.dayKey !== dayKey || dragState.fromIndex === toIndex) {
      setDragState(null);
      setDragOverIndex(null);
      return;
    }
    setItinerary(prev => prev.map(d => {
      if (d.day === dayKey) {
        const newAttractions = [...d.attractions];
        const [moved] = newAttractions.splice(dragState.fromIndex, 1);
        newAttractions.splice(toIndex, 0, moved);
        return { ...d, attractions: newAttractions };
      }
      return d;
    }));
    setDragState(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragState(null);
    setDragOverIndex(null);
  };

  const matchedAttractions = selectedAttraction
    ? ALL_ATTRACTIONS.filter(a => a.name.includes(selectedAttraction) || selectedAttraction.includes(a.name))
    : ALL_ATTRACTIONS.slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-bold">📝 我的行程規劃</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTextImport(true)}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
          >
            📋 貼上行程文字
          </button>
          <button
            onClick={() => setShowAddDay(true)}
            className="px-3 py-1.5 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 transition-colors"
          >
            + 新增天數
          </button>
        </div>
      </div>

      {/* Text Import Modal */}
      {showTextImport && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium mb-2">📋 貼上行程文字</h4>
          <p className="text-xs text-gray-600 mb-3">
            貼上你的行程大綱，格式如：<br/>
            <code className="bg-gray-200 px-1 rounded">📍 D1 標題</code><br/>
            <code className="bg-gray-200 px-1 rounded">🖼️：景點1/景點2/景點3</code><br/>
            描述文字...
          </p>
          <textarea
            value={importText}
            onChange={e => setImportText(e.target.value)}
            placeholder="🌧️烟雨江南·6天5晚诗意之旅

📍 D1 启程赴沪
🖼️：机场接机/上海酒店夜景/城市天际线
24小时专车接机...

📍 D2 姑苏雅韵
🖼️：留园亭台楼阁/寒山寺古寺全景/拈花湾夜景灯光
..."
            className="w-full border rounded px-3 py-2 text-sm h-48 font-mono"
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleTextImport}
              className="px-4 py-2 bg-teal-500 text-white text-sm rounded hover:bg-teal-600"
            >
              匯入行程
            </button>
            <button
              onClick={() => { setShowTextImport(false); setImportText(""); }}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
            >
              取消
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">
        點擊編輯調整行程。景點支援拖曳排序（hover 後拖 ⋮⋮ 移動順序）。資料會自動儲存。
      </p>

      {/* Add Day Modal */}
      {showAddDay && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
          <h4 className="font-medium mb-3">新增天數</h4>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input
              placeholder="天數，例如：D1"
              value={newDay.day}
              onChange={e => setNewDay({ ...newDay, day: e.target.value })}
              className="border rounded px-3 py-2 text-sm"
            />
            <input
              placeholder="標題，例如：杭州尋茶"
              value={newDay.title}
              onChange={e => setNewDay({ ...newDay, title: e.target.value })}
              className="border rounded px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddDay}
              className="px-4 py-2 bg-teal-500 text-white text-sm rounded hover:bg-teal-600"
            >
              確認新增
            </button>
            <button
              onClick={() => { setShowAddDay(false); setNewDay({ day: "", title: "" }); }}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Itinerary List */}
      <div className="space-y-3">
        {itinerary.map((day, index) => (
          <div key={day.day} className="border rounded-lg overflow-hidden">
            {/* Day Header */}
            <div
              className={`p-4 ${editingDay === day.day ? "bg-teal-50" : "bg-gray-50"}`}
            >
              {editingDay === day.day ? (
                // Edit Mode
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      placeholder="天數"
                      value={editForm.day || ""}
                      onChange={e => setEditForm({ ...editForm, day: e.target.value })}
                      className="border rounded px-3 py-2 text-sm"
                    />
                    <input
                      placeholder="標題"
                      value={editForm.title || ""}
                      onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                      className="border rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <textarea
                    placeholder="描述..."
                    value={editForm.description || ""}
                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm h-20"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="px-4 py-2 bg-teal-500 text-white text-sm rounded hover:bg-teal-600"
                    >
                      儲存
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="bg-teal-500 text-white px-2 py-1 rounded text-sm font-bold">
                      {day.day}
                    </span>
                    <div>
                      <h4 className="font-bold">{day.title}</h4>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{day.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditDay(day)}
                      className="text-teal-600 hover:text-teal-800 text-sm"
                    >
                      編輯
                    </button>
                    <button
                      onClick={() => handleDeleteDay(day.day)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Attractions */}
            {editingDay !== day.day && (
              <div className="p-4 bg-white">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-700">景點：</span>
                  {(!day.attractions || day.attractions.length === 0) && (
                    <span className="text-sm text-gray-400">尚未添加景點</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(day.attractions || []).map((attraction, attrIndex) => (
                    <div
                      key={attraction}
                      draggable
                      onDragStart={() => handleDragStart(day.day, attrIndex)}
                      onDragOver={(e) => handleDragOver(e, attrIndex)}
                      onDrop={() => handleDrop(day.day, attrIndex)}
                      onDragEnd={handleDragEnd}
                      className={`group relative bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-full text-sm flex items-center gap-1 cursor-grab active:cursor-grabbing transition-all ${
                        dragState?.dayKey === day.day && dragState?.fromIndex === attrIndex ? "opacity-40" : ""
                      } ${
                        dragOverIndex === attrIndex && dragState?.dayKey === day.day ? "ring-2 ring-teal-400 ring-offset-1" : ""
                      }`}
                    >
                      {/* Drag handle */}
                      <span className="text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab mr-0.5 select-none" title="拖曳排序">⋮⋮</span>
                      <span>{attraction}</span>
                      <div className="flex items-center gap-0.5">
                        {attrIndex > 0 && (
                          <button
                            onClick={() => handleMoveAttraction(day.day, attrIndex, "up")}
                            className="text-emerald-600 hover:text-emerald-800 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="往上移動"
                          >
                            ↑
                          </button>
                        )}
                        {attrIndex < (day.attractions?.length ?? 0) - 1 && (
                          <button
                            onClick={() => handleMoveAttraction(day.day, attrIndex, "down")}
                            className="text-emerald-600 hover:text-emerald-800 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="往下移動"
                          >
                            ↓
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveAttraction(day.day, attraction)}
                          className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                          title="移除"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowAttractionPicker(day.day)}
                  className="text-sm text-teal-600 hover:text-teal-800 flex items-center gap-1"
                >
                  + 添加景點
                </button>

                {/* Attraction Picker */}
                {showAttractionPicker === day.day && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <input
                      placeholder="搜尋景點..."
                      value={selectedAttraction}
                      onChange={e => setSelectedAttraction(e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm mb-2"
                      autoFocus
                    />
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {matchedAttractions.map(attr => (
                        <button
                          key={attr.name}
                          onClick={() => {
                            setItinerary(prev => prev.map(d => {
                              if (d.day === day.day && !d.attractions.includes(attr.name)) {
                                return { ...d, attractions: [...d.attractions, attr.name] };
                              }
                              return d;
                            }));
                            setSelectedAttraction("");
                            setShowAttractionPicker(null);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex justify-between items-center"
                        >
                          <span>{attr.name}</span>
                          <span className="text-xs text-gray-400">{attr.ticket}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => { setShowAttractionPicker(null); setSelectedAttraction(""); }}
                      className="mt-2 text-sm text-gray-500 hover:text-gray-700"
                    >
                      關閉
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {itinerary.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>還沒有行程規劃</p>
          <p className="text-sm mt-1">點擊「新增天數」開始規劃你的江南之旅</p>
        </div>
      )}
    </div>
  );
}
