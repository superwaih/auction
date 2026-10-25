"use client";

import Link from "next/link";
import { useProfile } from "@/lib/client";
import { hueFor } from "@/lib/colors";

/** The seller's initial in the nav, once this browser has listed something. */
export function ProfileLink() {
  const profile = useProfile();
  if (!profile.name && profile.listings.length === 0) return null;
  const hue = hueFor(profile.name || "seller");
  return (
    <Link
      href="/me"
      aria-label="My listings"
      title="My listings"
      className="flex size-10 shrink-0 items-center justify-center rounded-full font-serif text-lg transition-transform duration-500 ease-spring hover:scale-105 active:scale-95"
      style={{ background: hue.solid, color: hue.on }}
    >
      {(profile.name.trim().charAt(0) || "?").toUpperCase()}
    </Link>
  );
}
