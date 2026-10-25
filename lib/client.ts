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

/* ---------- Seller profile: lives only in this browser ---------- */

const PROFILE_KEY = "alfreed:profile";
const PROFILE_EVENT = "alfreed:profile";

export type SavedListing = { slug: string; name: string; createdAt: string };
export type Profile = { name: string; listings: SavedListing[] };

const EMPTY_PROFILE: Profile = { name: "", listings: [] };
let cachedRaw: string | null = null;
let cachedProfile: Profile = EMPTY_PROFILE;

export function getProfile(): Profile {
  const raw = safeGet(PROFILE_KEY);
  if (raw === cachedRaw) return cachedProfile;
  cachedRaw = raw;
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    cachedProfile =
      parsed && typeof parsed.name === "string" && Array.isArray(parsed.listings) ? parsed : EMPTY_PROFILE;
  } catch {
    cachedProfile = EMPTY_PROFILE;
  }
  return cachedProfile;
}

function writeProfile(profile: Profile) {
  safeSet(PROFILE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new Event(PROFILE_EVENT));
}

/** Called after a successful listing: remembers the seller's name and the draw. */
export function rememberListing(listing: SavedListing, ownerName: string) {
  const p = getProfile();
  writeProfile({
    name: ownerName.trim() || p.name,
    listings: [listing, ...p.listings.filter((l) => l.slug !== listing.slug)],
  });
}

export function forgetListing(slug: string) {
  const p = getProfile();
  writeProfile({ ...p, listings: p.listings.filter((l) => l.slug !== slug) });
}

export function renameProfile(name: string) {
  writeProfile({ ...getProfile(), name: name.trim() });
}

/** The profile, kept in sync across tabs; empty during prerender. */
export function useProfile(): Profile {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      window.addEventListener(PROFILE_EVENT, onChange);
      return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener(PROFILE_EVENT, onChange);
      };
    },
    getProfile,
    () => EMPTY_PROFILE,
  );
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
