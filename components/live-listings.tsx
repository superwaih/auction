"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDuration, formatRemaining, formatStart, useNow } from "@/lib/client";
import { MAX_NUMBER, imageUrl, type ListingSummary } from "@/lib/types";
import { ImageFallback, StatusBadge } from "./ui";

type Data = { live: ListingSummary[]; upcoming: ListingSummary[] };

export function LiveListings() {
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const now = useNow(0, 1000);

  useEffect(() => {
    const load = () =>
      fetch("/api/listings", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then(
          (next: Data) => {
            setData(next);
            setFailed(false);
          },
          () => setFailed(true),
        );
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  // Drop finished draws and promote scheduled ones without waiting for the next poll.
  const live = (data?.live ?? []).filter((l) => now === null || Date.parse(l.endsAt) > now);
  const promoted = (data?.upcoming ?? []).filter((l) => now !== null && Date.parse(l.startsAt) <= now);
  const upcoming = (data?.upcoming ?? []).filter((l) => !promoted.includes(l));
  const allLive = [...live, ...promoted.map((l) => ({ ...l, status: "live" as const }))];

  return (
    <div className="flex flex-col gap-24">
      <section id="live" aria-labelledby="live-heading" className="scroll-mt-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 id="live-heading" className="font-serif text-4xl leading-[1.1] tracking-[-0.03em] text-ink sm:text-5xl">
            Live now
          </h2>
          {data && (
            <p className="text-sm text-muted tabular-nums">
              {allLive.length} {allLive.length === 1 ? "draw" : "draws"} open
            </p>
          )}
        </div>

        {!data && !failed && <SkeletonGrid />}
        {failed && !data && (
          <p className="rounded-lg border border-line bg-surface p-8 text-ink-2">
            Live draws could not be loaded. Check the database connection and refresh.
          </p>
        )}
        {data && allLive.length === 0 && (
          <div className="rounded-xl border border-line bg-surface p-10">
            <p className="font-serif text-2xl tracking-[-0.02em] text-ink">Nothing is running right now.</p>
            <p className="mt-2 text-ink-2">List a product above and it will appear here the moment it goes live.</p>
          </div>
        )}
        {allLive.length > 0 && (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {allLive.map((l, i) => (
              <li key={l.slug} className="reveal" style={{ "--index": i } as React.CSSProperties}>
                <LiveCard listing={l} now={now} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {upcoming.length > 0 && (
        <section aria-labelledby="upcoming-heading">
          <h2 id="upcoming-heading" className="mb-6 font-serif text-3xl leading-[1.1] tracking-[-0.03em] text-ink">
            Starting soon
          </h2>
          <ul className="flex flex-col">
            {upcoming.map((l) => (
              <li key={l.slug} className="border-b border-line first:border-t">
                <Link
                  href={`/l/${l.slug}`}
                  className="flex items-center gap-4 py-4 transition hover:bg-surface/60 sm:gap-6 sm:px-2"
                >
                  <Thumb listing={l} className="size-12 shrink-0 rounded-md" />
                  <span className="min-w-0 flex-1 truncate font-medium text-ink">{l.name}</span>
                  <span className="hidden text-sm text-muted sm:inline">{formatDuration(l.durationMinutes)}</span>
                  <span className="text-right text-sm tabular-nums text-ink-2">
                    {now === null ? formatStart(l.startsAt) : `in ${formatRemaining(Date.parse(l.startsAt) - now)}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function LiveCard({ listing: l, now }: { listing: ListingSummary; now: number | null }) {
  const remaining = now === null ? null : Date.parse(l.endsAt) - now;
  const urgent = remaining !== null && remaining < 60_000;
  return (
    <Link
      href={`/l/${l.slug}`}
      className="lift group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface"
    >
      <div className="relative aspect-[4/3] overflow-hidden border-b border-line">
        <Thumb listing={l} className="size-full transition duration-700 group-hover:scale-[1.02]" />
        <div className="absolute left-3 top-3">
          <StatusBadge status="live" />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <h3 className="line-clamp-2 text-[17px] font-medium leading-snug text-ink">{l.name}</h3>
        <div className="mt-auto flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-muted">Closes in</p>
            <p className={`font-serif text-3xl leading-none tabular-nums tracking-[-0.02em] ${urgent ? "text-red" : "text-ink"}`}>
              {remaining === null ? "--:--" : formatRemaining(remaining)}
            </p>
          </div>
          <p className="text-right text-sm tabular-nums text-ink-2">
            {l.pickCount}
            <span className="text-muted"> / {MAX_NUMBER} taken</span>
          </p>
        </div>
        <FillBar taken={l.pickCount} />
      </div>
    </Link>
  );
}

function FillBar({ taken }: { taken: number }) {
  return (
    <div className="h-1 overflow-hidden rounded-full bg-[#efeee9]" aria-hidden>
      <div className="h-full rounded-full bg-ink transition-[width] duration-500" style={{ width: `${(taken / MAX_NUMBER) * 100}%` }} />
    </div>
  );
}

function Thumb({ listing, className }: { listing: ListingSummary; className: string }) {
  if (!listing.hasImage) return <ImageFallback name={listing.name} className={className} />;
  return (
    <div className={`relative overflow-hidden bg-surface-2 ${className}`}>
      <Image src={imageUrl(listing)} alt="" fill sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw" className="object-cover" unoptimized />
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-line bg-surface">
          <div className="aspect-[4/3] animate-pulse bg-surface-2" />
          <div className="flex flex-col gap-3 p-5">
            <div className="h-4 w-2/3 animate-pulse rounded bg-surface-2" />
            <div className="h-8 w-1/3 animate-pulse rounded bg-surface-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
