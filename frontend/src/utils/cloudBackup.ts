/**
 * Cloud Backup — JSON export/import for travel data.
 *
 * Exports merge from BOTH Supabase (cloud) and localStorage (offline cache),
 * preferring the newer updated_at per key. Imports write to BOTH targets
 * (Supabase first so cross-device sync kicks in immediately, localStorage
 * as the offline bootstrap).
 *
 * The set of known keys is fixed here so adding a new useCloudState doesn't
 * silently break the backup format.
 */

import { createClient } from "@/utils/supabase/client";

export const BACKUP_KEYS = [
  "hangzhou-trip-planner",
  "hangzhou-trip-budget",
  "hangzhou-trip-packing",
  "hangzhou-trip-itinerary",
  "hangzhou-trip-journal-narratives",
  "hangzhou-trip-font-size",
  "travel-nav-order",
  "hangzhou-trip-flight",
  "hangzhou-trip-hotel",
  "travel-videos",
];

type BackupFile = {
  version: 2;
  exportedAt: string;
  source: "cloud+local";
  keys: Record<
    string,
    {
      value: unknown;
      updated_at: string;
      source: "cloud" | "local";
    }
  >;
};

export async function exportCloudBackup(): Promise<{
  filename: string;
  count: number;
  json: string;
}> {
  // 1. Pull all user_state rows from Supabase (anon read).
  const supabase = createClient();
  const { data: rows, error } = await supabase
    .from("user_state")
    .select("key, value, updated_at")
    .in("key", BACKUP_KEYS);
  if (error) throw new Error(`雲端讀取失敗: ${error.message}`);

  const cloudByKey = new Map<
    string,
    { value: unknown; updated_at: string }
  >();
  for (const r of rows || []) {
    cloudByKey.set(r.key as string, {
      value: r.value as unknown,
      updated_at: (r.updated_at as string) ?? new Date(0).toISOString(),
    });
  }

  // 2. Merge with localStorage (cloud wins on tie, local fills in gaps).
  const keys: BackupFile["keys"] = {};
  let count = 0;
  for (const k of BACKUP_KEYS) {
    const cloud = cloudByKey.get(k);
    const localRaw =
      typeof window !== "undefined" ? localStorage.getItem(k) : null;
    if (cloud) {
      keys[k] = { value: cloud.value, updated_at: cloud.updated_at, source: "cloud" };
      count++;
    } else if (localRaw) {
      try {
        keys[k] = {
          value: JSON.parse(localRaw),
          updated_at: new Date(0).toISOString(),
          source: "local",
        };
        count++;
      } catch {
        // ignore corrupt LS entry
      }
    }
  }

  const file: BackupFile = {
    version: 2,
    exportedAt: new Date().toISOString(),
    source: "cloud+local",
    keys,
  };

  const filename = `hangzhou-trip-backup-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;
  return { filename, count, json: JSON.stringify(file, null, 2) };
}

export async function importCloudBackup(
  json: string
): Promise<{ count: number; rejected: number }> {
  const parsed = JSON.parse(json);

  // Accept both v1 (flat key→string) and v2 (key→{value,updated_at}) formats.
  let entries: { key: string; value: unknown; updated_at: string }[] = [];
  if (parsed?.version === 2 && parsed.keys && typeof parsed.keys === "object") {
    entries = Object.entries(parsed.keys).map(([k, v]: [string, any]) => ({
      key: k,
      value: v.value,
      updated_at: v.updated_at || new Date().toISOString(),
    }));
  } else if (parsed && typeof parsed === "object") {
    // v1: flat { key: jsonString }
    entries = Object.entries(parsed).map(([k, v]) => {
      let parsed_v: unknown = v;
      try {
        parsed_v = typeof v === "string" ? JSON.parse(v) : v;
      } catch {
        // keep raw
      }
      return { key: k, value: parsed_v, updated_at: new Date().toISOString() };
    });
  } else {
    throw new Error("檔案格式不正確");
  }

  // Filter to known keys only (skip unknown to avoid polluting cloud with garbage).
  const known = new Set(BACKUP_KEYS);
  const filtered = entries.filter((e) => known.has(e.key));
  const rejected = entries.length - filtered.length;

  // Write to Supabase first so other devices pick it up via Realtime.
  if (filtered.length > 0) {
    const supabase = createClient();
    const rows = filtered.map((e) => ({
      key: e.key,
      value: e.value as unknown as object,
      updated_at: e.updated_at,
    }));
    const { error } = await supabase.from("user_state").upsert(rows);
    if (error) {
      throw new Error(`雲端寫入失敗: ${error.message}`);
    }
  }

  // Mirror to localStorage (offline bootstrap).
  if (typeof window !== "undefined") {
    for (const e of filtered) {
      try {
        localStorage.setItem(e.key, JSON.stringify(e.value));
      } catch {
        // quota
      }
    }
  }

  return { count: filtered.length, rejected };
}
