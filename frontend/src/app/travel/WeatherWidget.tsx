"use client";
import { useState } from "react";
import {
  useHangzhouWeather,
  getWeatherEmoji,
  getWeatherLabel,
  type SixHourSlot,
} from "@/hooks/useHangzhouWeather";

export default function WeatherWidget() {
  const { forecast, current, loading, source, fetchedAt } = useHangzhouWeather();
  // 🅒 7/15: 點擊每日展開 6 小時細分
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const isMock = source === "mock";
  const fetchedDate = fetchedAt ? new Date(fetchedAt) : null;
  const fetchedLabel = fetchedDate
    ? `${fetchedDate.getMonth() + 1}/${fetchedDate.getDate()} ${String(fetchedDate.getHours()).padStart(2, "0")}:${String(fetchedDate.getMinutes()).padStart(2, "0")}`
    : "—";

  // 哪些日期有 6 小時細分(對應 Open-Meteo hourly 預報範圍)
  const hasHourlyData = (day: { slots?: SixHourSlot[] }) =>
    day.slots && day.slots.length === 4 && day.slots.some((s) => s.tempMin !== 0 || s.tempMax !== 0);

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
          <span className="text-gray-500">7月17日 - 7月24日</span>
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

          {/* 8-Day Forecast — 每日 click 展開 6 小時細分 */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 font-medium text-sm flex items-center justify-between">
              <span>📅 八日天氣預報</span>
              <span className="text-xs text-gray-500 font-normal">
                點擊每日展開 6 小時細分
              </span>
            </div>
            <div className="divide-y">
              {forecast.map((day) => {
                const isExpanded = expandedDate === day.date;
                const canExpand = hasHourlyData(day);
                return (
                  <div key={day.date}>
                    {/* 主列 — 整天摘要 */}
                    <button
                      type="button"
                      onClick={() => canExpand && setExpandedDate(isExpanded ? null : day.date)}
                      disabled={!canExpand}
                      className={`w-full px-4 py-3 flex items-center justify-between text-left ${
                        canExpand ? "hover:bg-gray-50 cursor-pointer" : "cursor-default"
                      }`}
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-center w-12">
                          <div className="text-xs text-gray-500">{day.dayName}</div>
                          <div className="text-sm font-medium">
                            {Number(day.date.split("-")[1])}/{Number(day.date.split("-")[2])}
                          </div>
                        </div>
                        <span className="text-2xl">{getWeatherEmoji(day.weatherCode)}</span>
                        <div>
                          <div className="text-sm text-gray-600">{getWeatherLabel(day.weatherCode)}</div>
                          {day.precipitation > 0 && (
                            <div className="text-xs text-blue-500">
                              💧 {day.precipitation}mm · {day.precipitationProbability}%
                            </div>
                          )}
                          {!canExpand && (
                            <div className="text-xs text-gray-400 italic mt-0.5">
                              (無 6 小時細分)
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-red-500 font-medium">{day.tempMax}°</span>
                        <span className="text-gray-400">/</span>
                        <span className="text-blue-500">{day.tempMin}°</span>
                        {canExpand && (
                          <span
                            className={`text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            aria-hidden="true"
                          >
                            ▼
                          </span>
                        )}
                      </div>
                    </button>

                    {/* 🅒 展開的 6 小時細分 */}
                    {isExpanded && day.slots && (
                      <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                        <div className="text-xs font-semibold text-gray-700 mb-2">
                          ⏰ 6 小時細分預報
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {day.slots.map((slot) => (
                            <div
                              key={slot.range}
                              className="bg-white rounded-lg p-2.5 border border-gray-200 text-center"
                            >
                              <div className="text-xs font-medium text-gray-700">
                                {slot.label}
                              </div>
                              <div className="text-[10px] text-gray-400 mb-1">
                                {slot.range}
                              </div>
                              <div className="text-2xl mb-1">
                                {getWeatherEmoji(slot.weatherCode)}
                              </div>
                              <div className="text-xs">
                                <span className="text-red-500 font-semibold">{slot.tempMax}°</span>
                                <span className="text-gray-400 mx-0.5">/</span>
                                <span className="text-blue-500">{slot.tempMin}°</span>
                              </div>
                              {slot.precipitationProbMax > 0 && (
                                <div className="text-[10px] text-blue-600 mt-1">
                                  💧 {slot.precipitationProbMax}%
                                </div>
                              )}
                              {slot.precipitationMm > 0 && (
                                <div className="text-[10px] text-gray-500">
                                  {slot.precipitationMm}mm
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 6 小時細分預報說明 */}
          <div className="text-xs text-gray-500 text-center italic">
            💡 點擊每日展開 6 小時細分預報（凌晨 / 上午 / 下午 / 晚上）· 資料來源 Open-Meteo 即時
          </div>

          {/* ⚠️ 重要發現 — 7/19-7/20 雷暴+冰雹警示 (2026-07-15 Open-Meteo 實測)
              - 7/19 週日: 16.5mm / 97% 降雨率 + 雷暴+冰雹 (code 96)
              - 7/20 週一: 18.6mm / 90% 降雨率 + 雷暴+冰雹 (code 96)
              - 行程對應: D4 烏鎮西柵深度一日遊 / D5 烏鎮→杭州西湖
              - 必準備: 輕便雨衣（非傘，雷暴區撐傘危險）+ 防水鞋 + 室內備案
              - 室內備案: 烏鎮染坊 / 昭明書院 / 木心美術館
          */}
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">⚠️</span>
              <span className="text-sm font-bold text-red-800">7/19-7/20 雷暴+冰雹警示</span>
            </div>
            <div className="text-xs text-red-700 space-y-1.5">
              <div className="flex items-start gap-1.5">
                <span className="font-semibold flex-shrink-0">📅 7/19 週日（D4 烏鎮西柵）：</span>
                <span>16.5mm 降雨 · <span className="font-bold">97% 機率</span> · 雷暴+冰雹</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="font-semibold flex-shrink-0">📅 7/20 週一（D5 烏鎮→杭州）：</span>
                <span>18.6mm 降雨 · <span className="font-bold">90% 機率</span> · 雷暴+冰雹</span>
              </div>
              <div className="pt-1.5 mt-1.5 border-t border-red-200">
                <div className="font-semibold mb-1">🧳 出發前務必準備：</div>
                <ul className="space-y-0.5 pl-1">
                  <li>• 輕便雨衣（雷暴區撐傘有雷擊風險）</li>
                  <li>• 防水鞋 / 拖鞋備用</li>
                  <li>• 行程對應準備室內備案（烏鎮染坊、昭明書院、木心美術館）</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Travel Tips */}
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3">
            <div className="text-sm font-medium text-yellow-800 mb-2">💡 天氣旅遊建議</div>
            <ul className="text-xs text-yellow-700 space-y-1">
              <li>• 7月杭州正值梅雨季，建議隨身攜帶雨具</li>
              <li>• 氣溫炎熱，注意防曬和補水</li>
              <li>• 建議穿著輕薄透氣的夏季衣物</li>
              <li>• 室內外溫差大，攜帶薄外套備用</li>
            </ul>
          </div>

          <div className="text-xs text-gray-400 text-center">
            資料來源：Open-Meteo 即時預報 · 更新時間 {fetchedLabel}
          </div>
        </>
      )}
    </div>
  );
}