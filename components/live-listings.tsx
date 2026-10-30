"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDuration, formatRemaining, formatStart, useNow } from "@/lib/client";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  imageUrl,
  winnersLabel,
  type Category,
  type ClosedListing,
  type ListingSummary,
} from "@/lib/types";
import { hueFor, hueForNumber, hueVars } from "@/lib/colors";
import { Reveal } from "./reveal";
import { ArrowBadge, ArrowIcon, CategoryTag, Eyebrow, ImageFallback, Shell, StatusBadge, buttonClass } from "./ui";

type Data = { live: ListingSummary[]; upcoming: ListingSummary[]; closed: ClosedListing[] };

// Two full rows on desktop (3 across), three on tablets (2 across).
const PREVIEW_COUNT = 6;

/**
 * "page" is the full /live page: every open draw, the schedule, and recently closed draws with winners.
 * "preview" shows a few open draws and recent results, with links to the full lists.
 */
export function LiveListings({ variant = "page" }: { variant?: "page" | "preview" }) {
  const preview = variant === "preview";
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<Category | "all">("all");
  const now = useNow(0, 1000);
  const keep = (l: ListingSummary) => filter === "all" || l.category === filter;

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
  const live = (data?.live ?? []).filter((l) => keep(l) && (now === null || Date.parse(l.endsAt) > now));
  const promoted = (data?.upcoming ?? []).filter((l) => keep(l) && now !== null && Date.parse(l.startsAt) <= now);
  const upcoming = (data?.upcoming ?? []).filter((l) => keep(l) && !promoted.includes(l));
  const allLive = [...live, ...promoted.map((l) => ({ ...l, status: "live" as const }))];
  // Draws whose clock just hit zero move to Closed straight away; the next poll brings the winner.
  const justClosed = (data?.live ?? [])
    .filter((l) => keep(l) && now !== null && Date.parse(l.endsAt) <= now && !data?.closed.some((c) => c.slug === l.slug))
    .map((l) => ({ ...l, status: "ended" as const, winners: [], createdBy: "", pending: true }));
  const closed = [...justClosed, ...(data?.closed ?? []).filter(keep)];
  const shownClosed = preview ? closed.slice(0, PREVIEW_COUNT) : closed;
  // Live draws first, then scheduled ones (marked Scheduled, board locked until their start).
  const open = [...allLive, ...upcoming];
  const shown = preview ? open.slice(0, PREVIEW_COUNT) : open;
  const shownScheduled = shown.some((l) => l.status === "scheduled");
  const Heading = preview ? "h2" : "h1";

  return (
    <div className="flex flex-col gap-20 md:gap-32">
      <section id="live" aria-labelledby="live-heading" className="scroll-mt-28">
        <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-5 md:mb-12">
          <div className="flex flex-col items-start gap-4 md:gap-5">
            <Eyebrow tone="mint">
              <span className="breathe size-1.5 rounded-full bg-current" aria-hidden />
              {data ? `${allLive.length} open${upcoming.length ? ` · ${upcoming.length} scheduled` : ""}` : "Open now"}
            </Eyebrow>
            <Heading
              id="live-heading"
              className={`font-serif font-light leading-[1] tracking-[-0.045em] text-ink ${
                preview ? "text-[clamp(2.5rem,5vw,4.5rem)]" : "text-[clamp(3rem,8vw,6.5rem)]"
              }`}
            >
              {preview ? (shownScheduled ? (allLive.length ? "Live and upcoming" : "Coming up") : "Live now") : "Live draws"}
            </Heading>
          </div>
          {preview ? (
            <Link href="/live" className={`${buttonClass} max-sm:w-full max-sm:justify-between`}>
              See all live draws
              <ArrowBadge />
            </Link>
          ) : (
            <p className="max-w-xs text-ink-2">
              Tap a draw to see the board. Scheduled draws open for picking when their countdown starts.
            </p>
          )}
        </Reveal>

        {!preview && (
          <div className="mb-8 flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
            {(["all", ...CATEGORIES] as const).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={filter === c}
                onClick={() => setFilter(c)}
                className={`min-h-10 rounded-full px-4 text-sm font-medium transition-all duration-500 ease-spring active:scale-[0.97] ${
                  filter === c ? "bg-espresso text-[#fdfbf7]" : "bg-black/[0.05] text-ink-2 hover:bg-black/[0.08] hover:text-ink"
                }`}
              >
                {c === "all" ? "All" : CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        )}

        {!data && !failed && <SkeletonGrid />}
        {failed && !data && (
          <Shell innerClassName="p-10">
            <p className="text-ink-2">Live draws could not be loaded. Check the database connection and refresh.</p>
          </Shell>
        )}
        {data && shown.length === 0 && (
          <Shell innerClassName="flex flex-col items-start gap-3 p-10 sm:p-14">
            <p className="font-serif text-3xl font-light tracking-[-0.03em] text-ink">
              {filter === "all" ? "Nothing is running right now." : `No ${CATEGORY_LABELS[filter].toLowerCase()} draws running right now.`}
            </p>
            <p className="text-ink-2">New draws appear here as soon as they are scheduled.</p>
          </Shell>
        )}
        {shown.length > 0 && (
          // One size for every card: live and scheduled sit side by side in an even grid.
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {shown.map((l, i) => (
              <Reveal as="li" key={l.slug} index={i % 3}>
                <LiveCard listing={l} now={now} featured={false} />
              </Reveal>
            ))}
          </ul>
        )}
      </section>

      {data && (preview || closed.length > 0) && (
        <section id="closed" aria-labelledby="closed-heading" className="scroll-mt-28">
          <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-5 md:mb-10">
            <div className="flex flex-col items-start gap-4 md:gap-5">
            <Eyebrow>Finished</Eyebrow>
            <h2
              id="closed-heading"
              className="font-serif text-[clamp(2rem,4vw,3.25rem)] font-light leading-[1] tracking-[-0.04em] text-ink"
            >
              Closed draws
            </h2>
            <p className="max-w-md text-ink-2">Past draws and the numbers that took the prize. Open a draw to see its full result.</p>
            </div>
            {preview && closed.length > 0 && (
              <Link href="/live#closed" className={`${buttonClass} max-sm:w-full max-sm:justify-between`}>
                See all closed draws <ArrowBadge />
              </Link>
            )}
          </Reveal>
          {shownClosed.length === 0 ? (
            <p className="bg-paper p-8 text-ink-2">No closed draws yet. Results will appear here when a draw finishes.</p>
          ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {shownClosed.map((l, i) => (
              <Reveal as="li" key={l.slug} index={i % 3}>
                <ClosedCard listing={l} />
              </Reveal>
            ))}
          </ul>
          )}
        </section>
      )}
    </div>
  );
}

/** A finished draw: Closed badge and its winners, or a placeholder while the server draws. */
function ClosedCard({ listing: l }: { listing: ClosedListing & { pending?: boolean } }) {
  const [first, ...rest] = l.winners;
  const firstHue = first ? hueForNumber(first.number) : null;
  return (
    <Link href={`/l/${l.slug}`} className="group block h-full transition-transform duration-700 ease-spring active:scale-[0.99]">
      <Shell innerClassName="flex h-full flex-col overflow-hidden">
        <div className="relative m-2 mb-0 aspect-[16/10] overflow-hidden rounded-[1.4rem]">
          <Thumb listing={l} className="absolute inset-0 saturate-[0.6] transition-all duration-700 ease-spring group-hover:saturate-100" />
          <div className="absolute left-4 top-4 flex gap-1.5">
            <span className="inline-flex rounded-full bg-[#fdfbf7]/90 p-0.5">
              <StatusBadge status="ended" />
            </span>
            <span className="inline-flex rounded-full bg-[#fdfbf7]/90 p-0.5">
              <CategoryTag category={l.category} />
            </span>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-5 p-5 sm:p-6">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-[17px] font-medium leading-snug text-ink">{l.name}</h3>
            {l.ownerName && <p className="mt-1 text-sm text-ink-2">by {l.ownerName}</p>}
          </div>
          <div className="mt-auto flex items-center gap-4 rounded-2xl bg-paper p-3">
            {firstHue ? (
              <span
                className="flex size-12 shrink-0 items-center justify-center rounded-xl font-serif text-2xl tabular-nums"
                style={{ background: firstHue.solid, color: firstHue.on }}
              >
                {first.number}
              </span>
            ) : (
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-black/[0.06] font-serif text-2xl text-ink-2">
                {l.pending ? "…" : "–"}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium text-ink-2">
                {l.pending ? "Closing" : l.winners.length > 1 ? `${l.winners.length} winners` : "Winner"}
              </p>
              <p className="truncate font-medium text-ink">
                {l.pending
                  ? "Drawing now…"
                  : first
                    ? `Won by ${first.name}${rest.length ? ` + ${rest.length} more` : ""}`
                    : "No winner, nobody picked"}
              </p>
            </div>
          </div>
        </div>
      </Shell>
    </Link>
  );
}

/** A live or scheduled draw. Status follows the clock, so a scheduled card turns live at its start time. */
function LiveCard({ listing: l, now, featured }: { listing: ListingSummary; now: number | null; featured: boolean }) {
  const scheduled = now === null ? l.status === "scheduled" : now < Date.parse(l.startsAt);
  const target = Date.parse(scheduled ? l.startsAt : l.endsAt);
  const remaining = now === null ? null : target - now;
  const urgent = !scheduled && remaining !== null && remaining < 60_000;
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
          <div className="absolute left-4 top-4 flex gap-1.5">
            <span className="inline-flex rounded-full bg-[#fdfbf7]/90 p-0.5">
              <StatusBadge status={scheduled ? "scheduled" : "live"} />
            </span>
            <span className="inline-flex rounded-full bg-[#fdfbf7]/90 p-0.5">
              <CategoryTag category={l.category} />
            </span>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-5 p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className={`line-clamp-2 font-medium leading-snug text-ink ${featured ? "text-xl" : "text-[17px]"}`}>
                {l.name}
              </h3>
              <p className="mt-1 text-sm text-ink-2">
                {l.ownerName ? `by ${l.ownerName} · ` : ""}
                {winnersLabel(l.winnerCount)}
              </p>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-ink transition-all duration-500 ease-spring group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:bg-(--accent) group-hover:text-(--accent-on)">
              <ArrowIcon />
            </span>
          </div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-ink-2">{scheduled ? "Opens in" : "Closes in"}</p>
              <p
                className={`font-serif font-light leading-none tabular-nums tracking-[-0.03em] ${featured ? "text-6xl" : "text-4xl"} ${
                  urgent ? "text-tomato-ink" : "text-(--accent-ink)"
                }`}
              >
                {remaining === null ? "--:--" : formatRemaining(remaining)}
              </p>
            </div>
            {scheduled ? (
              <p className="text-right text-sm text-ink-2">
                1–{l.slots}
                <br />
                {formatDuration(l.durationMinutes)} draw
              </p>
            ) : (
              <p className="text-right text-sm tabular-nums text-ink-2">
                {l.pickCount}
                <span className="text-ink-2"> / {l.slots} taken</span>
              </p>
            )}
          </div>
          {scheduled ? (
            <p className="mt-auto rounded-2xl bg-marigold-wash px-4 py-2.5 text-sm font-medium text-marigold-ink">
              Picking opens {formatStart(l.startsAt)}
            </p>
          ) : (
            <div className="mt-auto h-1.5 overflow-hidden rounded-full bg-(--accent-wash)" aria-hidden>
              <div
                className="h-full origin-left rounded-full bg-(--accent) transition-transform duration-700 ease-spring"
                style={{ transform: `scaleX(${l.pickCount / l.slots})` }}
              />
            </div>
          )}
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className={`rounded-[2rem] bg-black/[0.035] p-1.5 ${i === 2 ? "hidden lg:block" : i === 1 ? "hidden sm:block" : ""}`}>
          <div className="h-96 animate-pulse rounded-[calc(2rem-0.375rem)] bg-surface/70" />
        </div>
      ))}
    </div>
  );
}
