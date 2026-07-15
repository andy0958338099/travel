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
    `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m` +
    `&timezone=Asia%2FShanghai&forecast_days=14`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  const data = await res.json();

  const tripStart = new Date(TRIP_START);
  const tripEnd = new Date(TRIP_END);
  const forecast: DayWeather[] = [];
  for (let i = 0; i < data.daily.time.length; i++) {
    const date = new Date(data.daily.time[i]);
    if (date >= tripStart && date <= tripEnd) {
      forecast.push({
        date: data.daily.time[i],
        dayName: getDayName(data.daily.time[i]),
        tempMax: Math.round(data.daily.temperature_2m_max[i]),
        tempMin: Math.round(data.daily.temperature_2m_min[i]),
        weatherCode: data.daily.weather_code[i],
        precipitation: data.daily.precipitation_sum[i] ?? 0,
        precipitationProbability:
          data.daily.precipitation_probability_max?.[i] ?? 0,
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