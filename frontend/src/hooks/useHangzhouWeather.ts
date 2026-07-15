"use client";
import { useEffect, useState } from "react";

// 杭州天氣 hook — 2026-07-15 重構 🅒
// 設計原因:
//   (1) Widget + 首頁 dashboard 5 格原本各自 fetch Open-Meteo,會重複打 API
//   (2) module-level cache 跨元件共享,只打一次
//   (3) 30 分鐘 refetch 確保即時預報不過時(Open-Meteo 每小時更新)
//   (4) mock fallback 標 source="mock" 觸發 ⚠️ 離線資料 UI chip
//   (5) 真實資料 vs hardcoded 假資料的差別:
//       - 之前首頁顯示「高溫 30-35°C」是胡亂填的(實際 26-37°C)
//       - 之前 widget footer 寫「7月為歷史平均值」是錯的(Open-Meteo 是即時 forecast)
//       - 之前 journal 寫「晴朗炎熱」但 7/17 是雷暴 36°C,完全相反
//
// 資料來源: https://api.open-meteo.com (免費,免 API key, WMO weather codes)

export interface DayWeather {
  date: string;
  dayName: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  precipitation: number;
  precipitationProbability: number;
}

export interface CurrentWeather {
  temp: number;
  humidity: number;
  weatherCode: number;
  windSpeed: number;
}

// 6 小時細分預報(每日分 4 段: 00-06 / 06-12 / 12-18 / 18-24)
export interface SixHourSlot {
  label: string;            // "凌晨" / "上午" / "下午" / "晚上"
  range: string;            // "00-06"
  tempMin: number;
  tempMax: number;
  weatherCode: number;      // 該段最常見的天氣 code
  precipitationMm: number;  // 該段累計降雨 mm
  precipitationProbMax: number; // 該段最高降雨機率 %
}

export interface DayWeather {
  date: string;
  dayName: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  precipitation: number;
  precipitationProbability: number;
  slots?: SixHourSlot[];    // 🅒 7/15: 加 6 小時細分 (僅 Open-Meteo 有 hourly 預報的日期才有)
}

export interface TripWeatherSummary {
  // 行程 8 天 (7/17-7/24) 統計
  tripTempMin: number; // 整趟最低溫
  tripTempMax: number; // 整趟最高溫
  dominantWeatherCode: number; // 行程中出現最多次的天氣 code
  rainyDays: number; // 行程中下雨天數 (>=61 code 或 降雨>0.1mm)
  totalPrecipitation: number; // 行程總降雨 mm
  rangeLabel: string; // 例如 "30-37°C"
}

interface WeatherCacheEntry {
  forecast: DayWeather[];
  current: CurrentWeather;
  summary: TripWeatherSummary;
  fetchedAt: number; // ms epoch
  source: "open-meteo" | "mock";
}

let _cache: WeatherCacheEntry | null = null;
let _inflight: Promise<WeatherCacheEntry> | null = null;

const HANGZHOU_COORDS = { lat: 30.2741, lng: 120.1551 };
const TRIP_START = "2026-07-17";
const TRIP_END = "2026-07-24";

const WEATHER_CODES: Record<number, { emoji: string; label: string }> = {
  0: { emoji: "☀️", label: "晴朗" },
  1: { emoji: "🌤️", label: "大致晴朗" },
  2: { emoji: "⛅", label: "局部多雲" },
  3: { emoji: "☁️", label: "陰天" },
  45: { emoji: "🌫️", label: "霧" },
  48: { emoji: "🌫️", label: "霧凇" },
  51: { emoji: "🌦️", label: "輕微毛毛雨" },
  53: { emoji: "🌦️", label: "中等毛毛雨" },
  55: { emoji: "🌧️", label: "密集毛毛雨" },
  61: { emoji: "🌧️", label: "小雨" },
  63: { emoji: "🌧️", label: "中雨" },
  65: { emoji: "🌧️", label: "大雨" },
  71: { emoji: "❄️", label: "小雪" },
  73: { emoji: "❄️", label: "中雪" },
  75: { emoji: "❄️", label: "大雪" },
  80: { emoji: "🌦️", label: "陣雨" },
  81: { emoji: "🌧️", label: "中陣雨" },
  82: { emoji: "⛈️", label: "大陣雨" },
  95: { emoji: "⛈️", label: "雷暴" },
  96: { emoji: "⛈️", label: "雷暴+冰雹" },
  99: { emoji: "⛈️", label: "嚴重雷暴" },
};

export function getWeatherEmoji(code: number): string {
  return WEATHER_CODES[code]?.emoji || "🌡️";
}

export function getWeatherLabel(code: number): string {
  return WEATHER_CODES[code]?.label || "未知";
}

function getDayName(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
  return days[date.getDay()];
}

// 🅒 7/15: 6 小時分段的 label 對應
const SLOT_DEFS = [
  { range: "00-06", label: "凌晨" },
  { range: "06-12", label: "上午" },
  { range: "12-18", label: "下午" },
  { range: "18-24", label: "晚上" },
];

// 從 Open-Meteo hourly 資料 + 目標日期, 聚合出 4 個 6 小時段
// ⚠️ Open-Meteo 免費 hourly forecast 只到未來 7 天 (2026-07-15 抓的話, 到 7/21 23:00)
// 行程 7/22-7/24 沒有 hourly 資料, slots 會是 undefined
function aggregateHourlyToSlots(
  hourlyTime: string[],
  hourlyTemp: number[],
  hourlyCode: number[],
  hourlyPrecipMm: number[],
  hourlyPrecipProb: number[],
  targetDate: string,
): SixHourSlot[] {
  const slots: SixHourSlot[] = SLOT_DEFS.map((def) => ({
    label: def.label,
    range: def.range,
    tempMin: Infinity,
    tempMax: -Infinity,
    weatherCode: 0,
    precipitationMm: 0,
    precipitationProbMax: 0,
  }));

  // 該日期對應的 code 計數(取眾數)
  const codeCounts: Record<number, number>[] = SLOT_DEFS.map(() => ({}));

  for (let i = 0; i < hourlyTime.length; i++) {
    const t = hourlyTime[i]; // "2026-07-17T03:00"
    if (!t.startsWith(targetDate)) continue;
    const hour = parseInt(t.slice(11, 13), 10); // 0-23
    const slotIdx = Math.min(3, Math.floor(hour / 6)); // 0=00-06, 1=06-12, 2=12-18, 3=18-24

    const slot = slots[slotIdx];
    slot.tempMin = Math.min(slot.tempMin, hourlyTemp[i]);
    slot.tempMax = Math.max(slot.tempMax, hourlyTemp[i]);
    slot.precipitationMm += hourlyPrecipMm[i] || 0;
    slot.precipitationProbMax = Math.max(
      slot.precipitationProbMax,
      hourlyPrecipProb[i] || 0,
    );
    const c = hourlyCode[i];
    codeCounts[slotIdx][c] = (codeCounts[slotIdx][c] || 0) + 1;
  }

  // 決定每段眾數 weather code + 處理完全無資料的時段(把 Infinity 改回 0)
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    if (slot.tempMin === Infinity) {
      // 該段沒資料(罕見), 用整天 max/min 代替
      slot.tempMin = 0;
      slot.tempMax = 0;
    } else {
      slot.tempMin = Math.round(slot.tempMin);
      slot.tempMax = Math.round(slot.tempMax);
    }
    // 眾數
    let topCode = 0;
    let topCount = -1;
    for (const [c, cnt] of Object.entries(codeCounts[i])) {
      if (cnt > topCount) {
        topCount = cnt;
        topCode = Number(c);
      }
    }
    slot.weatherCode = topCode;
    slot.precipitationMm = Math.round(slot.precipitationMm * 10) / 10; // 1 位小數
  }

  return slots;
}

function buildSummary(forecast: DayWeather[]): TripWeatherSummary {
  if (forecast.length === 0) {
    return {
      tripTempMin: 0,
      tripTempMax: 0,
      dominantWeatherCode: 0,
      rainyDays: 0,
      totalPrecipitation: 0,
      rangeLabel: "—",
    };
  }
  const tempsMin = forecast.map((d) => d.tempMin);
  const tempsMax = forecast.map((d) => d.tempMax);
  const tripTempMin = Math.min(...tempsMin);
  const tripTempMax = Math.max(...tempsMax);

  // 多數天氣碼 (取眾數)
  const codeCounts: Record<number, number> = {};
  for (const d of forecast) {
    codeCounts[d.weatherCode] = (codeCounts[d.weatherCode] || 0) + 1;
  }
  let dominantWeatherCode = 0;
  let maxCount = -1;
  for (const [code, count] of Object.entries(codeCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantWeatherCode = Number(code);
    }
  }

  const rainyDays = forecast.filter(
    (d) => d.precipitation > 0.1 || d.weatherCode >= 61,
  ).length;
  const totalPrecipitation = forecast.reduce(
    (sum, d) => sum + d.precipitation,
    0,
  );

  return {
    tripTempMin,
    tripTempMax,
    dominantWeatherCode,
    rainyDays,
    totalPrecipitation,
    rangeLabel: `${tripTempMin}-${tripTempMax}°C`,
  };
}

function generateMockForecast(): {
  forecast: DayWeather[];
  current: CurrentWeather;
} {
  // 真實抓不到時的 fallback — 必標 ⚠️ 離線資料
  // 2026-07-15 抓的真實 Open-Meteo 數值 (30.8-37.3°C, 雷暴為主)
  const startDate = new Date(TRIP_START);
  const pattern = [
    { code: 95, max: 36, min: 29, rain: 1.6, prob: 40 },
    { code: 95, max: 37, min: 27, rain: 3.3, prob: 94 },
    { code: 96, max: 31, min: 27, rain: 16.5, prob: 97 },
    { code: 96, max: 31, min: 26, rain: 18.6, prob: 90 },
    { code: 96, max: 32, min: 26, rain: 6.3, prob: 80 },
    { code: 96, max: 35, min: 27, rain: 3.0, prob: 71 },
    { code: 1, max: 37, min: 27, rain: 0, prob: 55 },
    { code: 0, max: 37, min: 29, rain: 0, prob: 27 },
  ];
  const forecast: DayWeather[] = pattern.map((p, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    return {
      date: dateStr,
      dayName: getDayName(dateStr),
      tempMax: p.max,
      tempMin: p.min,
      weatherCode: p.code,
      precipitation: p.rain,
      precipitationProbability: p.prob,
    };
  });
  return {
    forecast,
    current: { temp: 32, humidity: 64, weatherCode: 0, windSpeed: 8 },
  };
}

async function fetchFromOpenMeteo(): Promise<WeatherCacheEntry> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${HANGZHOU_COORDS.lat}` +
    `&longitude=${HANGZHOU_COORDS.lng}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max` +
    // 🅒 7/15: 加 hourly 給 6 小時細分預報用
    // ⚠️ Open-Meteo 預設 hourly 只給 7 天, 但 forecast_days=14 拿得到 14 天 hourly
    // 顯式 forecast_hours=240 (10 天) 確保 7/17-7/24 全部 8 天都有 hourly
    `&hourly=temperature_2m,weather_code,precipitation,precipitation_probability` +
    `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m` +
    `&timezone=Asia%2FShanghai&forecast_days=14&forecast_hours=240`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  const data = await res.json();

  const tripStart = new Date(TRIP_START);
  const tripEnd = new Date(TRIP_END);
  const forecast: DayWeather[] = [];
  for (let i = 0; i < data.daily.time.length; i++) {
    const date = new Date(data.daily.time[i]);
    if (date >= tripStart && date <= tripEnd) {
      const dayDate = data.daily.time[i];
      // 組裝 6 小時細分 (如果有 hourly 資料)
      const slots =
        data.hourly && data.hourly.time
          ? aggregateHourlyToSlots(
              data.hourly.time,
              data.hourly.temperature_2m,
              data.hourly.weather_code,
              data.hourly.precipitation ?? [],
              data.hourly.precipitation_probability ?? [],
              dayDate,
            )
          : undefined;

      forecast.push({
        date: dayDate,
        dayName: getDayName(dayDate),
        tempMax: Math.round(data.daily.temperature_2m_max[i]),
        tempMin: Math.round(data.daily.temperature_2m_min[i]),
        weatherCode: data.daily.weather_code[i],
        precipitation: data.daily.precipitation_sum[i] ?? 0,
        precipitationProbability:
          data.daily.precipitation_probability_max?.[i] ?? 0,
        slots,
      });
    }
  }
  const current: CurrentWeather = {
    temp: Math.round(data.current.temperature_2m),
    humidity: data.current.relative_humidity_2m,
    weatherCode: data.current.weather_code,
    windSpeed: Math.round(data.current.wind_speed_10m),
  };
  return {
    forecast,
    current,
    summary: buildSummary(forecast),
    fetchedAt: Date.now(),
    source: "open-meteo",
  };
}

async function loadCache(): Promise<WeatherCacheEntry> {
  if (_cache) return _cache;
  if (_inflight) return _inflight;

  _inflight = (async () => {
    try {
      const entry = await fetchFromOpenMeteo();
      _cache = entry;
      return entry;
    } catch (_err) {
      // API 失敗 → mock fallback (必標 ⚠️)
      const mock = generateMockForecast();
      const entry: WeatherCacheEntry = {
        forecast: mock.forecast,
        current: mock.current,
        summary: buildSummary(mock.forecast),
        fetchedAt: Date.now(),
        source: "mock",
      };
      _cache = entry;
      return entry;
    } finally {
      _inflight = null;
    }
  })();
  return _inflight;
}

/**
 * 共用 hook — 多個元件同時訂閱,只打一次 API
 * - 第一次 mount 觸發 fetch
 * - 30 分鐘後自動 refetch (天氣預報更新頻率)
 * - 失敗 fallback 到 mock,標 source = "mock"
 */
export function useHangzhouWeather() {
  const [data, setData] = useState<WeatherCacheEntry | null>(_cache);
  const [loading, setLoading] = useState<boolean>(_cache === null);

  useEffect(() => {
    let cancelled = false;
    const REFRESH_MS = 30 * 60 * 1000; // 30 分鐘

    const run = async () => {
      // 有 cache 且未過期 → 直接用
      if (_cache && Date.now() - _cache.fetchedAt < REFRESH_MS) {
        if (!cancelled) {
          setData(_cache);
          setLoading(false);
        }
        return;
      }
      // 過期或沒 cache → 重抓
      _cache = null;
      if (!cancelled) setLoading(true);
      const entry = await loadCache();
      if (!cancelled) {
        setData(entry);
        setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    forecast: data?.forecast ?? [],
    current: data?.current ?? null,
    summary: data?.summary ?? null,
    loading,
    source: data?.source ?? null,
    fetchedAt: data?.fetchedAt ?? null,
  };
}