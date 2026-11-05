"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * Work in progress that survives a refresh or a trip to the sign-in page. Stored in this browser only.
 * Memory is the working copy, so drafts still work for the session when localStorage is blocked.
 */
const memory = new Map<string, string | null>();
const listeners = new Set<() => void>();

function read(key: string): string | null {
  if (memory.has(key)) return memory.get(key) ?? null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    // Storage can be blocked. The draft then lasts only as long as the page.
  }
  memory.set(key, raw);
  return raw;
}

function write(key: string, raw: string | null) {
  memory.set(key, raw);
  try {
    if (raw === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, raw);
  } catch {
    // See read().
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Like useState, plus a clear function. The server and first client render use `fallback`, so hydration stays clean. */
export function useDraft<T>(key: string, fallback: T): [T, (value: T) => void, () => void] {
  const raw = useSyncExternalStore(subscribe, () => read(key), () => null);
  const value = useMemo(() => {
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }, [raw, fallback]);
  const set = useCallback((next: T) => write(key, JSON.stringify(next)), [key]);
  const clear = useCallback(() => write(key, null), [key]);
  return [value, set, clear];
}
