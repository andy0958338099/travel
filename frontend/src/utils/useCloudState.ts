/**
 * useCloudState — generic Supabase-backed reactive state.
 *
 * Strategy:
 *  1. On mount: try to read from Supabase `user_state` table.
 *     - Cloud has value     → use cloud, mirror to localStorage.
 *     - Cloud empty, has LS → push LS up to cloud, use LS.
 *     - Both empty          → use `defaultValue`, push up.
 *  2. Subscribe to Realtime (postgres_changes) on the same key.
 *     When a remote write arrives, update state + localStorage.
 *  3. On `setValue` (the returned setter):
 *     - Optimistic update state + localStorage immediately.
 *     - Fire-and-forget upsert to Supabase; status flips
 *       `synced` ↔ `syncing` ↔ `error` accordingly.
 *
 * Conflict resolution: last-write-wins by `updated_at`.
 * (Cloud is treated as the source of truth; localStorage is a
 *  one-time bootstrap + offline read cache.)
 *
 * No service-role key required — RLS allows anon reads/writes.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export type CloudStateStatus =
  | 'loading'   // initial fetch in progress
  | 'synced'    // cloud agrees with local
  | 'syncing'   // local write in flight to cloud
  | 'error'     // last sync failed (data still in localStorage)
  | 'offline';  // navigator.onLine === false

const LS_PREFIX = 'cs_'; // localStorage prefix for cloud-synced keys

export function useCloudState<T>(key: string, defaultValue: T) {
  const lsKey = LS_PREFIX + key;
  const supabaseRef = useRef(createClient());
  const isRemoteUpdate = useRef(false);
  const mountedRef = useRef(true);

  const [value, setValue] = useState<T>(defaultValue);
  const [status, setStatus] = useState<CloudStateStatus>('loading');

  // Keep latest value in a ref for the writer closure.
  const valueRef = useRef(value);
  valueRef.current = value;

  // ── Initial load + Realtime subscription ──────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    const supabase = supabaseRef.current;

    // 1. Read localStorage as a bootstrap fallback.
    let localValue: T | null = null;
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(lsKey);
        if (raw) localValue = JSON.parse(raw) as T;
      } catch {
        // ignore parse errors
      }
    }

    // 2. Fetch cloud value.
    supabase
      .from('user_state')
      .select('value, updated_at')
      .eq('key', key)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!mountedRef.current) return;
        if (error) {
          // Cloud unreachable — fall back to localStorage.
          if (localValue !== null) setValue(localValue);
          setStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error');
          return;
        }
        if (data) {
          // Cloud wins.
          const cloudValue = data.value as T;
          isRemoteUpdate.current = true;
          setValue(cloudValue);
          try {
            localStorage.setItem(lsKey, JSON.stringify(cloudValue));
          } catch {
            // ignore quota errors
          }
        } else if (localValue !== null) {
          // Cloud empty, local has data → push up.
          setValue(localValue);
          void writeCloud(key, localValue, /* silent */ true);
        } else {
          // Both empty → use default + push up.
          setValue(defaultValue);
          void writeCloud(key, defaultValue, /* silent */ true);
        }
        setStatus('synced');
      });

    // 3. Subscribe to Realtime updates for this key.
    const channel = supabase
      .channel(`user_state:${key}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_state',
          filter: `key=eq.${key}`,
        },
        (payload) => {
          if (!mountedRef.current) return;
          if (payload.eventType === 'DELETE') return;
          const row = payload.new as { value: T; updated_at: string };
          if (!row || row.value === undefined) return;
          isRemoteUpdate.current = true;
          setValue(row.value);
          try {
            localStorage.setItem(lsKey, JSON.stringify(row.value));
          } catch {
            // ignore
          }
          setStatus('synced');
        }
      )
      .subscribe();

    // 4. Online/offline detection.
    const onOnline = () => {
      if (status === 'offline' || status === 'error') {
        setStatus('synced');
        // Best-effort re-sync current value to cloud.
        void writeCloud(key, valueRef.current, /* silent */ true);
      }
    };
    const onOffline = () => setStatus('offline');
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // ── Write to cloud (with status updates) ──────────────────────────
  const writeCloud = useCallback(
    async (k: string, v: T, silent = false): Promise<boolean> => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (!silent) setStatus('offline');
        return false;
      }
      if (!silent) setStatus('syncing');
      const { error } = await supabaseRef.current
        .from('user_state')
        .upsert({
          key: k,
          value: v as unknown as object,
          updated_at: new Date().toISOString(),
        });
      if (!mountedRef.current) return !error;
      if (error) {
        if (!silent) setStatus('error');
        return false;
      }
      if (!silent) setStatus('synced');
      return true;
    },
    [],
  );

  // ── Setter (optimistic + fire-and-forget sync) ────────────────────
  const setCloudValue = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const next =
          typeof updater === 'function'
            ? (updater as (p: T) => T)(prev)
            : updater;
        // Mirror to localStorage immediately.
        try {
          localStorage.setItem(lsKey, JSON.stringify(next));
        } catch {
          // ignore
        }
        // Fire-and-forget cloud write.
        void writeCloud(key, next);
        return next;
      });
    },
    [key, lsKey, writeCloud],
  );

  return [value, setCloudValue, status] as const;
}
