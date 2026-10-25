"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDuration, formatRemaining, formatStart, useNow } from "@/lib/client";
import { MAX_NUMBER, imageUrl, type ListingSummary } from "@/lib/types";
import { hueFor, hueVars } from "@/lib/colors";
import { Reveal } from "./reveal";
import { ArrowBadge, ArrowIcon, Eyebrow, ImageFallback, Shell, StatusBadge, buttonClass } from "./ui";

type Data = { live: ListingSummary[]; upcoming: ListingSummary[] };

const PREVIEW_COUNT = 3;

/**
 * "page" is the full /live page: every open draw plus the schedule.
 * "preview" is the landing-page teaser: the few closing soonest and a link to the rest.
 */
export function LiveListings({ variant = "page" }: { variant?: "page" | "preview" }) {
  const preview = variant === "preview";
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
  const shown = preview ? allLive.slice(0, PREVIEW_COUNT) : allLive;
  const Heading = preview ? "h2" : "h1";

  return (
    <div className="flex flex-col gap-20 md:gap-32">
      <section id="live" aria-labelledby="live-heading" className="scroll-mt-28">
        <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-5 md:mb-12">
          <div className="flex flex-col items-start gap-4 md:gap-5">
            <Eyebrow tone="mint">
              <span className="breathe size-1.5 rounded-full bg-current" aria-hidden />
              {data ? `${allLive.length} open` : "Open now"}
            </Eyebrow>
            <Heading
              id="live-heading"
              className={`font-serif font-light leading-[1] tracking-[-0.045em] text-ink ${
                preview ? "text-[clamp(2.5rem,5vw,4.5rem)]" : "text-[clamp(3rem,8vw,6.5rem)]"
              }`}
            >
              {preview ? "Live now" : "Live draws"}
            </Heading>
          </div>
          {preview ? (
            <Link href="/live" className={`${buttonClass} max-sm:w-full max-sm:justify-between`}>
              See all live draws
              <ArrowBadge />
            </Link>
          ) : (
            <p className="max-w-xs text-ink-2">Tap a draw to see the board and claim a number before the clock runs out.</p>
          )}
        </Reveal>

        {!data && !failed && <SkeletonGrid />}
        {failed && !data && (
          <Shell innerClassName="p-10">
            <p className="text-ink-2">Live draws could not be loaded. Check the database connection and refresh.</p>
          </Shell>
        )}
        {data && allLive.length === 0 && (
          <Shell innerClassName="flex flex-col items-start gap-3 p-10 sm:p-14">
            <p className="font-serif text-3xl font-light tracking-[-0.03em] text-ink">Nothing is running right now.</p>
            <p className="text-ink-2">New draws appear here the moment they go live.</p>
            <Link href="/#list" className={`${buttonClass} mt-3`}>
              List a product
              <ArrowBadge />
            </Link>
          </Shell>
        )}
        {shown.length > 0 && (
          // Asymmetrical bento: the draw closing soonest gets the big tile.
          <ul className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-12">
            {shown.map((l, i) => (
              <Reveal
                as="li"
                key={l.slug}
                index={i}
                className={i === 0 ? "md:col-span-7 md:row-span-2" : i < 3 ? "md:col-span-5" : "md:col-span-4"}
              >
                <LiveCard listing={l} now={now} featured={i === 0} />
              </Reveal>
            ))}
          </ul>
        )}
      </section>

      {!preview && upcoming.length > 0 && (
        <section aria-labelledby="upcoming-heading">
          <Reveal className="mb-10 flex flex-col items-start gap-5">
            <Eyebrow tone="marigold">Scheduled</Eyebrow>
            <h2
              id="upcoming-heading"
              className="font-serif text-[clamp(2rem,4vw,3.25rem)] font-light leading-[1] tracking-[-0.04em] text-ink"
            >
              Starting soon
            </h2>
          </Reveal>
          <Reveal>
            <Shell innerClassName="p-2">
              <ul className="flex flex-col">
                {upcoming.map((l) => (
                  <li key={l.slug}>
                    <Link
                      href={`/l/${l.slug}`}
                      className="group flex items-center gap-4 rounded-[1.25rem] p-3 transition-colors duration-500 ease-spring hover:bg-paper sm:gap-6"
                    >
                      <Thumb listing={l} className="relative size-14 shrink-0 rounded-2xl" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-ink">{l.name}</span>
                        <span className="block truncate text-sm text-muted">
                          {l.ownerName ? `by ${l.ownerName} · ` : ""}
                          {formatDuration(l.durationMinutes)}
                        </span>
                      </span>
                      <span className="text-right text-sm tabular-nums text-ink-2">
                        {now === null ? formatStart(l.startsAt) : `in ${formatRemaining(Date.parse(l.startsAt) - now)}`}
                      </span>
                      <span className="hidden size-9 items-center justify-center rounded-full bg-black/[0.04] transition-transform duration-500 ease-spring group-hover:-translate-y-px group-hover:translate-x-0.5 sm:flex">
                        <ArrowIcon />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Shell>
          </Reveal>
        </section>
      )}
    </div>
  );
}

function LiveCard({ listing: l, now, featured }: { listing: ListingSummary; now: number | null; featured: boolean }) {
  const remaining = now === null ? null : Date.parse(l.endsAt) - now;
  const urgent = remaining !== null && remaining < 60_000;
  return (
    <Link
      href={`/l/${l.slug}`}
      style={hueVars(hueFor(l.slug))}
      className="group block h-full transition-transform duration-700 ease-spring active:scale-[0.99]"
    >
      <Shell innerClassName="flex h-full flex-col overflow-hidden">
        <div
          className={`relative m-2 mb-0 overflow-hidden rounded-[1.4rem] ${
            featured ? "aspect-[4/3] md:aspect-auto md:min-h-[26rem] md:flex-1" : "aspect-[16/10]"
          }`}
        >
          <Thumb listing={l} className="absolute inset-0 transition-transform duration-[1200ms] ease-spring group-hover:scale-[1.04]" />
          <div className="absolute left-4 top-4 inline-flex rounded-full bg-[#fdfbf7]/90 p-0.5">
            <StatusBadge status="live" />
          </div>
        </div>
        <div className="flex flex-col gap-5 p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className={`line-clamp-2 font-medium leading-snug text-ink ${featured ? "text-xl" : "text-[17px]"}`}>
                {l.name}
              </h3>
              {l.ownerName && <p className="mt-1 text-sm text-muted">by {l.ownerName}</p>}
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-ink transition-all duration-500 ease-spring group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:bg-(--accent) group-hover:text-(--accent-on)">
              <ArrowIcon />
            </span>
          </div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-muted">Closes in</p>
              <p
                className={`font-serif font-light leading-none tabular-nums tracking-[-0.03em] ${featured ? "text-6xl" : "text-4xl"} ${
                  urgent ? "text-tomato-ink" : "text-(--accent-ink)"
                }`}
              >
                {remaining === null ? "--:--" : formatRemaining(remaining)}
              </p>
            </div>
            <p className="text-right text-sm tabular-nums text-ink-2">
              {l.pickCount}
              <span className="text-muted"> / {MAX_NUMBER} taken</span>
            </p>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-(--accent-wash)" aria-hidden>
            <div
              className="h-full origin-left rounded-full bg-(--accent) transition-transform duration-700 ease-spring"
              style={{ transform: `scaleX(${l.pickCount / MAX_NUMBER})` }}
            />
          </div>
        </div>
      </Shell>
    </Link>
  );
}

function Thumb({ listing, className }: { listing: ListingSummary; className: string }) {
  if (!listing.hasImage) return <ImageFallback name={listing.name} colorKey={listing.slug} className={className} />;
  return (
    <div className={`overflow-hidden bg-paper ${className}`}>
      <Image
        src={imageUrl(listing)}
        alt=""
        fill
        sizes="(min-width: 1024px) 640px, (min-width: 768px) 50vw, 100vw"
        className="object-cover"
        unoptimized
      />
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-12" aria-hidden>
      {["md:col-span-7", "md:col-span-5"].map((c) => (
        <div key={c} className={`${c} rounded-[2rem] bg-black/[0.035] p-1.5`}>
          <div className="h-96 animate-pulse rounded-[calc(2rem-0.375rem)] bg-surface/70" />
        </div>
      ))}
    </div>
  );
}
