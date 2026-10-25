"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { adminFetch, formatRemaining, toLocalInput, useMounted, useNow } from "@/lib/client";
import { hueForNumber } from "@/lib/colors";
import { imageUrl, winnersLabel, type ClosedListing, type ListingStatus } from "@/lib/types";
import { ListingForm } from "../listing-form";
import { Reveal } from "../reveal";
import { SharePanel } from "../share-panel";
import { CategoryTag, Eyebrow, Shell, StatusBadge } from "../ui";

type AdminListing = ClosedListing & { highestPick: number };

export function AdminEditListing({ slug, created }: { slug: string; created: boolean }) {
  const router = useRouter();
  const mounted = useMounted();
  const now = useNow(0, 1000);
  const [listing, setListing] = useState<AdminListing | null>(null);
  const [missing, setMissing] = useState(false);
  const [version, setVersion] = useState(0);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(() => {
    adminFetch(`/api/admin/listings/${slug}`)
      .then((res) => {
        if (res.status === 404) setMissing(true);
        return res.ok ? (res.json() as Promise<AdminListing>) : null;
      })
      .then((data) => data && setListing(data))
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  if (missing) {
    return (
      <div className="flex flex-col items-start gap-4 py-16">
        <h1 className="font-serif text-4xl font-light tracking-[-0.03em] text-ink">This listing no longer exists.</h1>
        <Link href="/admin" className="text-cobalt-ink underline underline-offset-4">
          Back to the dashboard
        </Link>
      </div>
    );
  }
  if (!listing || now === null || !mounted) return <div className="h-[32rem] animate-pulse rounded-[2rem] bg-black/[0.04]" aria-busy />;

  const status: ListingStatus =
    now < Date.parse(listing.startsAt) ? "scheduled" : now < Date.parse(listing.endsAt) ? "live" : "ended";
  const scheduled = status === "scheduled";
  const url = `${window.location.origin}/l/${slug}`;

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:gap-10">
      <div className="flex flex-col gap-6 md:sticky md:top-24 md:col-span-5 md:self-start">
        <Reveal className="flex flex-col items-start gap-3">
          <Link href="/admin" className="text-sm text-ink-2 hover:text-ink">
            ← Dashboard
          </Link>
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge status={status} />
            <CategoryTag category={listing.category} />
          </div>
          <h1 className="break-words font-serif text-[clamp(2.25rem,6vw,3.75rem)] font-light leading-[1.02] tracking-[-0.04em] text-ink">
            {listing.name}
          </h1>
          <p className="text-ink-2">
            1–{listing.slots} · {winnersLabel(listing.winnerCount)} · {listing.pickCount} picked
            {status === "live" && ` · closes in ${formatRemaining(Date.parse(listing.endsAt) - now)}`}
            {scheduled && ` · opens in ${formatRemaining(Date.parse(listing.startsAt) - now)}`}
          </p>
        </Reveal>

        {created && (
          <p className="pop rounded-2xl bg-mint-wash px-4 py-3 text-sm font-medium text-mint-ink">
            {scheduled ? "Scheduled." : "It's live."} Share the QR code or link below.
          </p>
        )}

        {status === "ended" && (
          <Shell innerClassName="flex flex-col gap-3 p-6">
            <h2 className="font-serif text-2xl font-light tracking-[-0.03em] text-ink">
              {listing.winners.length === 1 ? "Winner" : "Winners"}
            </h2>
            {listing.winners.length === 0 ? (
              <p className="text-ink-2">No winner. Nobody picked a number.</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {listing.winners.map((w, i) => {
                  const hue = hueForNumber(w.number);
                  return (
                    <li key={w.number} className="flex items-center gap-3">
                      <span className="w-6 text-sm tabular-nums text-ink-2">{i + 1}.</span>
                      <span
                        className="flex size-9 items-center justify-center rounded-xl font-semibold tabular-nums"
                        style={{ background: hue.solid, color: hue.on }}
                      >
                        {w.number}
                      </span>
                      <span className="font-medium text-ink">{w.name}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </Shell>
        )}

        <Reveal index={1}>
          <Shell innerClassName="flex flex-col gap-5 p-5 sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-serif text-2xl font-light tracking-[-0.03em] text-ink">Share</h2>
              <Link href={`/l/${slug}`} target="_blank" className="text-sm font-medium text-cobalt-ink underline underline-offset-4">
                Open draw
              </Link>
            </div>
            <SharePanel url={url} title={listing.name} compact />
          </Shell>
        </Reveal>
      </div>

      <div className="flex flex-col gap-5 md:col-span-7">
        <Reveal index={1}>
          <Shell innerClassName="p-5 sm:p-9">
            <h2 className="mb-6 font-serif text-3xl font-light tracking-[-0.03em] text-ink">Edit details</h2>
            <ListingForm
              // Remount after a save so the form reflects what the server stored.
              key={`${version}-${scheduled}`}
              rulesLocked={!scheduled}
              minSlots={listing.highestPick}
              initial={{
                name: listing.name,
                ownerName: listing.ownerName,
                category: listing.category,
                slots: listing.slots,
                winnerCount: listing.winnerCount,
                durationMinutes: listing.durationMinutes,
                startMode: "later",
                startsAt: toLocalInput(new Date(listing.startsAt)),
                imageUrl: listing.hasImage ? imageUrl(listing) : null,
              }}
              submitLabel={(mode) => (scheduled && mode === "now" ? "Save and go live now" : "Save changes")}
              onSubmit={async (form) => {
                setSaved(false);
                const res = await adminFetch(`/api/listings/${slug}`, { method: "PATCH", body: form });
                const body = await res.json().catch(() => ({}));
                if (!res.ok) return body.error ?? "Could not save.";
                setSaved(true);
                setVersion((v) => v + 1);
                load();
                return null;
              }}
            />
            {saved && (
              <p role="status" className="pop mt-5 rounded-2xl bg-mint-wash px-4 py-3 text-sm font-medium text-mint-ink">
                Changes saved.
              </p>
            )}
          </Shell>
        </Reveal>

        {scheduled && (
          <div className="flex flex-wrap items-center justify-end gap-3 px-2 text-sm">
            {deleteError && <span className="text-tomato-ink">{deleteError}</span>}
            {confirmDelete ? (
              <>
                <span className="text-ink-2">Remove this listing?</span>
                <button
                  type="button"
                  className="rounded-full bg-tomato px-4 py-2 font-medium text-ink transition-transform active:scale-[0.97]"
                  onClick={async () => {
                    const res = await adminFetch(`/api/listings/${slug}`, { method: "DELETE" });
                    if (res.ok) router.push("/admin");
                    else setDeleteError((await res.json().catch(() => ({}))).error ?? "Could not remove it.");
                  }}
                >
                  Remove
                </button>
                <button type="button" className="text-ink-2 hover:text-ink" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <button type="button" className="font-medium text-tomato-ink hover:underline" onClick={() => setConfirmDelete(true)}>
                Remove listing
              </button>
            )}
          </div>
        )}
        {!scheduled && (
          <p className="px-2 text-sm text-ink-2">
            <Eyebrow>Note</Eyebrow> Started draws can&rsquo;t be removed, so nobody&rsquo;s number disappears.
          </p>
        )}
      </div>
    </div>
  );
}
