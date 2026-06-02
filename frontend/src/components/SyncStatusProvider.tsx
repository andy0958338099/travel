"use client";

/**
 * SyncStatusProvider
 *
 * Aggregates status reports from every useCloudState instance on the page.
 * The hook calls `reportStatus(key, status)` on each transition; this
 * provider collects them and exposes:
 *  - `useSyncStatus()` → the worst (most-attention-worthy) status across
 *    all instances, with a small label and tone for UI use.
 *  - `useSyncIndicator()` → the same data plus a count of pending writes,
 *    ready to feed a status pill.
 *
 * The provider lives at the root layout level so it survives page
 * transitions; the underlying Map is module-scoped so HMR + remount
 * never lose state.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type SyncStatusValue =
  | "loading"
  | "synced"
  | "syncing"
  | "error"
  | "offline";

type Entry = {
  status: SyncStatusValue;
  lastChange: number;
};

type StatusMap = Record<string, Entry>;

// Module-scoped registry so the same Map is shared across HMR boundaries.
const listeners = new Set<(map: StatusMap) => void>();
let statusMap: StatusMap = {};

// Called by useCloudState on every status change.
export function reportStatus(key: string, status: SyncStatusValue) {
  const prev = statusMap[key];
  if (prev && prev.status === status) return;
  statusMap = { ...statusMap, [key]: { status, lastChange: Date.now() } };
  listeners.forEach((l) => l(statusMap));
}

function unregister(key: string) {
  if (!(key in statusMap)) return;
  const next = { ...statusMap };
  delete next[key];
  statusMap = next;
  listeners.forEach((l) => l(statusMap));
}

// ── Priority order (worst → best) ──────────────────────────────────────────
const PRIORITY: Record<SyncStatusValue, number> = {
  offline: 4,
  error: 3,
  syncing: 2,
  loading: 1,
  synced: 0,
};

function aggregate(map: StatusMap): SyncStatusValue {
  let worst: SyncStatusValue = "synced";
  for (const entry of Object.values(map)) {
    if (PRIORITY[entry.status] > PRIORITY[worst]) worst = entry.status;
  }
  return worst;
}

// ── Context ────────────────────────────────────────────────────────────────
type Ctx = {
  status: SyncStatusValue;
  count: number;
  syncingCount: number;
  errorCount: number;
  entries: StatusMap;
};

const SyncStatusCtx = createContext<Ctx | null>(null);

export function SyncStatusProvider({ children }: { children: ReactNode }) {
  const [map, setMap] = useState<StatusMap>(statusMap);

  useEffect(() => {
    listeners.add(setMap);
    // Sync state to current module value in case it changed between render and effect.
    setMap(statusMap);
    return () => {
      listeners.delete(setMap);
    };
  }, []);

  const value = useMemo<Ctx>(() => {
    const entries = Object.values(map);
    return {
      status: aggregate(map),
      count: entries.length,
      syncingCount: entries.filter((e) => e.status === "syncing").length,
      errorCount: entries.filter(
        (e) => e.status === "error" || e.status === "offline"
      ).length,
      entries: map,
    };
  }, [map]);

  return (
    <SyncStatusCtx.Provider value={value}>{children}</SyncStatusCtx.Provider>
  );
}

export function useSyncStatus(): Ctx {
  const ctx = useContext(SyncStatusCtx);
  if (!ctx) {
    // Outside provider: return a safe default so individual components still work.
    return { status: "synced", count: 0, syncingCount: 0, errorCount: 0, entries: {} };
  }
  return ctx;
}

// ── Cleanup helper for useCloudState (so unmounts clear their entry) ──────
export function useStatusReporter(key: string, status: SyncStatusValue) {
  // We only want to call reportStatus when status actually changes; the
  // module-level dedup in reportStatus handles that.
  useEffect(() => {
    reportStatus(key, status);
  }, [key, status]);

  // Track the most recent key in a ref so cleanup targets it even if the
  // hook re-runs with a different key.
  const lastKey = useRef(key);
  useEffect(() => {
    lastKey.current = key;
  }, [key]);

  useEffect(() => {
    return () => {
      unregister(lastKey.current);
    };
  }, []);
}
