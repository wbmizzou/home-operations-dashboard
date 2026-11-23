"use client";
import { useCallback, useSyncExternalStore } from "react";

const CHANGE = "hh-local-storage";
const noop = () => () => {};

function subscribeStorage(callback: () => void) {
  window.addEventListener("storage", callback); // other tabs
  window.addEventListener(CHANGE, callback); // this tab
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE, callback);
  };
}

/**
 * A value saved in localStorage on this device. Renders `serverValue` on the server and during
 * hydration, then the stored value, so there's no hydration mismatch. Returns null when nothing is
 * saved or storage is unavailable (private mode, blocked site data).
 */
export function useLocalStorage(key: string, serverValue: string | null = null): [string | null, (value: string | null) => void] {
  const value = useSyncExternalStore(
    subscribeStorage,
    () => { try { return localStorage.getItem(key); } catch { return null; } },
    () => serverValue,
  );
  const set = useCallback((next: string | null) => {
    try { if (next === null) localStorage.removeItem(key); else localStorage.setItem(key, next); } catch {}
    window.dispatchEvent(new Event(CHANGE));
  }, [key]);
  return [value, set];
}

/** A value that only exists in the browser (window, navigator). `serverValue` is used until hydration. */
export function useBrowserValue<T extends string | number | boolean>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(noop, read, () => serverValue);
}
