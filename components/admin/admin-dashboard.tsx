"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { adminFetch, formatRemaining, formatStart, useAdminName, useNow } from "@/lib/client";
import { hueForNumber } from "@/lib/colors";
import { imageUrl, winnersLabel, type ClosedListing, type ListingStatus } from "@/lib/types";
import { Reveal } from "../reveal";
import { ArrowBadge, CategoryTag, Eyebrow, ImageFallback, Shell, StatusBadge, buttonClass, ghostButtonClass } from "../ui";

type Scope = "mine" | "all";

export function AdminDashboard() {
  const admin = useAdminName();
  const [scope, setScope] = useState<Scope>("mine");
  const [data, setData] = useState<{ scope: Scope; listings: ClosedListing[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const now = useNow(0, 1000);

  useEffect(() => {
    const load = () =>
      adminFetch(`/api/admin/listings?scope=${scope}`)
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then(
          (listings: ClosedListing[]) => {
            setData({ scope, listings });
            setFailed(false);
          },
          () => setFailed(true),
        );
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [scope, admin]);

  const listings = data?.scope === scope ? data.listings : null;
  const statusOf = (l: ClosedListing): ListingStatus =>
    now === null ? l.status : now < Date.parse(l.startsAt) ? "scheduled" : now < Date.parse(l.endsAt) ? "live" : "ended";
  const counts = { live: 0, scheduled: 0, ended: 0 };
  for (const l of listings ?? []) counts[statusOf(l)]++;

  return (
    <div className="flex flex-col gap-8">
      <Reveal className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col items-start gap-3">
          <Eyebrow tone="cobalt">Dashboard</Eyebrow>
          <h1 className="font-serif text-[clamp(2.5rem,7vw,4.5rem)] font-light leading-[1] tracking-[-0.045em] text-ink">
            {scope === "mine" ? "Your listings" : "All listings"}
          </h1>
          {listings && (
            <div className="flex flex-wrap gap-2">
              <Eyebrow tone="mint">{counts.live} live</Eyebrow>
              <Eyebrow tone="marigold">{counts.scheduled} scheduled</Eyebrow>
              <Eyebrow>{counts.ended} closed</Eyebrow>
            </div>
          )}
        </div>
        <div className="relative grid grid-cols-2 rounded-full bg-black/[0.045] p-1 ring-1 ring-black/[0.04] sm:w-64">
          <span
            aria-hidden
            className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-surface shadow-[0_1px_2px_rgba(42,33,28,0.08)] transition-transform duration-500 ease-spring ${
              scope === "all" ? "translate-x-full" : ""
            }`}
          />
          {(["mine", "all"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={scope === s}
              onClick={() => setScope(s)}
              className={`relative min-h-10 rounded-full text-sm font-medium ${scope === s ? "text-ink" : "text-ink-2 hover:text-ink"}`}
            >
              {s === "mine" ? "Mine" : "Everyone's"}
            </button>
          ))}
        </div>
      </Reveal>

      {failed && !listings && (
        <Shell innerClassName="p-8">
          <p className="text-ink-2">Listings could not be loaded. Check the database connection and refresh.</p>
        </Shell>
      )}
      {!listings && !failed && <div className="h-64 animate-pulse rounded-[2rem] bg-black/[0.04]" aria-busy />}
      {listings && listings.length === 0 && (
        <Shell innerClassName="flex flex-col items-start gap-4 p-8 sm:p-12">
          <p className="font-serif text-3xl font-light tracking-[-0.03em] text-ink">
            {scope === "mine" ? "You haven't listed anything yet." : "No listings yet."}
          </p>
          <p className="text-ink-2">Create a draw, then share its link or QR code so people can pick numbers.</p>
          <Link href="/admin/new" className={`${buttonClass} mt-2`}>
            New listing
            <ArrowBadge />
          </Link>
        </Shell>
      )}
      {listings && listings.length > 0 && (
        <ul className="flex flex-col gap-4">
          {listings.map((l, i) => (
            <Reveal as="li" key={l.slug} index={Math.min(i, 4)}>
              <Row listing={l} status={statusOf(l)} now={now} showCreator={scope === "all"} />
            </Reveal>
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({
  listing: l,
  status,
  now,
  showCreator,
}: {
  listing: ClosedListing;
  status: ListingStatus;
  now: number | null;
  showCreator: boolean;
}) {
  return (
    <Shell innerClassName="flex flex-col gap-4 p-2 sm:flex-row sm:items-stretch">
      <Link
        href={`/admin/listings/${l.slug}`}
        className="relative aspect-[16/9] shrink-0 overflow-hidden rounded-[1.4rem] sm:aspect-auto sm:w-44"
        aria-label={`Edit ${l.name}`}
      >
        {l.hasImage ? (
          <Image src={imageUrl(l)} alt="" fill sizes="(min-width: 640px) 176px, 100vw" className="object-cover" unoptimized />
        ) : (
          <ImageFallback name={l.name} colorKey={l.slug} className="absolute inset-0 [&>span]:text-6xl" />
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-4 px-3 pb-3 sm:py-3 sm:pl-2 sm:pr-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-1.5">
              <StatusBadge status={status} />
              <CategoryTag category={l.category} />
            </div>
            <h2 className="line-clamp-2 text-lg font-medium leading-snug text-ink">{l.name}</h2>
            <p className="mt-1 text-sm text-ink-2">
              1–{l.slots} · {winnersLabel(l.winnerCount)} · by {l.ownerName || "—"}
              {showCreator && l.createdBy ? ` · listed by ${l.createdBy}` : ""}
            </p>
          </div>
          <Detail listing={l} status={status} now={now} />
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2">
          <Link href={`/admin/listings/${l.slug}`} className={`${buttonClass} py-1 pl-4 pr-1 text-sm`}>
            Edit &amp; share
            <ArrowBadge />
          </Link>
          <Link href={`/l/${l.slug}`} className={`${ghostButtonClass} min-h-11`} target="_blank">
            Open draw
          </Link>
        </div>
      </div>
    </Shell>
  );
}

function Detail({ listing: l, status, now }: { listing: ClosedListing; status: ListingStatus; now: number | null }) {
  if (status === "live") {
    return (
      <div className="text-right">
        <p className="font-serif text-3xl font-light leading-none tabular-nums tracking-[-0.03em] text-ink">
          {now === null ? "--:--" : formatRemaining(Date.parse(l.endsAt) - now)}
        </p>
        <p className="mt-1 text-sm text-ink-2">
          {l.pickCount}/{l.slots} taken
        </p>
      </div>
    );
  }
  if (status === "scheduled") {
    return (
      <div className="text-right text-sm text-ink-2">
        <p className="font-medium text-ink">
          {now === null ? formatStart(l.startsAt) : `Opens in ${formatRemaining(Date.parse(l.startsAt) - now)}`}
        </p>
        <p>{formatStart(l.startsAt)}</p>
      </div>
    );
  }
  if (l.winners.length === 0) {
    return <p className="text-sm text-ink-2">{l.status === "ended" ? "No winner, nobody picked" : "Drawing…"}</p>;
  }
  return (
    <ul className="flex flex-wrap justify-end gap-1.5" aria-label="Winners">
      {l.winners.slice(0, 6).map((w) => {
        const hue = hueForNumber(w.number);
        return (
          <li key={w.number} className="flex items-center gap-2 rounded-full bg-paper py-1 pl-1 pr-3 text-sm">
            <span
              className="flex size-7 items-center justify-center rounded-full font-semibold tabular-nums"
              style={{ background: hue.solid, color: hue.on }}
            >
              {w.number}
            </span>
            <span className="max-w-28 truncate font-medium text-ink">{w.name}</span>
          </li>
        );
      })}
      {l.winners.length > 6 && <li className="self-center text-sm text-ink-2">+{l.winners.length - 6} more</li>}
    </ul>
  );
}
