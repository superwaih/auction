"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { forgetListing, getOwnerKey, saveOwnerKey, toLocalInput } from "@/lib/client";
import { imageUrl, type PublicListing } from "@/lib/types";
import { ListingForm } from "./listing-form";
import { Reveal } from "./reveal";
import { SharePanel } from "./share-panel";
import { ArrowBadge, Eyebrow, Shell, buttonClass } from "./ui";

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
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    // The owner link carries its key in the hash so it never reaches server logs.
    const fromHash = new URLSearchParams(window.location.hash.slice(1)).get("key");
    if (fromHash) {
      saveOwnerKey(slug, fromHash);
      history.replaceState(null, "", window.location.pathname);
    }
    const key = fromHash ?? getOwnerKey(slug);

    (async () => {
      setOrigin(window.location.origin);
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

  if (state.kind === "loading") {
    return <div className="mx-auto h-[32rem] max-w-3xl animate-pulse rounded-[2rem] bg-black/[0.04]" aria-busy />;
  }

  if (state.kind === "denied" || state.kind === "locked") {
    const locked = state.kind === "locked";
    return (
      <Reveal className="flex max-w-2xl flex-col items-start gap-6 py-16 md:py-32">
        <Eyebrow>{locked ? "Locked" : "Owner access"}</Eyebrow>
        <h1 className="font-serif text-[clamp(2.75rem,6vw,5rem)] font-light leading-[1] tracking-[-0.045em] text-ink">
          {locked ? "This listing is locked." : "Owner access needed."}
        </h1>
        <p className="text-lg text-ink-2">
          {locked
            ? `${state.listing.name} has started, so its details can no longer be changed. Everyone sees exactly what was published.`
            : state.message}
        </p>
        <Link href={`/l/${slug}`} className={`${buttonClass} mt-4`}>
          {locked ? "Watch the draw" : "View the draw"}
          <ArrowBadge />
        </Link>
      </Reveal>
    );
  }

  const { listing, key } = state;
  return (
    <div className="grid grid-cols-1 gap-10 pb-8 md:grid-cols-12 md:gap-10 md:pt-8">
      <div className="flex flex-col gap-8 md:sticky md:top-28 md:col-span-5 md:self-start">
        <Reveal className="flex flex-col items-start gap-5">
          <Eyebrow tone="marigold">Scheduled</Eyebrow>
          <h1 className="font-serif text-[clamp(2.75rem,5vw,4.5rem)] font-light leading-[1] tracking-[-0.045em] text-ink">
            Edit listing
          </h1>
          <p className="text-lg text-ink-2">You can change anything until the countdown starts.</p>
        </Reveal>
        {origin && (
          <Reveal index={1}>
            <Shell innerClassName="p-6 sm:p-7">
              <SharePanel url={`${origin}/l/${slug}`} title={listing.name} compact />
            </Shell>
          </Reveal>
        )}
      </div>

      <div className="flex flex-col gap-6 md:col-span-7">
        <Reveal index={1}>
          <Shell innerClassName="p-6 sm:p-9">
            <ListingForm
              initial={{
                name: listing.name,
                ownerName: listing.ownerName,
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
              <p role="status" className="pop mt-5 rounded-2xl bg-sage-wash px-4 py-3 text-sm text-sage-deep">
                Changes saved.
              </p>
            )}
          </Shell>
        </Reveal>

        <div className="flex flex-wrap items-center justify-between gap-4 px-2">
          <Link href={`/l/${slug}`} className="text-sm text-ink underline underline-offset-4">
            View public page
          </Link>
          {confirmDelete ? (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-ink-2">Remove this listing?</span>
              <button
                type="button"
                className="rounded-full bg-rose px-4 py-2 font-medium text-white transition-transform duration-500 ease-spring active:scale-[0.97]"
                onClick={async () => {
                  const res = await fetch(`/api/listings/${slug}`, { method: "DELETE", headers: { "x-owner-key": key } });
                  if (res.ok) {
                    forgetListing(slug);
                    router.push("/me");
                  }
                }}
              >
                Remove
              </button>
              <button type="button" className="text-muted hover:text-ink" onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" className="text-sm text-rose hover:underline" onClick={() => setConfirmDelete(true)}>
              Remove listing
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
