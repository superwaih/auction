"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminFetch, formatRemaining, useNow } from "@/lib/client";
import { winnersLabel, type ClosedListing, type ListingStatus } from "@/lib/types";
import { CategoryTag, StatusBadge } from "../ui";

export type AdminListing = ClosedListing & { highestPick: number };
export type AdminTab = "share" | "edit" | "entrants";

/** Loads one listing for the admin tabs, polling while it can still change. */
export function useAdminListing(slug: string) {
  const [listing, setListing] = useState<AdminListing | null>(null);
  const [missing, setMissing] = useState(false);

  const reload = useCallback(() => {
    adminFetch(`/api/admin/listings/${slug}`)
      .then((res) => {
        if (res.status === 404) setMissing(true);
        return res.ok ? (res.json() as Promise<AdminListing>) : null;
      })
      .then((data) => data && setListing(data))
      .catch(() => {});
  }, [slug]);

  const settled = listing?.status === "ended" && listing.winners !== undefined;
  useEffect(() => {
    reload();
    if (settled) return;
    const id = setInterval(reload, 4000);
    return () => clearInterval(id);
  }, [reload, settled]);

  return { listing, missing, reload };
}

export function statusAt(l: ClosedListing, now: number | null): ListingStatus {
  if (now === null) return l.status;
  return now < Date.parse(l.startsAt) ? "scheduled" : now < Date.parse(l.endsAt) ? "live" : "ended";
}

const TABS: { id: AdminTab; label: string; href: (slug: string) => string }[] = [
  { id: "share", label: "Share", href: (s) => `/admin/listings/${s}/share` },
  { id: "edit", label: "Edit", href: (s) => `/admin/listings/${s}` },
  { id: "entrants", label: "Entrants", href: (s) => `/admin/listings/${s}/entrants` },
];

/** Title block shared by a listing's admin tabs, with the End-now control for live draws. */
export function AdminListingHeader({
  listing,
  tab,
  onChanged,
}: {
  listing: AdminListing;
  tab: AdminTab;
  onChanged: () => void;
}) {
  const now = useNow(0, 1000);
  const status = statusAt(listing, now);
  const [confirming, setConfirming] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function endNow() {
    setEnding(true);
    setError(null);
    const res = await adminFetch(`/api/admin/listings/${listing.slug}/end`, { method: "POST" });
    setEnding(false);
    setConfirming(false);
    if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? "Could not end the draw.");
    onChanged();
  }

  return (
    <div className="flex flex-col gap-5">
      <Link href="/admin" className="self-start text-sm text-ink-2 hover:text-ink">
        ← Dashboard
      </Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col items-start gap-3">
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge status={status} />
            <CategoryTag category={listing.category} />
          </div>
          <h1 className="break-words font-serif text-[clamp(2.25rem,6vw,3.75rem)] font-light leading-[1.02] tracking-[-0.04em] text-ink">
            {listing.name}
          </h1>
          <p className="text-ink-2">
            1–{listing.slots} · {winnersLabel(listing.winnerCount)} · {listing.pickCount} picked
            {status === "live" && now !== null && ` · closes in ${formatRemaining(Date.parse(listing.endsAt) - now)}`}
            {status === "scheduled" && now !== null && ` · opens in ${formatRemaining(Date.parse(listing.startsAt) - now)}`}
          </p>
        </div>

        {status === "live" && (
          <div className="flex flex-wrap items-center gap-2">
            {confirming ? (
              <>
                <span className="text-sm text-ink-2">
                  End now and draw from the {listing.pickCount} {listing.pickCount === 1 ? "pick" : "picks"} so far?
                </span>
                <button
                  type="button"
                  disabled={ending}
                  onClick={endNow}
                  className="min-h-11 rounded-full bg-tomato px-5 text-sm font-semibold text-ink transition-transform active:scale-[0.97] disabled:opacity-50"
                >
                  {ending ? "Ending…" : "Yes, end it"}
                </button>
                <button type="button" className="min-h-11 px-3 text-sm text-ink-2 hover:text-ink" onClick={() => setConfirming(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="min-h-11 rounded-full bg-tomato-wash px-5 text-sm font-semibold text-tomato-ink ring-1 ring-tomato/30 transition-all hover:bg-tomato hover:text-ink active:scale-[0.97]"
              >
                End draw now
              </button>
            )}
          </div>
        )}
      </div>
      {error && <p className="rounded-2xl bg-tomato-wash px-4 py-3 text-sm font-medium text-tomato-ink">{error}</p>}

      <nav aria-label="Listing sections" className="flex gap-1 rounded-full bg-black/[0.045] p-1 ring-1 ring-black/[0.04] sm:w-max">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.href(listing.slug)}
            aria-current={tab === t.id ? "page" : undefined}
            className={`flex min-h-10 flex-1 items-center justify-center rounded-full px-5 text-sm font-medium transition-colors duration-300 sm:flex-none ${
              tab === t.id
                ? "bg-surface text-ink shadow-[0_1px_2px_rgba(42,33,28,0.08),0_6px_16px_-8px_rgba(42,33,28,0.2)]"
                : "text-ink-2 hover:text-ink"
            }`}
          >
            {t.label}
            {t.id === "entrants" && listing.pickCount > 0 && (
              <span className="ml-1.5 rounded-full bg-black/[0.07] px-1.5 text-xs tabular-nums">{listing.pickCount}</span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function AdminListingMissing() {
  return (
    <div className="flex flex-col items-start gap-4 py-16">
      <h1 className="font-serif text-4xl font-light tracking-[-0.03em] text-ink">This listing no longer exists.</h1>
      <Link href="/admin" className="text-cobalt-ink underline underline-offset-4">
        Back to the dashboard
      </Link>
    </div>
  );
}

export const adminListingSkeleton = <div className="h-[32rem] animate-pulse rounded-[2rem] bg-black/[0.04]" aria-busy />;
