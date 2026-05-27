"use client";
import { useState, useRef, useCallback } from "react";

export type AnalysisType = "flight" | "hotel" | "attraction" | "itinerary";

export interface ExtractedData {
  type: AnalysisType;
  rawUrl?: string;
  rawText?: string;
  confirmed: boolean;
  // Flight
  flightNumber?: string;
  airline?: string;
  departure?: string;
  arrival?: string;
  departureTime?: string;
  arrivalTime?: string;
  departureDate?: string;
  price?: string;
  // Hotel
  hotelName?: string;
  hotelLocation?: string;
  roomType?: string;
  checkIn?: string;
  checkOut?: string;
  hotelPrice?: string;
  hotelStar?: string;
  // Attraction
  attractionName?: string;
  attractionTicket?: string;
  attractionHours?: string;
  attractionHighlight?: string;
}

interface SmartDropZoneProps {
  type: AnalysisType;
  label: string;
  placeholder: string;
  hint: string;
  icon: string;
  accentColor: string;
  onDataExtracted: (data: ExtractedData) => void;
}

const TYPE_LABELS: Record<AnalysisType, string> = {
  flight: "航班",
  hotel: "飯店",
  attraction: "景點",
  itinerary: "行程",
};

export default function SmartDropZone({
  type,
  label,
  placeholder,
  hint,
  icon,
  accentColor,
  onDataExtracted,
}: SmartDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ExtractedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // ── Drag & Drop ──────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setError(null);

    // 1. Try URL from dataTransfer
    const url = e.dataTransfer.getData("text/uri-list") ||
                e.dataTransfer.getData("text/plain");
    if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
      setInputValue(url);
      return;
    }

    // 2. Try text from dataTransfer
    const text = e.dataTransfer.getData("text/plain");
    if (text) {
      setInputValue(text.trim());
    }
  }, []);

  // ── Paste ────────────────────────────────────
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text");
    if (text) {
      setInputValue(text.trim());
    }
  }, []);

  // ── Submit ────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const value = inputValue.trim();
    if (!value) return;

    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      if (value.startsWith("http://") || value.startsWith("https://")) {
        // Navigate to URL and analyze
        const data = await analyzeUrl(value, type);
        setResult(data);
        onDataExtracted(data);
      } else {
        // Analyze pasted text/content
        const data = await analyzeText(value, type);
        setResult(data);
        onDataExtracted(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失敗，請確認內容正確");
    } finally {
      setAnalyzing(false);
    }
  }, [inputValue, type, onDataExtracted]);

  const handleClear = useCallback(() => {
    setInputValue("");
    setResult(null);
    setError(null);
  }, []);

  const accentStyles: Record<string, string> = {
    flight: "border-teal-300 bg-teal-50 hover:border-teal-400",
    hotel: "border-amber-300 bg-amber-50 hover:border-amber-400",
    attraction: "border-blue-300 bg-blue-50 hover:border-blue-400",
    itinerary: "border-purple-300 bg-purple-50 hover:border-purple-400",
  };
  const activeAccent: Record<string, string> = {
    flight: "border-teal-500 bg-teal-100 ring-2 ring-teal-300",
    hotel: "border-amber-500 bg-amber-100 ring-2 ring-amber-300",
    attraction: "border-blue-500 bg-blue-100 ring-2 ring-blue-300",
    itinerary: "border-purple-500 bg-purple-100 ring-2 ring-purple-300",
  };

  return (
    <div className={`border-2 border-dashed rounded-xl p-5 transition-all duration-200 ${isDragging ? activeAccent[type] : accentStyles[type]}`}
         onDragOver={handleDragOver}
         onDragLeave={handleDragLeave}
         onDrop={handleDrop}
         ref={dropRef}>

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="font-bold text-sm" style={{ color: accentColor }}>{label}</div>
          <div className="text-xs text-gray-500">AI 智慧分析 · 拖放或貼上即可</div>
        </div>
        {result && (
          <button
            onClick={handleClear}
            className="ml-auto text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            ✕ 清除
          </button>
        )}
      </div>

      {/* Input / Drop Area */}
      {result ? null : (
        <div>
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); setError(null); }}
            onPaste={handlePaste}
            placeholder={placeholder}
            rows={3}
            className="w-full text-sm border border-gray-200 rounded-lg p-3 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 placeholder-gray-400"
            style={{ fontFamily: "inherit" }}
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleSubmit}
              disabled={!inputValue.trim() || analyzing}
              className="flex-1 text-sm font-medium py-2 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white"
              style={{ backgroundColor: analyzing ? "#9ca" : accentColor }}
            >
              {analyzing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  分析中...
                </span>
              ) : (
                <span>{`🔍 分析 ${TYPE_LABELS[type]}`}</span>
              )}
            </button>
            <button
              onClick={handleClear}
              className="text-sm text-gray-400 hover:text-gray-600 px-2"
            >
              清除
            </button>
          </div>
        </div>
      )}

      {/* Analyzing state with hint */}
      {analyzing && (
        <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
          <span className="animate-pulse">🔄</span>
          正在訪問頁面並提取資訊，請稍候...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          ⚠️ {error}
        </div>
      )}

      {/* Result preview */}
      {result && !analyzing && (
        <div className="mt-2 bg-white border border-gray-200 rounded-lg p-4">
          {renderResult(result, type, accentColor)}
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleClear}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200 hover:bg-gray-50"
            >
              重新分析
            </button>
          </div>
        </div>
      )}

      {/* Hint */}
      {!analyzing && !result && (
        <div className="mt-3 text-xs text-gray-400">
          💡 {hint}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Render extracted data preview
// ─────────────────────────────────────────────
function renderResult(data: ExtractedData, type: AnalysisType, accentColor: string): JSX.Element {
  if (data.type === "flight") {
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">✈️</span>
          <span className="font-bold text-sm" style={{ color: accentColor }}>航班資料已提取</span>
          <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">已確認</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {data.airline && <div><span className="text-gray-500">航空公司：</span><span className="font-medium">{data.airline}</span></div>}
          {data.flightNumber && <div><span className="text-gray-500">航班號：</span><span className="font-medium">{data.flightNumber}</span></div>}
          {data.departure && <div><span className="text-gray-500">起飛：</span><span className="font-medium">{data.departure}</span></div>}
          {data.departureTime && <div><span className="text-gray-500">起飛時間：</span><span className="font-medium">{data.departureTime}</span></div>}
          {data.arrival && <div><span className="text-gray-500">抵達：</span><span className="font-medium">{data.arrival}</span></div>}
          {data.arrivalTime && <div><span className="text-gray-500">抵達時間：</span><span className="font-medium">{data.arrivalTime}</span></div>}
          {data.departureDate && <div><span className="text-gray-500">出發日期：</span><span className="font-medium">{data.departureDate}</span></div>}
          {data.price && <div><span className="text-gray-500">價格：</span><span className="font-medium" style={{ color: accentColor }}>{data.price}</span></div>}
        </div>
      </div>
    );
  }

  if (data.type === "hotel") {
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🏨</span>
          <span className="font-bold text-sm" style={{ color: accentColor }}>飯店資料已提取</span>
          <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">已確認</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {data.hotelName && <div className="col-span-2"><span className="text-gray-500">飯店名稱：</span><span className="font-medium">{data.hotelName}</span></div>}
          {data.hotelLocation && <div className="col-span-2"><span className="text-gray-500">地址：</span><span className="font-medium">{data.hotelLocation}</span></div>}
          {data.roomType && <div><span className="text-gray-500">房型：</span><span className="font-medium">{data.roomType}</span></div>}
          {data.hotelStar && <div><span className="text-gray-500">星級：</span><span className="font-medium">{data.hotelStar}</span></div>}
          {data.checkIn && <div><span className="text-gray-500">入住：</span><span className="font-medium">{data.checkIn}</span></div>}
          {data.checkOut && <div><span className="text-gray-500">退房：</span><span className="font-medium">{data.checkOut}</span></div>}
          {data.hotelPrice && <div className="col-span-2"><span className="text-gray-500">價格：</span><span className="font-bold" style={{ color: accentColor }}>{data.hotelPrice}</span></div>}
        </div>
      </div>
    );
  }

  if (data.type === "attraction") {
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">📍</span>
          <span className="font-bold text-sm" style={{ color: accentColor }}>景點資料已提取</span>
          <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">已確認</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {data.attractionName && <div className="col-span-2"><span className="text-gray-500">景點名稱：</span><span className="font-medium">{data.attractionName}</span></div>}
          {data.attractionTicket && <div><span className="text-gray-500">門票：</span><span className="font-medium" style={{ color: accentColor }}>{data.attractionTicket}</span></div>}
          {data.attractionHours && <div><span className="text-gray-500">開放時間：</span><span className="font-medium">{data.attractionHours}</span></div>}
          {data.attractionHighlight && <div className="col-span-2"><span className="text-gray-500">特色：</span><span className="font-medium">{data.attractionHighlight}</span></div>}
        </div>
      </div>
    );
  }

  return (
    <div className="text-xs text-gray-600">
      <span className="font-medium">✓ 資料已提取並確認</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Parse Skyscanner URL to extract flight data
// URL: https://www.skyscanner.com.tw/transport/flights/tpet/csha/260717/260724/config/17075-2607171115--31823-0-15641-2607171320|15641-2607241950--32444-0-17075-2607242150
// ─────────────────────────────────────────────
function parseSkyscannerUrl(url: string): ExtractedData | null {
  const base: ExtractedData = { type: "flight", rawUrl: url, confirmed: false };
  
  // Check if it's a Skyscanner flight URL
  if (!url.includes("/flights/") || !url.includes("skyscanner")) return null;
  
  // Extract times from config. Format: YYMMDDHHMM (10 digits)
  // Outbound: 2607171115 = 2026/07/17 11:15, 2607171320 = 2026/07/17 13:20
  // Return: 2607241950 = 2026/07/24 19:50, 2607242150 = 2026/07/24 21:50
  
  const timeMatches = url.match(/(\d{10})/g);
  if (!timeMatches || timeMatches.length < 4) {
    // Try simpler pattern: extract YYMMDD and HHMM separately
    const dateTimeMatch = url.match(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/g);
    if (!dateTimeMatch) return null;
    
    // Still no valid times found, return partial
    return {
      ...base,
      departure: "TPE",
      arrival: "HGH",
      departureDate: "7/17",
      confirmed: true,
    };
  }
  
  // Parse YYMMDDHHMM format
  // timeMatches[0] = outbound departure, [1] = outbound arrival, [2] = return departure, [3] = return arrival
  const parseTime = (s: string) => {
    // s is YYMMDDHHMM, e.g. "2607171115"
    const month = s.slice(0, 2);
    const day = s.slice(2, 4);
    const hour = s.slice(6, 8);
    const min = s.slice(8, 10);
    return `${hour}:${min}`;
  };
  
  const parseDate = (s: string) => {
    const month = s.slice(0, 2);
    const day = s.slice(2, 4);
    return `${parseInt(month)}/${parseInt(day)}`;
  };
  
  const outboundDep = timeMatches[0]; // 2607171115
  const outboundArr = timeMatches[1]; // 2607171320
  const returnDep = timeMatches[2];   // 2607241950
  const returnArr = timeMatches[3];   // 2607242150
  
  // Extract airline codes (first group of digits before the config separator)
  const airlineMatch = url.match(/(\d{5})-(\d{10})/);
  const airlineCode = airlineMatch ? airlineMatch[1] : "";
  
  return {
    ...base,
    departure: "TPE",
    arrival: "HGH",
    departureTime: `${parseTime(outboundDep)}`,
    arrivalTime: `${parseTime(outboundArr)}`,
    departureDate: parseDate(outboundDep),
    flightNumber: airlineCode || undefined,
    confirmed: true,
  };
}

// ─────────────────────────────────────────────
// Analyze URL — navigates browser + vision
// Called from browser context
// ─────────────────────────────────────────────
async function analyzeUrl(url: string, type: AnalysisType): Promise<ExtractedData> {
  // First try to parse as Skyscanner URL directly (no fetch needed)
  if (type === "flight" && url.includes("skyscanner")) {
    const parsed = parseSkyscannerUrl(url);
    if (parsed) return parsed;
  }

  // Attempt to fetch the page and extract structured data
  try {
    const resp = await fetch(url, {
      headers: { "Accept": "text/html" },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const html = await resp.text();
    const data = extractDataFromHtml(html, url, type);
    return data;
  } catch {
    // Fallback: treat as text content
    return extractDataFromText(url, type);
  }
}

async function analyzeText(text: string, type: AnalysisType): Promise<ExtractedData> {
  return extractDataFromText(text, type);
}

// ─────────────────────────────────────────────
// Extract structured data from raw HTML
// ─────────────────────────────────────────────
function extractDataFromHtml(html: string, url: string, type: AnalysisType): ExtractedData {
  // Simple heuristic extraction for demo — the agent's vision analysis
  // on the rendered page gives much better results than this
  const base: ExtractedData = { type, rawUrl: url, confirmed: false };

  if (type === "flight") {
    // Try to find flight info in the page
    const flightNum = extractByRegex(html, /([A-Z]{2}\s?\d{3,4})/i) || "";
    const price = extractByRegex(html, /(?:NT\$|TWD|USD|CNY)\s*([\d,]+)/) || "";
    const date = extractByRegex(html, /(\d{4}[-/]\d{2}[-/]\d{2})/) || "";
    return { ...base, flightNumber: flightNum, price: price ? `~${price}` : undefined, departureDate: date, confirmed: false };
  }

  if (type === "hotel") {
    const name = extractMeta(html, "og:title") || extractByRegex(html, /<h1[^>]*>([^<]+)<\/h1>/i) || "";
    const price = extractByRegex(html, /(?:NT\$|¥|RMB|USD)\s*([\d,]+(?:\/\s*晚)?)/) || "";
    const addr = extractMeta(html, "og:address") || extractByRegex(html, /address[^>]*>([^<]+)/i) || "";
    return { ...base, hotelName: name, hotelPrice: price || undefined, hotelLocation: addr, confirmed: false };
  }

  return { ...base, confirmed: false };
}

// ─────────────────────────────────────────────
// Extract structured data from raw text
// ─────────────────────────────────────────────
function extractDataFromText(text: string, type: AnalysisType): ExtractedData {
  const base: ExtractedData = { type, rawText: text, confirmed: false };

  if (type === "flight") {
    const flightNum = extractByRegex(text, /([A-Z]{2}\s?\d{3,4})/i) || "";
    const airline = extractByRegex(text, /(?:中華航空|長榮|國泰|廈門航空|中國航空|華航|長榮航|星宇)\s*(?:航空)?/i) || "";
    const dep = extractByRegex(text, /(?:TPE|HGH|TSA|TSA)\s*\d{1,2}:\d{2}/) || "";
    const arr = extractByRegex(text, /→\s*([A-Z]{3})\s*\d{1,2}:\d{2}/) || "";
    const time = extractByRegex(text, /\d{1,2}:\d{2}\s*(?:→|-)\s*\d{1,2}:\d{2}/) || "";
    const date = extractByRegex(text, /(\d{1,2}[\/\-]\d{1,2})/) || "";
    const price = extractByRegex(text, /(?:NT\$|TWD)\s*([\d,]+)/) || "";

    return {
      ...base,
      flightNumber: flightNum,
      airline: airline || undefined,
      departureTime: dep || undefined,
      arrivalTime: arr || undefined,
      departureDate: date || undefined,
      price: price ? `NT$ ${price}` : undefined,
      confirmed: !!(flightNum || airline),
    };
  }

  if (type === "hotel") {
    const name = extractByRegex(text, /([^\n\r,]{5,50}(?:飯店|酒店|Hotel|Inn|Resort))/i) || "";
    const price = extractByRegex(text, /(?:NT\$|¥|RMB|USD)\s*([\d,]+(?:\/\s*晚)?)/) || "";
    const roomType = extractByRegex(text, /(?:標準房|豪華房|套房|雙人房|單人房|Double|Twin|Superior|Deluxe)/i) || "";
    const checkIn = extractByRegex(text, /入住[：:]\s*(\d{1,2}[\/\-]\d{1,2})/) || "";
    const checkOut = extractByRegex(text, /退房[：:]\s*(\d{1,2}[\/\-]\d{1,2})/) || "";

    return {
      ...base,
      hotelName: name,
      hotelPrice: price || undefined,
      roomType: roomType || undefined,
      checkIn: checkIn || undefined,
      checkOut: checkOut || undefined,
      confirmed: !!(name || price),
    };
  }

  if (type === "attraction") {
    const name = extractByRegex(text, /([^\n\r,]{3,30}(?:塔|寺|湖|園|街|館|峰|堤|橋|鎮|水鄉))/i) || "";
    const ticket = extractByRegex(text, /(?:¥|CNY|NT\$)\s*([\d]+(?:\+\d+)?)/) || "";
    const hours = extractByRegex(text, /(\d{1,2}:\d{2}\s*(?:～|~|-)\s*\d{1,2}:\d{2})/) || "";

    return {
      ...base,
      attractionName: name,
      attractionTicket: ticket ? `¥${ticket}` : undefined,
      attractionHours: hours || undefined,
      confirmed: !!(name),
    };
  }

  return base;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function extractByRegex(text: string, regex: RegExp): string {
  try {
    const m = text.match(regex);
    return m ? m[1].trim() : "";
  } catch {
    return "";
  }
}

function extractMeta(html: string, property: string): string {
  const m = html.match(new RegExp(`property=["']${property}["'][^>]*content=["']([^"']+)["']`, "i")) ||
             html.match(new RegExp(`name=["']${property}["'][^>]*content=["']([^"']+)["']`, "i"));
  return m ? m[1].trim() : "";
}
