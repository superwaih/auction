"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  formatDuration,
  formatRemaining,
  formatStart,
  getClientId,
  getSavedName,
  saveName,
  useMounted,
  useNow,
} from "@/lib/client";
import { hueFor, hueForNumber, hueVars } from "@/lib/colors";
import { MIN_NUMBER, imageUrl, winnersLabel, type ListingStatus, type PublicListing } from "@/lib/types";
import { CopyField } from "./copy-field";
import { Reveal } from "./reveal";
import {
  ArrowBadge,
  CategoryTag,
  Eyebrow,
  ImageFallback,
  Shell,
  StatusBadge,
  buttonClass,
  inputClass,
  labelClass,
} from "./ui";

export function ListingRoom({ slug }: { slug: string }) {
  const [listing, setListing] = useState<PublicListing | null>(null);
  const [missing, setMissing] = useState(false);
  const [offset, setOffset] = useState(0);
  const [picked, setSelected] = useState<number | null>(null);
  // Others' picks stay hidden until the draw; numbers we were refused are the only ones we learn.
  const [knownTaken, setKnownTaken] = useState<ReadonlySet<number>>(new Set());
  // Lazy so it reads storage on the client; the form only renders after data loads.
  const [name, setName] = useState(() => (typeof window === "undefined" ? "" : getSavedName()));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const mounted = useMounted();
  const shareUrl = mounted ? `${window.location.origin}/l/${slug}` : "";
  const now = useNow(offset);
  const nameId = useId();
  const nameRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    fetch(`/api/listings/${slug}?client=${getClientId()}`, { cache: "no-store" })
      .then((res) => {
        if (res.status === 404) setMissing(true);
        return res.ok ? (res.json() as Promise<PublicListing>) : null;
      })
      .then((data) => {
        if (!data) return;
        setOffset(Date.parse(data.serverNow) - Date.now());
        setListing(data);
      })
      .catch(() => {});
  }, [slug]);

  // Poll while the draw can still change; stop once the winner is in.
  useEffect(() => {
    load();
    if (listing?.drawn) return;
    const id = setInterval(load, 2000);
    return () => clearInterval(id);
  }, [load, listing?.drawn]);

  const status: ListingStatus | null =
    listing && now !== null
      ? now < Date.parse(listing.startsAt)
        ? "scheduled"
        : now < Date.parse(listing.endsAt)
          ? "live"
          : "ended"
      : (listing?.status ?? null);

  // Ask for the result the moment the clock hits zero, not on the next poll.
  const ended = status === "ended";
  useEffect(() => {
    if (ended && listing && !listing.drawn) {
      const t = setTimeout(load, 300);
      return () => clearTimeout(t);
    }
  }, [ended, listing, load]);

  // A selection someone else just claimed falls away on the next poll.
  const selected =
    picked !== null && (knownTaken.has(picked) || listing?.takenNumbers.includes(picked)) ? null : picked;

  async function claim(e: React.FormEvent) {
    e.preventDefault();
    if (selected === null) return;
    if (!name.trim()) {
      setError("Add your name so the winner can be identified.");
      nameRef.current?.focus();
      return;
    }
    setPending(true);
    setError(null);
    const res = await fetch(`/api/listings/${slug}/picks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number: selected, name: name.trim(), clientId: getClientId() }),
    });
    const body = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(body.error ?? "Could not claim that number.");
      if (body.code === "taken") setKnownTaken((prev) => new Set(prev).add(selected));
    } else {
      saveName(name.trim());
      setSelected(null);
    }
    load();
  }

  if (missing) {
    return (
      <div className="flex flex-col items-start gap-6 py-16 md:py-40">
        <Eyebrow tone="tomato">Not found</Eyebrow>
        <h1 className="font-serif text-[clamp(2.5rem,6vw,5rem)] font-light leading-[1] tracking-[-0.045em] text-ink">
          This draw does not exist.
        </h1>
        <p className="text-lg text-ink-2">It may have been removed by its seller before it started.</p>
        <Link href="/live" className={`${buttonClass} mt-4`}>
          See live draws
          <ArrowBadge />
        </Link>
      </div>
    );
  }

  if (!listing || status === null) return <RoomSkeleton />;

  // Number → who holds it. "" means taken by someone whose name stays hidden until the draw.
  const takenBy = new Map<number, string>(listing.picks.map((p) => [p.number, p.name]));
  for (const n of listing.takenNumbers) if (!takenBy.has(n)) takenBy.set(n, "");
  for (const n of knownTaken) if (!takenBy.has(n)) takenBy.set(n, "");
  const mine = listing.myNumber;
  const target = status === "scheduled" ? Date.parse(listing.startsAt) : Date.parse(listing.endsAt);
  const remaining = now === null ? null : target - now;
  const canPick = status === "live" && mine === null;
  const winningSet = new Set(listing.drawn ? listing.winners.map((w) => w.number) : []);
  const won = mine !== null && winningSet.has(mine);
  const numbers = Array.from({ length: listing.slots }, (_, i) => i + MIN_NUMBER);

  // Phones read top to bottom: who and how long, then the board, then sharing.
  // From md up the info column sits left and the board spans the right.
  return (
    <div
      className="grid grid-cols-1 gap-6 pb-12 pt-2 md:grid-cols-12 md:gap-10 md:pt-12"
      style={hueVars(hueFor(slug))}
    >
      <div className="flex flex-col gap-5 md:col-span-5 md:row-start-1 md:gap-8">
        <Reveal>
          <Shell innerClassName="overflow-hidden p-1.5 sm:p-2">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[1.5rem] sm:aspect-[4/3]">
              {listing.hasImage ? (
                <Image
                  src={imageUrl(listing)}
                  alt={listing.name}
                  fill
                  sizes="(min-width: 768px) 460px, 100vw"
                  className="object-cover"
                  priority
                  unoptimized
                />
              ) : (
                <ImageFallback name={listing.name} colorKey={listing.slug} className="absolute inset-0" />
              )}
            </div>
          </Shell>
        </Reveal>

        <Reveal index={1} className="flex flex-col items-start gap-3 px-1 sm:gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            <CategoryTag category={listing.category} />
            <Eyebrow tone="sky">{formatDuration(listing.durationMinutes)} draw</Eyebrow>
            <Eyebrow tone="marigold">{winnersLabel(listing.winnerCount)}</Eyebrow>
          </div>
          <h1 className="break-words font-serif text-[clamp(2rem,8vw,3.75rem)] font-light leading-[1.02] tracking-[-0.04em] text-ink">
            {listing.name}
          </h1>
          {listing.ownerName && <p className="text-ink-2">Listed by {listing.ownerName}</p>}
        </Reveal>

        <Reveal index={2}>
          <Clock
            status={status}
            remaining={remaining}
            startsAt={listing.startsAt}
            drawn={listing.drawn}
            winnerCount={listing.winnerCount}
          />
        </Reveal>
      </div>

      <div className="flex min-w-0 flex-col gap-6 md:col-span-7 md:row-span-2 md:row-start-1">
        <Result listing={listing} status={status} won={won} />

        <Reveal index={1}>
          <Shell as="section" aria-labelledby="board-heading" innerClassName="p-3 sm:p-8">
            <div className="mb-5 flex items-end justify-between gap-3 px-1 pt-2 sm:mb-7 sm:px-0 sm:pt-0">
              <div className="flex flex-col items-start gap-3">
                <Eyebrow tone={canPick ? "tomato" : "plain"}>{canPick ? "Your move" : "The board"}</Eyebrow>
                <h2 id="board-heading" className="font-serif text-[1.75rem] font-light leading-tight tracking-[-0.035em] text-ink sm:text-4xl">
                  {canPick ? "Pick your number" : status === "ended" ? "Final board" : `Numbers 1 to ${listing.slots}`}
                </h2>
              </div>
              <p className="shrink-0 text-sm tabular-nums text-ink-2">
                {listing.pickCount}/{listing.slots} taken
              </p>
            </div>

            <div className="grid grid-cols-5 gap-2 sm:grid-cols-10" role="group" aria-label={`Numbers 1 to ${listing.slots}`}>
              {numbers.map((n) => {
                const owner = takenBy.get(n);
                const isMine = n === mine;
                const isWinner = winningSet.has(n);
                const isSelected = n === selected;
                const disabled = !canPick || owner !== undefined;
                // Each row of ten wears its own hue: washes carry dark ink, solids carry their `on` colour.
                let cls = "bg-(--accent-wash) text-(--accent-ink) hover:bg-(--accent) hover:text-(--accent-on)";
                if (isWinner) cls = "pop bg-(--accent) text-(--accent-on) ring-4 ring-ink";
                else if (isMine) cls = "bg-espresso text-white ring-4 ring-(--accent)";
                else if (isSelected)
                  cls = "bg-(--accent) text-(--accent-on) scale-[1.08] shadow-[0_12px_24px_-12px_rgba(42,33,28,0.6)]";
                // Picked by someone else: darkened out (a warm grey, so it never reads as your own espresso tile).
                else if (owner !== undefined) cls = "bg-[#5b534d] text-[#fdfbf7]/55 line-through decoration-[#fdfbf7]/45";
                else if (!canPick) cls = "bg-(--accent-wash) text-(--accent-ink) opacity-70";
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={disabled}
                    aria-pressed={isSelected}
                    aria-label={
                      owner !== undefined
                        ? `${n}, ${isMine ? "your number" : owner ? `taken by ${owner}` : "taken"}${isWinner ? ", winning number" : ""}`
                        : `${n}${canPick ? ", available" : ""}`
                    }
                    title={owner || (owner === "" ? "Taken" : undefined)}
                    style={hueVars(hueForNumber(n))}
                    onClick={() => {
                      setSelected(n === selected ? null : n);
                      setError(null);
                    }}
                    className={`flex aspect-square min-h-11 items-center justify-center rounded-2xl text-base font-semibold tabular-nums transition-all duration-500 ease-spring [touch-action:manipulation] active:scale-95 disabled:cursor-default sm:text-[15px] ${cls}`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>

            {canPick && (
              // On phones the claim bar rides along the bottom of the screen while the board is in view.
              <form
                onSubmit={claim}
                className="sticky bottom-3 z-20 -mx-1 mt-5 flex flex-col gap-3 rounded-[1.5rem] bg-surface/95 p-3 shadow-[0_16px_40px_-16px_rgba(42,33,28,0.35)] ring-1 ring-black/[0.06] backdrop-blur-xl sm:static sm:mx-0 sm:mt-8 sm:flex-row sm:items-end sm:bg-transparent sm:p-0 sm:shadow-none sm:ring-0 sm:backdrop-blur-none"
              >
                <div className="flex flex-1 flex-col gap-2">
                  <label htmlFor={nameId} className={`${labelClass} max-sm:sr-only`}>
                    Your name
                  </label>
                  <input
                    ref={nameRef}
                    id={nameId}
                    className={inputClass}
                    value={name}
                    maxLength={40}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name, so we know who won"
                    autoComplete="nickname"
                    enterKeyHint="go"
                  />
                </div>
                <button
                  type="submit"
                  className={`${buttonClass} justify-between sm:min-w-60`}
                  disabled={selected === null || pending}
                >
                  <span>{pending ? "Claiming…" : selected === null ? "Tap a number above" : `Claim number ${selected}`}</span>
                  <ArrowBadge />
                </button>
              </form>
            )}
            {status === "live" && mine !== null && (
              <p className="mt-5 rounded-2xl bg-(--accent-wash) px-5 py-4 text-ink sm:mt-8">
                You hold <strong className="font-semibold">number {mine}</strong>. The draw happens when the clock reaches
                zero.
              </p>
            )}
            {status === "scheduled" && (
              <p className="mt-5 rounded-2xl bg-marigold-wash px-5 py-4 text-ink sm:mt-8">
                Numbers open at {formatStart(listing.startsAt)}. Keep this page open and the board unlocks on its own.
              </p>
            )}
            {error && (
              <p role="alert" className="pop mt-4 rounded-2xl bg-tomato-wash px-5 py-3 text-sm font-medium text-tomato-ink">
                {error}
              </p>
            )}
          </Shell>
        </Reveal>

        {listing.picksHidden && listing.pickCount > 0 && (
          <p className="px-1 pt-2 text-ink-2">
            {listing.pickCount === 1 ? "1 person has" : `${listing.pickCount} people have`} picked a number. Who holds
            which number is revealed when the draw ends.
          </p>
        )}
        {!listing.picksHidden && listing.picks.length > 0 && (
          <Reveal index={2} as="section" className="px-1 pt-2">
            <h2 className="mb-4 font-serif text-xl font-light tracking-[-0.02em] text-ink">Entrants</h2>
            <ul className="flex flex-wrap gap-2 text-sm">
              {listing.picks.map((p) => (
                <li
                  key={p.number}
                  style={hueVars(hueForNumber(p.number))}
                  className={`flex max-w-full items-center gap-2 rounded-full bg-(--accent-wash) py-1 pl-1 pr-3 text-(--accent-ink) ${
                    winningSet.has(p.number) ? "ring-2 ring-ink" : ""
                  }`}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-(--accent) text-[11px] font-semibold tabular-nums text-(--accent-on)">
                    {p.number}
                  </span>
                  <span className="truncate font-medium">{p.name}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        )}
      </div>

      {shareUrl && (
        <div className="md:col-span-5 md:row-start-2 md:self-start">
          <Reveal className="px-1">
            <CopyField label="Invite someone" value={shareUrl} />
          </Reveal>
        </div>
      )}
    </div>
  );
}

function Clock({
  status,
  remaining,
  startsAt,
  drawn,
  winnerCount,
}: {
  status: ListingStatus;
  remaining: number | null;
  startsAt: string;
  drawn: boolean;
  winnerCount: number;
}) {
  const urgent = status === "live" && remaining !== null && remaining < 30_000;
  const live = status === "live";
  return (
    <div className={`rounded-[2rem] p-1.5 ring-1 ${live ? "bg-(--accent-wash) ring-black/[0.05]" : "bg-black/[0.035] ring-black/[0.05]"}`}>
      <div
        className={`flex items-end justify-between gap-4 rounded-[calc(2rem-0.375rem)] px-6 py-5 sm:block sm:px-7 sm:py-6 ${
          live ? "bg-(--accent) text-(--accent-on) shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]" : "bg-surface text-ink"
        }`}
      >
        <div>
          <p className="text-sm font-semibold">
            {status === "scheduled" ? "Opens in" : status === "live" ? "Closes in" : "Countdown"}
          </p>
          <p
            className={`mt-1 font-serif text-[clamp(3.25rem,15vw,6rem)] font-light leading-none tabular-nums tracking-[-0.04em] ${
              status === "ended" ? "text-ink/45" : urgent ? "breathe" : ""
            }`}
            role="timer"
          >
            {status === "ended" ? "00:00" : remaining === null ? "--:--" : formatRemaining(remaining)}
          </p>
        </div>
        <p className="max-w-[9rem] pb-1 text-right text-sm font-medium sm:mt-3 sm:max-w-none sm:pb-0 sm:text-left">
          {status === "scheduled"
            ? `Starts ${formatStart(startsAt)}`
            : status === "live"
              ? winnerCount === 1
                ? "One claimed number wins at zero."
                : `${winnerCount} claimed numbers win at zero.`
              : drawn
                ? "Closed. The draw is done."
                : "Closed. Drawing now…"}
        </p>
      </div>
    </div>
  );
}

function Result({ listing, status, won }: { listing: PublicListing; status: ListingStatus; won: boolean }) {
  if (status !== "ended") return null;
  if (!listing.drawn) {
    return (
      <Shell innerClassName="p-6 sm:p-8" role="status">
        <p className="font-serif text-3xl font-light tracking-[-0.03em] text-ink">Drawing the winners…</p>
      </Shell>
    );
  }
  if (listing.winners.length === 0) {
    return (
      <Shell className="pop" innerClassName="p-6 sm:p-8" role="status">
        <p className="font-serif text-3xl font-light tracking-[-0.03em] text-ink">No winner this time.</p>
        <p className="mt-2 text-ink-2">Nobody picked a number before the countdown ended.</p>
      </Shell>
    );
  }
  const [first, ...rest] = listing.winners;
  const mine = listing.winners.find((w) => w.number === listing.myNumber);
  return (
    <div
      className="pop rounded-[2rem] bg-black/[0.035] p-1.5 ring-1 ring-black/[0.05]"
      role="status"
      style={hueVars(hueForNumber(first.number))}
    >
      <div className="flex flex-col gap-6 rounded-[calc(2rem-0.375rem)] bg-(--accent-wash) p-6 sm:p-8">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6">
          <span className="flex size-20 shrink-0 items-center justify-center rounded-[1.5rem] bg-(--accent) font-serif text-5xl font-light tabular-nums text-(--accent-on) sm:size-24">
            {(mine ?? first).number}
          </span>
          <div className="flex flex-col items-start gap-2 text-ink">
            <Eyebrow tone="plain">{listing.winners.length === 1 ? "Winner" : `${listing.winners.length} winners`}</Eyebrow>
            <p className="font-serif text-[2.25rem] font-light leading-[1] tracking-[-0.04em] sm:text-4xl">
              {won ? "You won." : listing.winners.length === 1 ? `Number ${first.number} wins.` : "The winners are in."}
            </p>
            <p className="text-ink-2">
              {won
                ? `Your number ${mine!.number} was drawn.`
                : listing.winners.length === 1
                  ? `Picked by ${first.name}.`
                  : `First drawn: ${first.number}, picked by ${first.name}.`}
            </p>
          </div>
        </div>
        {rest.length > 0 && (
          <ol className="flex flex-wrap gap-2" aria-label="All winners in the order drawn">
            {listing.winners.map((w, i) => {
              const hue = hueForNumber(w.number);
              return (
                <li
                  key={w.number}
                  className={`flex items-center gap-2 rounded-full bg-surface py-1 pl-1 pr-3 text-sm ${
                    w.number === listing.myNumber ? "ring-2 ring-ink" : ""
                  }`}
                >
                  <span
                    className="flex size-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums"
                    style={{ background: hue.solid, color: hue.on }}
                  >
                    {w.number}
                  </span>
                  <span className="font-medium text-ink">
                    <span className="sr-only">Place {i + 1}: </span>
                    {w.name}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

export function RoomSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 pt-4 md:grid-cols-12 md:gap-10 md:pt-12" aria-busy>
      <div className="flex flex-col gap-5 md:col-span-5">
        <div className="aspect-[16/10] animate-pulse rounded-[2rem] bg-black/[0.05] sm:aspect-[4/3]" />
        <div className="h-12 w-3/4 animate-pulse rounded-full bg-black/[0.05]" />
      </div>
      <div className="h-[28rem] animate-pulse rounded-[2rem] bg-black/[0.05] md:col-span-7" />
    </div>
  );
}
