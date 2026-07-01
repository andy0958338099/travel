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
 * ⚠️ 2026-06-14 聖上拍板 B: 移除 hard-code `status: "verified"|"known-bad"|"untested"` 欄位
 *    改用 runtime verify 結果決定 (見 /lib/pockgo-verified-cache.ts)
 * 之前 6-14 1 次 production curl 確認 distributor 客觀只支援 gemini-2.5-flash-image
 *    24 個 known-bad 是當時快照, distributor 政策可能變, runtime verify 才是真相
 *
 * 2026-06-15 聖上怒「為何無法運用成正確生成的圖」, 中堂重新探活 36 個 image model,
 *    確認 distributor 客觀只 3 個有 channel: gemini-2.5-flash-image / z-image-turbo / nano-banana
 *    其他 33 個 503 "No available channel for model X under group default (distributor)"
 *    新加 nano-banana (Google 出品, 6-15 卡通 Q版測試 1922KB / 10.5s 細節最多)
 *
 * 用法:
 *   import { POCKGO_IMAGE_MODELS, DEFAULT_ENABLED_MODELS, FALLBACK_MODEL } from "@/lib/pockgo-image-models";
 *   - ClientPage 顯示 model 庫 UI
 *   - 啟用清單存 localStorage (postcard_enabled_models_v1)
 *   - 預設啟用 3 個: gemini-2.5-flash-image + z-image-turbo + nano-banana (3 個 6-15 verified)
 */

export type ModelSeries = "gemini" | "nano-banana" | "gpt-image" | "seedream" | "qwen" | "hunyuan" | "flux" | "grok" | "z-image";

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
  /** 備註 (UI 顯示) */
  notes?: string;
}

export const POCKGO_IMAGE_MODELS: PockgoImageModel[] = [
  // ── gemini (Google) — 7 個 ──
  { name: "gemini-2.5-flash-image",                series: "gemini", vendor: "Google", price: 0.04, defaultEnabled: true, notes: "6-14 verify (11.4s 1468KB)" },
  { name: "nano-banana",                           series: "nano-banana", vendor: "Google", price: 0.07, defaultEnabled: true, notes: "6-15 聖上怒找模型, 中堂新發現 distributor 3 個能跑之一 (10.5s 1922KB 細節最多, 卡通 Q版最強)" },
  { name: "gemini-2.5-flash-image-preview",        series: "gemini", vendor: "Google", price: 0.05, defaultEnabled: false },
  { name: "gemini-3.1-flash-image-preview",        series: "gemini", vendor: "Google", price: 0.03, defaultEnabled: false },
  { name: "gemini-3.1-flash-image-preview-2k",     series: "gemini", vendor: "Google", price: 0.05, resolution: "2K", defaultEnabled: false },
  { name: "gemini-3.1-flash-image-preview-4k",     series: "gemini", vendor: "Google", price: 0.10, resolution: "4K", defaultEnabled: false, notes: "中堂 6-12 4K verify 成功 1510KB, 6-14 distributor 把 gemini 3.x channel 拿掉" },
  { name: "gemini-3-pro-image-preview",           series: "gemini", vendor: "Google", price: 0.10, defaultEnabled: false },
  { name: "gemini-3-pro-image-preview-2k",        series: "gemini", vendor: "Google", price: 0.15, resolution: "2K", defaultEnabled: false },
  { name: "gemini-3-pro-image-preview-4k",         series: "gemini", vendor: "Google", price: 0.30, resolution: "4K", defaultEnabled: false, notes: "4K 撞 Netlify 30s cap 需 Pro $19/mo" },

  // ── gpt-image (OpenAI) — 4 個 ──
  { name: "gpt-image-1.5",                         series: "gpt-image", vendor: "OpenAI", price: 0.14, defaultEnabled: false },
  { name: "gpt-image-2",                           series: "gpt-image", vendor: "OpenAI", price: 0.05, defaultEnabled: false },
  { name: "gpt-image-2-2k",                        series: "gpt-image", vendor: "OpenAI", price: 0.08, resolution: "2K", defaultEnabled: true, notes: "6-30 localhost test 啟用, distributor 待 verify" },
  { name: "gpt-image-2-4k",                        series: "gpt-image", vendor: "OpenAI", price: 0.10, resolution: "4K", defaultEnabled: false, notes: "4K 撞 Netlify 30s cap" },

  // ── seedream (字節跳動) — 4 個 ──
  { name: "seedream-4.0",                          series: "seedream", vendor: "字節跳動", price: 0.08, defaultEnabled: false },
  { name: "seedream-4.0-2k",                       series: "seedream", vendor: "字節跳動", price: 0.10, resolution: "2K", defaultEnabled: false },
  { name: "seedream-4.6",                          series: "seedream", vendor: "字節跳動", price: 0.12, defaultEnabled: false },
  { name: "seedream-5.0",                          series: "seedream", vendor: "字節跳動", price: 0.15, defaultEnabled: false },

  // ── qwen (阿里) — 4 個 ──
  { name: "qwen-image",                            series: "qwen", vendor: "阿里", price: 0.04, defaultEnabled: false },
  { name: "qwen-image-2512",                       series: "qwen", vendor: "阿里", price: 0.04, defaultEnabled: false, notes: "6-13 報 model_not_found" },
  { name: "qwen-image-edit-2509",                  series: "qwen", vendor: "阿里", price: 0.05, defaultEnabled: false },
  { name: "qwen-image-edit-2511",                  series: "qwen", vendor: "阿里", price: 0.05, defaultEnabled: false },

  // ── hunyuan (騰訊) — 1 個 ──
  { name: "hunyuan-image-3",                       series: "hunyuan", vendor: "騰訊", price: 0.04, defaultEnabled: false },

  // ── flux (Black Forest Labs) — 3 個 ──
  { name: "flux-2-dev",                            series: "flux", vendor: "Black Forest Labs", price: 0.10, defaultEnabled: false },
  { name: "flux-2-flex",                           series: "flux", vendor: "Black Forest Labs", price: 0.50, defaultEnabled: false },
  { name: "flux-2-pro",                            series: "flux", vendor: "Black Forest Labs", price: 0.30, defaultEnabled: false },

  // ── grok (xAI) — 2 個 ──
  { name: "grok-3-image",                          series: "grok", vendor: "xAI", price: 0.07, defaultEnabled: false },
  { name: "grok-imagine-image",                    series: "grok", vendor: "xAI", price: 0.07, defaultEnabled: false },

  // ── z-image — 1 個 ──
  { name: "z-image-turbo",                         series: "z-image", vendor: "Alibaba", price: 0.10, defaultEnabled: true, notes: "6-15 verify (10.2s, 8 張 9-23s, 105-134KB)" },
];

/** 預設啟用 model name 清單 (gemini-2.5-flash-image + nano-banana + z-image-turbo, 6-15 verify 確認 distributor 客觀只這 3 個能跑) */
export const DEFAULT_ENABLED_MODELS: string[] = POCKGO_IMAGE_MODELS
  .filter(m => m.defaultEnabled)
  .map(m => m.name);

/** 預設 default model (gemini-2.5-flash-image, 中堂 6-14 11.4s 1468KB verify 成功, USER distributor 3 個能跑 model 之一, 當 fallback 對象) */
export const FALLBACK_MODEL = "gemini-2.5-flash-image";

/** localStorage key: 啟用清單 */
export const ENABLED_MODELS_KEY = "postcard_enabled_models_v1";
/** localStorage key: 當前選用的 model (provider 切到 pockgo 時用) */
export const SELECTED_MODEL_KEY = "postcard_selected_model_v1";
