"use client";

import Link from "next/link";
import { useMounted, useNow } from "@/lib/client";
import { hueForNumber } from "@/lib/colors";
import { Reveal } from "../reveal";
import { SharePanel } from "../share-panel";
import { Shell, ghostButtonClass } from "../ui";
import { AdminListingHeader, AdminListingMissing, adminListingSkeleton, statusAt, useAdminListing } from "./listing-header";

/** Share tab: a QR big enough to put on a screen, the link, and the result once drawn. */
export function AdminShareListing({ slug, created }: { slug: string; created: boolean }) {
  const mounted = useMounted();
  const now = useNow(0, 1000);
  const { listing, missing, reload } = useAdminListing(slug);

  if (missing) return <AdminListingMissing />;
  if (!listing || !mounted || now === null) return adminListingSkeleton;

  const status = statusAt(listing, now);
  const url = `${window.location.origin}/l/${slug}`;

  return (
    <div className="flex flex-col gap-8">
      <AdminListingHeader listing={listing} tab="share" onChanged={reload} />

      {created && (
        <p className="pop rounded-2xl bg-mint-wash px-4 py-3 text-sm font-medium text-mint-ink">
          {status === "scheduled" ? "Scheduled." : "It's live."} Put the QR code where people can scan it, or send the link.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <Reveal className="md:col-span-7">
          <Shell innerClassName="flex flex-col gap-6 p-5 sm:p-8">
            <SharePanel url={url} title={listing.name} large />
            <div className="flex flex-wrap gap-2">
              <Link href={`/l/${slug}`} target="_blank" className={`${ghostButtonClass} min-h-11`}>
                Open the draw
              </Link>
              <button type="button" className={`${ghostButtonClass} min-h-11`} onClick={() => window.print()}>
                Print
              </button>
            </div>
          </Shell>
        </Reveal>

        <Reveal index={1} className="md:col-span-5">
          <Shell innerClassName="flex flex-col gap-4 p-6 sm:p-7">
            <h2 className="font-serif text-2xl font-light tracking-[-0.03em] text-ink">
              {status === "ended" ? (listing.winners.length === 1 ? "Winner" : "Winners") : "How it's going"}
            </h2>
            {status !== "ended" ? (
              <>
                <p className="text-ink-2">
                  {listing.pickCount} of {listing.slots} numbers taken.
                </p>
                <div className="h-2 overflow-hidden rounded-full bg-black/[0.06]" aria-hidden>
                  <div
                    className="h-full origin-left rounded-full bg-mint transition-transform duration-700"
                    style={{ transform: `scaleX(${listing.pickCount / listing.slots})` }}
                  />
                </div>
                <Link href={`/admin/listings/${slug}/entrants`} className="text-sm font-medium text-cobalt-ink underline underline-offset-4">
                  See who has picked
                </Link>
              </>
            ) : listing.winners.length === 0 ? (
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
        </Reveal>
      </div>
    </div>
  );
}
