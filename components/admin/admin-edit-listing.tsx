"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminFetch, toLocalInput, useNow } from "@/lib/client";
import { imageUrl } from "@/lib/types";
import { ListingForm } from "../listing-form";
import { Reveal } from "../reveal";
import { Shell } from "../ui";
import {
  AdminListingHeader,
  AdminListingMissing,
  adminListingSkeleton,
  statusAt,
  useAdminListing,
} from "./listing-header";

/** Edit tab: the form, plus removal while the draw is still scheduled. */
export function AdminEditListing({ slug }: { slug: string }) {
  const router = useRouter();
  const now = useNow(0, 1000);
  const { listing, missing, reload } = useAdminListing(slug);
  const [version, setVersion] = useState(0);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (missing) return <AdminListingMissing />;
  if (!listing || now === null) return adminListingSkeleton;

  const scheduled = statusAt(listing, now) === "scheduled";

  return (
    <div className="flex flex-col gap-8">
      <AdminListingHeader listing={listing} tab="edit" onChanged={reload} />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <Reveal>
          <Shell innerClassName="p-5 sm:p-9">
            <ListingForm
              // Remount after a save, or when the draw goes live, so the form shows what the server stored.
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
                reload();
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

        {scheduled ? (
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
        ) : (
          <p className="px-2 text-sm text-ink-2">Started draws can&rsquo;t be removed, so nobody&rsquo;s number disappears.</p>
        )}
      </div>
    </div>
  );
}
