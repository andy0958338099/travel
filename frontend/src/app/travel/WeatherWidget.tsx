"use client";
import {
  useHangzhouWeather,
  getWeatherEmoji,
  getWeatherLabel,
} from "@/hooks/useHangzhouWeather";

// 🅒 7/15: 加天氣碼對應色票, 讓視覺一眼辨識
// 設計: 不同天氣對應不同色系 (晴=橘/琥珀, 多雲=灰/石板, 雨=藍, 雷暴=紅)
function getWeatherStyle(code: number): {
  bg: string;
  border: string;
  text: string;
  textStrong: string;
  emojiBg: string;
  emojiText: string;
} {
  // 0=晴 1=大致晴朗 2=局部多雲 3=陰天 45/48=霧
  // 51/53/55=毛毛雨 61/63/65=雨 71/73/75=雪
  // 80/81/82=陣雨 95/96/99=雷暴
  if (code === 0 || code === 1) {
    return {
      bg: "bg-amber-50",
      border: "border-amber-300",
      text: "text-amber-900",
      textStrong: "text-orange-700",
      emojiBg: "bg-amber-200",
      emojiText: "text-amber-700",
    };
  }
  if (code === 2 || code === 3) {
    return {
      bg: "bg-slate-50",
      border: "border-slate-300",
      text: "text-slate-800",
      textStrong: "text-slate-700",
      emojiBg: "bg-slate-200",
      emojiText: "text-slate-600",
    };
  }
  if (code === 45 || code === 48) {
    return {
      bg: "bg-zinc-100",
      border: "border-zinc-300",
      text: "text-zinc-800",
      textStrong: "text-zinc-700",
      emojiBg: "bg-zinc-200",
      emojiText: "text-zinc-600",
    };
  }
  // 小雨 / 毛毛雨
  if ((code >= 51 && code <= 55) || code === 61 || code === 80) {
    return {
      bg: "bg-sky-50",
      border: "border-sky-300",
      text: "text-sky-900",
      textStrong: "text-sky-700",
      emojiBg: "bg-sky-200",
      emojiText: "text-sky-700",
    };
  }
  // 中大雨 / 中陣雨
  if (code === 63 || code === 65 || code === 81 || code === 82) {
    return {
      bg: "bg-blue-100",
      border: "border-blue-400",
      text: "text-blue-900",
      textStrong: "text-blue-700",
      emojiBg: "bg-blue-200",
      emojiText: "text-blue-800",
    };
  }
  // 雪 (7月杭州用不到, 留著)
  if (code >= 71 && code <= 75) {
    return {
      bg: "bg-cyan-50",
      border: "border-cyan-300",
      text: "text-cyan-900",
      textStrong: "text-cyan-700",
      emojiBg: "bg-cyan-200",
      emojiText: "text-cyan-700",
    };
  }
  // 雷暴 (含冰雹/嚴重雷暴) — 警示色
  if (code >= 95) {
    return {
      bg: "bg-red-100",
      border: "border-red-400",
      text: "text-red-900",
      textStrong: "text-red-700",
      emojiBg: "bg-red-200",
      emojiText: "text-red-700",
    };
  }
  // 預設
  return {
    bg: "bg-gray-50",
    border: "border-gray-300",
    text: "text-gray-800",
    textStrong: "text-gray-700",
    emojiBg: "bg-gray-200",
    emojiText: "text-gray-600",
  };
}

// 整天是否為「高溫警示」(>= 35°C)
function isHighTemp(t: number) {
  return t >= 35;
}
// 整天是否為「低溫偏涼」(<= 24°C)
function isLowTemp(t: number) {
  return t <= 24;
}
// 降雨機率是否為高 (>= 70%)
function isHighRain(prob: number) {
  return prob >= 70;
}

export default function WeatherWidget() {
  const { forecast, current, loading, source, fetchedAt } = useHangzhouWeather();

  const isMock = source === "mock";
  const fetchedDate = fetchedAt ? new Date(fetchedAt) : null;
  const fetchedLabel = fetchedDate
    ? `${fetchedDate.getMonth() + 1}/${fetchedDate.getDate()} ${String(fetchedDate.getHours()).padStart(2, "0")}:${String(fetchedDate.getMinutes()).padStart(2, "0")}`
    : "—";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-bold">🌤️ 杭州天氣預報</h3>
        <div className="flex items-center gap-2 text-xs">
          {isMock && (
            <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full font-medium">
              ⚠️ 離線資料
            </span>
          )}
          <span className="text-gray-500">7月17日 - 7月24日 · 6 小時細分</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">天氣載入中...</div>
        </div>
      ) : (
        <>
          {/* Current Weather */}
          {current && (
            <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-5xl">{getWeatherEmoji(current.weatherCode)}</span>
                  <div>
                    <div className="text-3xl font-bold text-gray-800">{current.temp}°C</div>
                    <div className="text-sm text-gray-600">{getWeatherLabel(current.weatherCode)}</div>
                  </div>
                </div>
                <div className="text-right text-sm text-gray-600 space-y-1">
                  <div>💧 濕度 {current.humidity}%</div>
                  <div>💨 風速 {current.windSpeed} km/h</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-500 text-center">
                即時天氣 · 杭州
              </div>
            </div>
          )}

          {/* 🅒 7/15 加強: 每日有對應天氣色票 + 字體加粗 + 高溫/高降雨警示
              - 主列左邊 emoji 加大並加背景框
              - 整天 max/min 數字加粗加大
              - 6 小時細分每段用天氣對應色系背景
              - 降雨 >=70% 該段加紅 ring
          */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 font-medium text-sm">
              📅 八日天氣預報（每日 6 小時細分）
            </div>
            <div className="divide-y">
              {forecast.map((day) => {
                const dayStyle = getWeatherStyle(day.weatherCode);
                return (
                  <div key={day.date} className={`px-4 py-2.5 ${dayStyle.bg}`}>
                    {/* 主列 — 整天摘要 */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="text-center w-10">
                          <div className="text-xs font-bold text-gray-700 leading-tight">{day.dayName}</div>
                          <div className="text-sm font-bold leading-tight">
                            {Number(day.date.split("-")[1])}/{Number(day.date.split("-")[2])}
                          </div>
                        </div>
                        <div
                          className={`flex items-center justify-center w-9 h-9 rounded-lg ${dayStyle.emojiBg}`}
                        >
                          <span className="text-2xl">{getWeatherEmoji(day.weatherCode)}</span>
                        </div>
                        <div>
                          <div className={`text-sm font-bold leading-tight ${dayStyle.textStrong}`}>
                            {getWeatherLabel(day.weatherCode)}
                          </div>
                          {day.precipitation > 0 && (
                            <div
                              className={`text-xs font-bold leading-tight ${
                                isHighRain(day.precipitationProbability)
                                  ? "text-red-700"
                                  : "text-blue-700"
                              }`}
                            >
                              {isHighRain(day.precipitationProbability) && "⚠️ "}
                              整天 💧 {day.precipitation}mm · {day.precipitationProbability}%
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span
                          className={`text-base font-extrabold ${
                            isHighTemp(day.tempMax) ? "text-red-600" : "text-orange-500"
                          }`}
                        >
                          {isHighTemp(day.tempMax) && "🔥"}
                          {day.tempMax}°
                        </span>
                        <span className="text-gray-300 text-sm">/</span>
                        <span
                          className={`text-base font-bold ${
                            isLowTemp(day.tempMin) ? "text-blue-700" : "text-sky-500"
                          }`}
                        >
                          {day.tempMin}°
                        </span>
                      </div>
                    </div>

                    {/* 6 小時細分 — 永遠顯示, 4 段 inline */}
                    {day.slots && day.slots.length === 4 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {day.slots.map((slot) => {
                          const slotStyle = getWeatherStyle(slot.weatherCode);
                          const highRain = isHighRain(slot.precipitationProbMax);
                          return (
                            <div
                              key={slot.range}
                              className={`${slotStyle.bg} ${
                                highRain ? "ring-2 ring-red-400" : ""
                              } rounded px-2 py-1 flex items-center gap-1.5 text-[11px] leading-tight border ${slotStyle.border}`}
                            >
                              <span className="text-xl">{getWeatherEmoji(slot.weatherCode)}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-1">
                                  <span className={`font-bold ${slotStyle.textStrong}`}>
                                    {slot.label}
                                  </span>
                                  <span className="text-[10px] text-gray-500">{slot.range}</span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                  <span
                                    className={`font-bold ${
                                      isHighTemp(slot.tempMax)
                                        ? "text-red-600"
                                        : "text-orange-600"
                                    }`}
                                  >
                                    {slot.tempMax}°
                                  </span>
                                  <span className="text-gray-300">/</span>
                                  <span
                                    className={`font-bold ${
                                      isLowTemp(slot.tempMin) ? "text-blue-700" : "text-sky-600"
                                    }`}
                                  >
                                    {slot.tempMin}°
                                  </span>
                                  {slot.precipitationProbMax > 0 && (
                                    <span
                                      className={`ml-auto font-bold ${
                                        highRain ? "text-red-700" : "text-blue-700"
                                      }`}
                                    >
                                      {highRain && "⚠️"}💧{slot.precipitationProbMax}%
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-[11px] text-gray-500 italic">
                        （此日期無 6 小時細分預報）
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ⚠️ 重要發現 — 7/19-7/20 雷暴+冰雹警示 (2026-07-15 Open-Meteo 實測)
              - 7/19 週日: 16.5mm / 97% 降雨率 + 雷暴+冰雹 (code 96)
              - 7/20 週一: 18.6mm / 90% 降雨率 + 雷暴+冰雹 (code 96)
              - 行程對應: D4 烏鎮西柵深度一日遊 / D5 烏鎮→杭州西湖
              - 必準備: 輕便雨衣（非傘，雷暴區撐傘危險）+ 防水鞋 + 室內備案
              - 室內備案: 烏鎮染坊 / 昭明書院 / 木心美術館
          */}
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⚠️</span>
              <span className="text-sm font-bold text-red-800">7/19-7/20 雷暴+冰雹警示</span>
            </div>
            <div className="text-xs text-red-700 space-y-1.5">
              <div className="flex items-start gap-1.5">
                <span className="font-semibold flex-shrink-0">📅 7/19 週日（D4 烏鎮西柵）：</span>
                <span>
                  雷暴集中在 <span className="font-bold">下午 12-18</span>（15.6mm · 97% 機率）·
                  上午只有 65% 0.6mm
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="font-semibold flex-shrink-0">📅 7/20 週一（D5 烏鎮→杭州）：</span>
                <span>18.6mm 降雨 · <span className="font-bold">90% 機率</span> · 雷暴+冰雹</span>
              </div>
              <div className="pt-1.5 mt-1.5 border-t border-red-200">
                <div className="font-semibold mb-1">🧳 出發前務必準備：</div>
                <ul className="space-y-0.5 pl-1">
                  <li>• 輕便雨衣（雷暴區撺傘有雷擊風險）</li>
                  <li>• 防水鞋 / 拖鞋備用</li>
                  <li>• 行程對應準備室內備案（烏鎮染坊、昭明書院、木心美術館）</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Travel Tips */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="text-sm font-bold text-yellow-900 mb-2">💡 天氣旅遊建議</div>
            <ul className="text-xs text-yellow-800 space-y-1">
              <li>• 7月杭州正值梅雨季，建議隨身攜帶雨具</li>
              <li>• 氣溫炎熱，注意防曬和補水</li>
              <li>• 建議穿著輕薄透氣的夏季衣物</li>
              <li>• 室內外溫差大，攜帶薄外套備用</li>
            </ul>
          </div>

          {/* 色票圖例 */}
          <div className="bg-white border rounded-lg p-2.5">
            <div className="text-[11px] font-bold text-gray-700 mb-1.5">🎨 色票圖例</div>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              <span className="bg-amber-50 border border-amber-300 text-amber-900 px-1.5 py-0.5 rounded font-medium">☀️ 晴</span>
              <span className="bg-slate-50 border border-slate-300 text-slate-800 px-1.5 py-0.5 rounded font-medium">☁️ 多雲</span>
              <span className="bg-sky-50 border border-sky-300 text-sky-900 px-1.5 py-0.5 rounded font-medium">🌦️ 小雨</span>
              <span className="bg-blue-100 border border-blue-400 text-blue-900 px-1.5 py-0.5 rounded font-medium">🌧️ 中大雨</span>
              <span className="bg-red-100 border border-red-400 text-red-900 px-1.5 py-0.5 rounded font-bold">⛈️ 雷暴</span>
              <span className="text-orange-600 font-bold">🔥 高溫 ≥35°C</span>
              <span className="text-red-700 font-bold">⚠️ 降雨 ≥70%</span>
            </div>
          </div>

          <div className="text-xs text-gray-400 text-center">
            資料來源：Open-Meteo 即時預報 · 更新時間 {fetchedLabel}
          </div>
        </>
      )}
    </div>
  );
}