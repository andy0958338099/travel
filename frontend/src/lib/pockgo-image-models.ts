/**
 * Pockgo 生圖模型庫 (2026-06-14 聖上拍板)
 *
 * 聖上要求:
 * 1. 模型列表直接表列在 /travel/postcard 頁面上方
 * 2. USER 選 1 個, 用來生圖
 * 3. 不好則從 UI 刪除
 * 4. 不再寫在 Netlify 環境變數 (避免改來改去)
 *
 * 來源: https://newapi.pockgo.com/api/pricing (公開 endpoint)
 * 中堂 2026-06-14 jq 抽出 25 個 image 相關 model (走 /v1/chat/completions endpoint)
 *
 * ⚠️ 2026-06-14 中堂 1 次 production curl 對比 10 個 model 修法:
 *    USER distributor `newapi.pockgo.com` 客觀只支援 `gemini-2.5-flash-image` 1 個 model!
 *    其餘 24 個 distributor 沒 channel = 503 `No available channel for model ...`
 *    中堂 6-12 4K verify 成功 1510KB 的 `gemini-3.1-flash-image-preview-4k` 現在也 503 (distributor 把 gemini 3.x channel 拿掉了)
 *    標記規則: verified (USER distributor 確認能跑), known-bad (distributor 沒 channel), untested (沒試)
 *
 * 用法:
 *   import { POCKGO_IMAGE_MODELS, DEFAULT_ENABLED_MODELS, FALLBACK_MODEL } from "@/lib/pockgo-image-models";
 *   - ClientPage 顯示 model 庫 UI
 *   - 啟用清單存 localStorage (postcard_enabled_models_v1)
 *   - 預設啟用 1 個: gemini-2.5-flash-image (USER distributor 唯一能跑)
 */

export type ModelSeries = "gemini" | "gpt-image" | "seedream" | "qwen" | "hunyuan" | "flux" | "grok" | "z-image";
export type ModelStatus = "verified" | "untested" | "known-bad";

export interface PockgoImageModel {
  /** pockgo API 用的 model name (傳給 /v1/chat/completions body.model) */
  name: string;
  /** 系列 (UI 分組用) */
  series: ModelSeries;
  /** 廠商中文 (UI 顯示) */
  vendor: string;
  /** 單價 (¥/次, 從 pockgo /api/pricing model_price 抓) */
  price: number;
  /** 解析度 (可選, 4K/2K/1K) */
  resolution?: "1K" | "2K" | "4K";
  /** 預設是否啟用 */
  defaultEnabled: boolean;
  /** 已知狀態: verified (USER distributor 確認能跑), untested (沒試), known-bad (USER distributor 沒 channel) */
  status: ModelStatus;
  /** 備註 (UI 顯示) */
  notes?: string;
}

export const POCKGO_IMAGE_MODELS: PockgoImageModel[] = [
  // ── gemini (Google) — 7 個 ──
  { name: "gemini-2.5-flash-image",                series: "gemini", vendor: "Google", price: 0.04, defaultEnabled: true, status: "verified", notes: "USER distributor 唯一能跑 (11.4s 1468KB 6-14 verify)" },
  { name: "gemini-2.5-flash-image-preview",        series: "gemini", vendor: "Google", price: 0.05, defaultEnabled: false, status: "known-bad", notes: "USER distributor 沒 channel (rentry 範例有列, distributor 不支援)" },
  { name: "gemini-3.1-flash-image-preview",        series: "gemini", vendor: "Google", price: 0.03, defaultEnabled: false, status: "known-bad", notes: "USER distributor 沒 channel (gemini 3.x 全軍覆沒)" },
  { name: "gemini-3.1-flash-image-preview-2k",     series: "gemini", vendor: "Google", price: 0.05, resolution: "2K", defaultEnabled: false, status: "known-bad", notes: "USER distributor 沒 channel" },
  { name: "gemini-3.1-flash-image-preview-4k",     series: "gemini", vendor: "Google", price: 0.10, resolution: "4K", defaultEnabled: false, status: "known-bad", notes: "中堂 6-12 4K verify 成功 1510KB, 現在 distributor 把 gemini 3.x channel 拿掉了" },
  { name: "gemini-3-pro-image-preview",           series: "gemini", vendor: "Google", price: 0.10, defaultEnabled: false, status: "known-bad", notes: "USER distributor 沒 channel" },
  { name: "gemini-3-pro-image-preview-2k",        series: "gemini", vendor: "Google", price: 0.15, resolution: "2K", defaultEnabled: false, status: "known-bad", notes: "USER distributor 沒 channel" },
  { name: "gemini-3-pro-image-preview-4k",         series: "gemini", vendor: "Google", price: 0.30, resolution: "4K", defaultEnabled: false, status: "known-bad", notes: "USER distributor 沒 channel" },

  // ── gpt-image (OpenAI) — 4 個 ──
  { name: "gpt-image-1.5",                         series: "gpt-image", vendor: "OpenAI", price: 0.14, defaultEnabled: false, status: "known-bad", notes: "USER distributor 沒 channel" },
  { name: "gpt-image-2",                           series: "gpt-image", vendor: "OpenAI", price: 0.05, defaultEnabled: false, status: "known-bad", notes: "USER distributor 沒 channel" },
  { name: "gpt-image-2-2k",                        series: "gpt-image", vendor: "OpenAI", price: 0.08, resolution: "2K", defaultEnabled: false, status: "known-bad", notes: "USER distributor 沒 channel" },
  { name: "gpt-image-2-4k",                        series: "gpt-image", vendor: "OpenAI", price: 0.10, resolution: "4K", defaultEnabled: false, status: "known-bad", notes: "USER distributor 沒 channel + 4K 撞 Netlify 30s cap" },

  // ── seedream (字節跳動) — 4 個 ──
  { name: "seedream-4.0",                          series: "seedream", vendor: "字節跳動", price: 0.08, defaultEnabled: false, status: "known-bad", notes: "USER distributor 沒 channel" },
  { name: "seedream-4.0-2k",                       series: "seedream", vendor: "字節跳動", price: 0.10, resolution: "2K", defaultEnabled: false, status: "known-bad", notes: "USER distributor 沒 channel" },
  { name: "seedream-4.6",                          series: "seedream", vendor: "字節跳動", price: 0.12, defaultEnabled: false, status: "known-bad", notes: "USER distributor 沒 channel" },
  { name: "seedream-5.0",                          series: "seedream", vendor: "字節跳動", price: 0.15, defaultEnabled: false, status: "known-bad", notes: "USER distributor 沒 channel" },

  // ── qwen (阿里) — 4 個 ──
  { name: "qwen-image",                            series: "qwen", vendor: "阿里", price: 0.04, defaultEnabled: false, status: "known-bad", notes: "USER distributor 沒 channel" },
  { name: "qwen-image-2512",                       series: "qwen", vendor: "阿里", price: 0.04, defaultEnabled: false, status: "known-bad", notes: "USER distributor 沒 channel (6-13 報 model_not_found)" },
  { name: "qwen-image-edit-2509",                  series: "qwen", vendor: "阿里", price: 0.05, defaultEnabled: false, status: "known-bad", notes: "USER distributor 沒 channel" },
  { name: "qwen-image-edit-2511",                  series: "qwen", vendor: "阿里", price: 0.05, defaultEnabled: false, status: "known-bad", notes: "USER distributor 沒 channel" },

  // ── hunyuan (騰訊) — 1 個 ──
  { name: "hunyuan-image-3",                       series: "hunyuan", vendor: "騰訊", price: 0.04, defaultEnabled: false, status: "known-bad", notes: "USER distributor 沒 channel" },

  // ── flux (Black Forest Labs) — 3 個 ──
  { name: "flux-2-dev",                            series: "flux", vendor: "Black Forest Labs", price: 0.10, defaultEnabled: false, status: "known-bad", notes: "USER distributor 沒 channel" },
  { name: "flux-2-flex",                           series: "flux", vendor: "Black Forest Labs", price: 0.50, defaultEnabled: false, status: "known-bad", notes: "USER distributor 沒 channel" },
  { name: "flux-2-pro",                            series: "flux", vendor: "Black Forest Labs", price: 0.30, defaultEnabled: false, status: "known-bad", notes: "USER distributor 沒 channel" },

  // ── grok (xAI) — 2 個 ──
  { name: "grok-3-image",                          series: "grok", vendor: "xAI", price: 0.07, defaultEnabled: false, status: "known-bad", notes: "USER distributor 沒 channel" },
  { name: "grok-imagine-image",                    series: "grok", vendor: "xAI", price: 0.07, defaultEnabled: false, status: "known-bad", notes: "USER distributor 沒 channel" },

  // ── z-image — 1 個 ──
  { name: "z-image-turbo",                         series: "z-image", vendor: "Alibaba", price: 0.10, defaultEnabled: false, status: "known-bad", notes: "USER distributor 沒 channel" },
];

/** 預設啟用 model name 清單 (中堂推薦, USER distributor 唯一能跑) */
export const DEFAULT_ENABLED_MODELS: string[] = POCKGO_IMAGE_MODELS
  .filter(m => m.defaultEnabled)
  .map(m => m.name);

/** 預設 default model (中堂 6-14 11.4s 1468KB verify 成功) */
export const FALLBACK_MODEL = "gemini-2.5-flash-image";

/** localStorage key: 啟用清單 */
export const ENABLED_MODELS_KEY = "postcard_enabled_models_v1";
/** localStorage key: 當前選用的 model (provider 切到 pockgo 時用) */
export const SELECTED_MODEL_KEY = "postcard_selected_model_v1";
