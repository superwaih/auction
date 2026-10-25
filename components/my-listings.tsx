"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import {
  forgetListing,
  formatRemaining,
  formatStart,
  renameProfile,
  useMounted,
  useNow,
  useProfile,
  type SavedListing,
} from "@/lib/client";
import { hueFor, hueForNumber } from "@/lib/colors";
import { MAX_NUMBER, imageUrl, type ClosedListing, type ListingStatus } from "@/lib/types";
import { ListProductLink } from "./list-product-link";
import { Reveal } from "./reveal";
import { ArrowBadge, Eyebrow, ImageFallback, Shell, StatusBadge, buttonClass, ghostButtonClass, inputClass } from "./ui";

export function MyListings() {
  const mounted = useMounted();
  const profile = useProfile();
  const [data, setData] = useState<ClosedListing[] | null>(null);
  const now = useNow(0, 1000);
  const slugKey = profile.listings.map((l) => l.slug).join(",");

  useEffect(() => {
    if (!slugKey) return;
    const load = () =>
      fetch(`/api/listings/lookup?slugs=${slugKey}`, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((next: ClosedListing[]) => setData(next), () => {});
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [slugKey]);

  if (!mounted) return <div className="h-[28rem] animate-pulse rounded-[2rem] bg-black/[0.05]" aria-busy />;

  const bySlug = new Map((data ?? []).map((l) => [l.slug, l]));
  const statusOf = (l: ClosedListing): ListingStatus =>
    now === null ? l.status : now < Date.parse(l.startsAt) ? "scheduled" : now < Date.parse(l.endsAt) ? "live" : "ended";
  const counts = { live: 0, scheduled: 0, ended: 0 };
  for (const l of data ?? []) counts[statusOf(l)]++;

  return (
    <div className="flex flex-col gap-10 pb-8 md:gap-14">
      <ProfileHeader name={profile.name} total={profile.listings.length} counts={data ? counts : null} />

      {profile.listings.length === 0 ? (
        <Reveal>
          <Shell innerClassName="flex flex-col items-start gap-4 p-8 sm:p-12">
            <p className="font-serif text-3xl font-light tracking-[-0.03em] text-ink">Nothing listed on this device yet.</p>
            <p className="text-ink-2">Products you list from this browser show up here, with their countdowns and winners.</p>
            <ListProductLink className={`${buttonClass} mt-2`}>
              List a product
              <ArrowBadge />
            </ListProductLink>
          </Shell>
        </Reveal>
      ) : (
        <ul className="flex flex-col gap-4">
          {profile.listings.map((saved, i) => (
            <Reveal as="li" key={saved.slug} index={Math.min(i, 4)}>
              <MyListingRow
                saved={saved}
                listing={bySlug.get(saved.slug)}
                loaded={data !== null}
                status={bySlug.has(saved.slug) ? statusOf(bySlug.get(saved.slug)!) : null}
                now={now}
              />
            </Reveal>
          ))}
        </ul>
      )}

      <p className="text-sm text-ink-2">
        Your profile is saved in this browser only. Clearing site data or switching devices starts a fresh one.
      </p>
    </div>
  );
}

function ProfileHeader({
  name,
  total,
  counts,
}: {
  name: string;
  total: number;
  counts: Record<ListingStatus, number> | null;
}) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const hue = hueFor(name || "seller");

  return (
    <Reveal className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-center gap-5">
        <span
          className="flex size-16 shrink-0 items-center justify-center rounded-[1.25rem] font-serif text-3xl sm:size-20 sm:text-4xl"
          style={{ background: hue.solid, color: hue.on }}
          aria-hidden
        >
          {(name.trim().charAt(0) || "?").toUpperCase()}
        </span>
        <div className="flex min-w-0 flex-col items-start gap-2">
          <Eyebrow tone="cobalt">{name ? `Hi, ${name}` : "Your profile"}</Eyebrow>
          <h1 className="font-serif text-[clamp(2.5rem,8vw,4.5rem)] font-light leading-[1] tracking-[-0.045em] text-ink">
            My listings
          </h1>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:items-end">
        {counts && total > 0 && (
          <div className="flex flex-wrap gap-2">
            <Eyebrow tone="mint">{counts.live} live</Eyebrow>
            <Eyebrow tone="marigold">{counts.scheduled} scheduled</Eyebrow>
            <Eyebrow tone="plain">{counts.ended} closed</Eyebrow>
          </div>
        )}
        {editing ? (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              renameProfile(draft);
              setEditing(false);
            }}
          >
            <label htmlFor={id} className="sr-only">
              Your name
            </label>
            <input id={id} className={`${inputClass} py-2`} value={draft} maxLength={60} onChange={(e) => setDraft(e.target.value)} autoFocus />
            <button type="submit" className={ghostButtonClass}>
              Save
            </button>
          </form>
        ) : (
          <button
            type="button"
            className="self-start text-sm font-medium text-cobalt-ink underline underline-offset-4 sm:self-end"
            onClick={() => {
              setDraft(name);
              setEditing(true);
            }}
          >
            {name ? "Change name" : "Add your name"}
          </button>
        )}
      </div>
    </Reveal>
  );
}

function MyListingRow({
  saved,
  listing,
  loaded,
  status,
  now,
}: {
  saved: SavedListing;
  listing: ClosedListing | undefined;
  loaded: boolean;
  status: ListingStatus | null;
  now: number | null;
}) {
  const [confirm, setConfirm] = useState(false);

  // The draw was removed (or the database was reset): offer to tidy it away.
  if (loaded && !listing) {
    return (
      <Shell innerClassName="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{saved.name}</p>
          <p className="text-sm text-ink-2">This draw no longer exists.</p>
        </div>
        <button type="button" className={ghostButtonClass} onClick={() => forgetListing(saved.slug)}>
          Remove from list
        </button>
      </Shell>
    );
  }

  return (
    <Shell innerClassName="flex flex-col gap-4 p-2 sm:flex-row sm:items-stretch">
      <Link
        href={`/l/${saved.slug}`}
        className="relative aspect-[16/9] shrink-0 overflow-hidden rounded-[1.4rem] sm:aspect-auto sm:w-44"
        aria-label={`Open ${saved.name}`}
      >
        {listing?.hasImage ? (
          <Image src={imageUrl(listing)} alt="" fill sizes="(min-width: 640px) 176px, 100vw" className="object-cover" unoptimized />
        ) : (
          <ImageFallback name={saved.name} colorKey={saved.slug} className="absolute inset-0 [&>span]:text-6xl" />
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-4 px-3 pb-3 sm:py-3 sm:pl-2 sm:pr-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2">{status ? <StatusBadge status={status} /> : <Eyebrow>Loading</Eyebrow>}</div>
            <h2 className="line-clamp-2 text-lg font-medium leading-snug text-ink">{listing?.name ?? saved.name}</h2>
          </div>
          {listing && <Detail listing={listing} status={status} now={now} />}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2">
          <Link href={`/l/${saved.slug}`} className={`${buttonClass} py-1 pl-4 pr-1 text-sm`}>
            {status === "ended" ? "See results" : "Open & share"}
            <ArrowBadge />
          </Link>
          {status === "scheduled" && (
            <Link href={`/l/${saved.slug}/manage`} className={`${ghostButtonClass} min-h-11`}>
              Edit
            </Link>
          )}
          {confirm ? (
            <span className="flex items-center gap-3 text-sm">
              <button type="button" className="font-medium text-tomato-ink" onClick={() => forgetListing(saved.slug)}>
                Hide it
              </button>
              <button type="button" className="text-ink-2" onClick={() => setConfirm(false)}>
                Cancel
              </button>
            </span>
          ) : (
            <button type="button" className="ml-auto text-sm text-ink-2 hover:text-ink" onClick={() => setConfirm(true)}>
              Hide from this list
            </button>
          )}
        </div>
      </div>
    </Shell>
  );
}

function Detail({ listing, status, now }: { listing: ClosedListing; status: ListingStatus | null; now: number | null }) {
  if (status === "live") {
    return (
      <div className="text-right">
        <p className="font-serif text-3xl font-light leading-none tabular-nums tracking-[-0.03em] text-ink">
          {now === null ? "--:--" : formatRemaining(Date.parse(listing.endsAt) - now)}
        </p>
        <p className="mt-1 text-sm text-ink-2">
          {listing.pickCount}/{MAX_NUMBER} taken
        </p>
      </div>
    );
  }
  if (status === "scheduled") {
    return (
      <div className="text-right text-sm text-ink-2">
        <p className="font-medium text-ink">
          {now === null ? formatStart(listing.startsAt) : `Opens in ${formatRemaining(Date.parse(listing.startsAt) - now)}`}
        </p>
        <p>{formatStart(listing.startsAt)}</p>
      </div>
    );
  }
  if (listing.winningNumber === null) {
    return (
      <p className="text-sm text-ink-2">
        {listing.pickCount === 0 && now !== null && now - Date.parse(listing.endsAt) > 5000
          ? "No winner, nobody picked"
          : "Drawing…"}
      </p>
    );
  }
  const hue = hueForNumber(listing.winningNumber);
  return (
    <div className="flex items-center gap-3">
      <span
        className="flex size-11 items-center justify-center rounded-xl font-serif text-xl tabular-nums"
        style={{ background: hue.solid, color: hue.on }}
      >
        {listing.winningNumber}
      </span>
      <div className="text-sm">
        <p className="text-ink-2">Winner</p>
        <p className="max-w-40 truncate font-medium text-ink">{listing.winnerName}</p>
      </div>
    </div>
  );
}
