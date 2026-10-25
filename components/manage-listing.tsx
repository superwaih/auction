"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getOwnerKey, saveOwnerKey, toLocalInput } from "@/lib/client";
import { imageUrl, type PublicListing } from "@/lib/types";
import { ListingForm } from "./listing-form";
import { buttonClass } from "./ui";

type State =
  | { kind: "loading" }
  | { kind: "denied"; message: string }
  | { kind: "locked"; listing: PublicListing }
  | { kind: "editing"; listing: PublicListing; key: string };

export function ManageListing({ slug }: { slug: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    // The owner link carries its key in the hash so it never reaches server logs.
    const fromHash = new URLSearchParams(window.location.hash.slice(1)).get("key");
    if (fromHash) {
      saveOwnerKey(slug, fromHash);
      history.replaceState(null, "", window.location.pathname);
    }
    const key = fromHash ?? getOwnerKey(slug);

    (async () => {
      if (!key) {
        setState({ kind: "denied", message: "Open this page from your private owner link to edit the listing." });
        return;
      }
      const auth = await fetch(`/api/listings/${slug}/owner`, { method: "POST", headers: { "x-owner-key": key } });
      if (!auth.ok) {
        const body = await auth.json().catch(() => ({}));
        setState({ kind: "denied", message: body.error ?? "This owner link is not valid." });
        return;
      }
      const res = await fetch(`/api/listings/${slug}`, { cache: "no-store" });
      const listing: PublicListing = await res.json();
      setState(listing.status === "scheduled" ? { kind: "editing", listing, key } : { kind: "locked", listing });
    })();
  }, [slug]);

  // Flip to locked the moment the draw starts while the page is open.
  const startsAt = state.kind === "editing" ? Date.parse(state.listing.startsAt) : null;
  useEffect(() => {
    if (startsAt === null || state.kind !== "editing") return;
    const ms = startsAt - Date.now();
    const t = setTimeout(() => setState({ kind: "locked", listing: state.listing }), Math.max(0, ms));
    return () => clearTimeout(t);
  }, [startsAt, state]);

  if (state.kind === "loading") return <div className="h-96 animate-pulse rounded-xl bg-surface" aria-busy />;

  if (state.kind === "denied") {
    return (
      <div className="py-16">
        <h1 className="font-serif text-4xl tracking-[-0.03em] text-ink">Owner access needed.</h1>
        <p className="mt-3 text-ink-2">{state.message}</p>
        <Link href={`/l/${slug}`} className={`${buttonClass} mt-8`}>
          View the draw
        </Link>
      </div>
    );
  }

  if (state.kind === "locked") {
    return (
      <div className="py-16">
        <h1 className="font-serif text-4xl leading-tight tracking-[-0.03em] text-ink">This listing is locked.</h1>
        <p className="mt-3 text-ink-2">
          {state.listing.name} has started, so its details can no longer be changed. Everyone sees exactly what was
          published.
        </p>
        <Link href={`/l/${slug}`} className={`${buttonClass} mt-8`}>
          Watch the draw
        </Link>
      </div>
    );
  }

  const { listing, key } = state;
  return (
    <div className="flex flex-col gap-8 pb-8">
      <div>
        <h1 className="font-serif text-4xl leading-tight tracking-[-0.03em] text-ink">Edit listing</h1>
        <p className="mt-2 text-ink-2">You can change anything until the countdown starts.</p>
      </div>
      <div className="rounded-xl border border-line bg-surface p-6 sm:p-8">
        <ListingForm
          initial={{
            name: listing.name,
            durationMinutes: listing.durationMinutes,
            startMode: "later",
            startsAt: toLocalInput(new Date(listing.startsAt)),
            imageUrl: listing.hasImage ? imageUrl(listing) : null,
          }}
          submitLabel={(mode) => (mode === "now" ? "Save and go live now" : "Save changes")}
          onSubmit={async (form) => {
            setSaved(false);
            const res = await fetch(`/api/listings/${slug}`, {
              method: "PATCH",
              body: form,
              headers: { "x-owner-key": key },
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) return body.error ?? "Could not save.";
            if (form.get("startMode") === "now") {
              router.push(`/l/${slug}`);
              return null;
            }
            const fresh: PublicListing = await (await fetch(`/api/listings/${slug}`, { cache: "no-store" })).json();
            setState({ kind: "editing", listing: fresh, key });
            setSaved(true);
            return null;
          }}
        />
        {saved && (
          <p role="status" className="mt-4 rounded-md bg-green-bg px-3.5 py-2.5 text-sm text-green">
            Changes saved.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 px-1">
        <Link href={`/l/${slug}`} className="text-sm text-ink underline underline-offset-4">
          View public page
        </Link>
        {confirmDelete ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-ink-2">Remove this listing?</span>
            <button
              type="button"
              className="rounded-md bg-red px-3 py-1.5 font-medium text-white active:scale-[0.98]"
              onClick={async () => {
                const res = await fetch(`/api/listings/${slug}`, { method: "DELETE", headers: { "x-owner-key": key } });
                if (res.ok) router.push("/");
              }}
            >
              Remove
            </button>
            <button type="button" className="text-muted hover:text-ink" onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" className="text-sm text-red hover:underline" onClick={() => setConfirmDelete(true)}>
            Remove listing
          </button>
        )}
      </div>
    </div>
  );
}
