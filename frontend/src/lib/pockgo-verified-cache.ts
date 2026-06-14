/**
 * Pockgo verified model cache (2026-06-14 聖上拍板 B)
 *
 * 24h localStorage 緩存 distributor 探活結果。
 * 用法:
 *   import { getCachedVerification, setCachedVerification, isVerifiedFresh, clearExpiredVerifications } from "@/lib/pockgo-verified-cache";
 *   const cached = getCachedVerification("gemini-2.5-flash-image");
 *   if (!isVerifiedFresh(cached)) await verifyModel("gemini-2.5-flash-image");
 *
 * Key: `postcard_verified_models_v1`
 * Value: { [modelName]: { status, checkedAt, httpStatus?, errorMsg?, latencyMs? } }
 * TTL: 24h, 過期需重 verify
 */

export type VerifyStatus = "verified" | "no-channel" | "bad-request" | "timeout" | "error" | "verifying";

export interface VerificationEntry {
  status: VerifyStatus;
  checkedAt: number;        // Date.now()
  httpStatus?: number;
  errorMsg?: string;
  latencyMs?: number;
}

const CACHE_KEY = "postcard_verified_models_v1";
const TTL_MS = 24 * 60 * 60 * 1000;  // 24 小時

function safeStorage(): Storage | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  return window.localStorage;
}

function readAll(): Record<string, VerificationEntry> {
  const s = safeStorage();
  if (!s) return {};
  try {
    const raw = s.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, VerificationEntry>;
    // 過濾掉 status === "verifying" 的 stale (e.g. 上次 verify 中被關掉 tab)
    const cleaned: Record<string, VerificationEntry> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v && typeof v === "object" && v.status && v.checkedAt && v.status !== "verifying") {
        cleaned[k] = v;
      }
    }
    return cleaned;
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, VerificationEntry>): void {
  const s = safeStorage();
  if (!s) return;
  try {
    s.setItem(CACHE_KEY, JSON.stringify(data));
  } catch { /* quota / private mode / etc */ }
}

/** 取得單個 model 的 cache entry, 沒則 undefined */
export function getCachedVerification(model: string): VerificationEntry | undefined {
  const all = readAll();
  return all[model];
}

/** 寫入單個 model 的 verify 結果 */
export function setCachedVerification(model: string, entry: Omit<VerificationEntry, "checkedAt">): void {
  const all = readAll();
  all[model] = { ...entry, checkedAt: Date.now() };
  writeAll(all);
}

/** 標記為 verifying 中 (供 useEffect trigger 時顯示 loading) */
export function setVerifying(model: string): void {
  const all = readAll();
  all[model] = { status: "verifying", checkedAt: Date.now() };
  writeAll(all);
}

/** 24h 內還算 fresh, true = 不需重 verify */
export function isVerifiedFresh(entry: VerificationEntry | undefined): boolean {
  if (!entry) return false;
  if (entry.status === "verifying") return false;  // verifying 永遠視為 stale, 觸發重跑
  return Date.now() - entry.checkedAt < TTL_MS;
}

/** 清掉過期 entry (24h 前的) */
export function clearExpiredVerifications(): void {
  const all = readAll();
  const now = Date.now();
  const cleaned: Record<string, VerificationEntry> = {};
  for (const [k, v] of Object.entries(all)) {
    if (v.status === "verifying" || now - v.checkedAt < TTL_MS) {
      cleaned[k] = v;
    }
  }
  writeAll(cleaned);
}

/** 取得所有 enabled model 中, 需要 verify 的清單 (沒 cache 或已過期) */
export function getModelsNeedingVerify(enabledModels: string[]): string[] {
  const all = readAll();
  return enabledModels.filter(m => {
    const entry = all[m];
    return !isVerifiedFresh(entry);
  });
}

/** 一次寫入多個 model 的 verify 結果 */
export function setMultipleVerifications(entries: Record<string, Omit<VerificationEntry, "checkedAt">>): void {
  const all = readAll();
  const now = Date.now();
  for (const [k, v] of Object.entries(entries)) {
    all[k] = { ...v, checkedAt: now };
  }
  writeAll(all);
}
