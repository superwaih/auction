"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const CLIENT_KEY = "alfreed:client";
const NAME_KEY = "alfreed:name";
const ownerKeyName = (slug: string) => `alfreed:owner:${slug}`;

function safeGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode or blocked storage: the value just won't persist.
  }
}

let memoryClientId: string | null = null;

/** A random id for this browser, used to show "your number" and stop double picks. */
export function getClientId() {
  const stored = safeGet(CLIENT_KEY);
  if (stored) return stored;
  memoryClientId ??= Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  safeSet(CLIENT_KEY, memoryClientId);
  return memoryClientId;
}

export const getSavedName = () => safeGet(NAME_KEY) ?? "";
export const saveName = (name: string) => safeSet(NAME_KEY, name);
export const getOwnerKey = (slug: string) => safeGet(ownerKeyName(slug));
export const saveOwnerKey = (slug: string, key: string) => safeSet(ownerKeyName(slug), key);

/** True only after hydration, so time and storage reads never run during prerender. */
export function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/** Ticking clock, corrected by the server's offset. Null until mounted. */
export function useNow(offsetMs = 0, intervalMs = 250) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now() + offsetMs);
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [offsetMs, intervalMs]);
  return now;
}

export function formatRemaining(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function formatStart(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Shrinks a photo in the browser so uploads stay well under the 2 MB limit. */
export async function downscaleImage(file: File, maxSide = 1400): Promise<Blob> {
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
  return blob && blob.size < file.size ? blob : file;
}

/** "2026-10-25T14:30" in local time, for datetime-local inputs. */
export function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
