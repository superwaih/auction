"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  formatDuration,
  formatRemaining,
  formatStart,
  getClientId,
  getOwnerKey,
  getSavedName,
  saveName,
  useMounted,
  useNow,
} from "@/lib/client";
import { MAX_NUMBER, MIN_NUMBER, imageUrl, type ListingStatus, type PublicListing } from "@/lib/types";
import { CopyField } from "./copy-field";
import { ImageFallback, StatusBadge, buttonClass, inputClass } from "./ui";

const NUMBERS = Array.from({ length: MAX_NUMBER - MIN_NUMBER + 1 }, (_, i) => i + MIN_NUMBER);

export function ListingRoom({ slug }: { slug: string }) {
  const [listing, setListing] = useState<PublicListing | null>(null);
  const [missing, setMissing] = useState(false);
  const [offset, setOffset] = useState(0);
  const [picked, setSelected] = useState<number | null>(null);
  // Lazy so it reads storage on the client; the form only renders after data loads.
  const [name, setName] = useState(() => (typeof window === "undefined" ? "" : getSavedName()));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const mounted = useMounted();
  const isOwner = mounted && Boolean(getOwnerKey(slug));
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
  const selected = picked !== null && listing?.picks.some((p) => p.number === picked) ? null : picked;

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
    } else {
      saveName(name.trim());
      setSelected(null);
    }
    load();
  }

  if (missing) {
    return (
      <div className="py-24">
        <h1 className="font-serif text-5xl tracking-[-0.04em] text-ink">This draw does not exist.</h1>
        <p className="mt-4 text-ink-2">It may have been removed by its owner before it started.</p>
        <Link href="/" className={`${buttonClass} mt-8`}>
          See live draws
        </Link>
      </div>
    );
  }

  if (!listing || status === null) return <RoomSkeleton />;

  const takenBy = new Map(listing.picks.map((p) => [p.number, p.name]));
  const mine = listing.myNumber;
  const target = status === "scheduled" ? Date.parse(listing.startsAt) : Date.parse(listing.endsAt);
  const remaining = now === null ? null : target - now;
  const canPick = status === "live" && mine === null;
  const won = listing.drawn && mine !== null && mine === listing.winningNumber;

  return (
    <div className="grid gap-12 pb-12 pt-6 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-14 md:pt-12">
      <div className="reveal flex flex-col gap-8 md:sticky md:top-10 md:self-start">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-line bg-surface">
          {listing.hasImage ? (
            <Image src={imageUrl(listing)} alt={listing.name} fill sizes="(min-width: 768px) 420px, 100vw" className="object-cover" priority unoptimized />
          ) : (
            <ImageFallback name={listing.name} className="size-full" />
          )}
        </div>

        <div>
          <div className="mb-4 flex items-center gap-3">
            <StatusBadge status={status} />
            <span className="text-sm text-muted">{formatDuration(listing.durationMinutes)} draw</span>
          </div>
          <h1 className="font-serif text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.035em] text-ink">
            {listing.name}
          </h1>
        </div>

        <Clock status={status} remaining={remaining} startsAt={listing.startsAt} drawn={listing.drawn} />

        <div className="flex flex-col gap-3">
          {shareUrl && <CopyField label="Share this draw" value={shareUrl} />}
          {isOwner && status === "scheduled" && (
            <Link href={`/l/${slug}/manage`} className="text-sm text-ink underline underline-offset-4">
              Edit listing
            </Link>
          )}
        </div>
      </div>

      <div className="reveal flex flex-col gap-6" style={{ "--index": 1 } as React.CSSProperties}>
        <Result listing={listing} status={status} won={won} />

        <section aria-labelledby="board-heading" className="rounded-xl border border-line bg-surface p-5 sm:p-7">
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <h2 id="board-heading" className="font-serif text-2xl tracking-[-0.02em] text-ink">
              {status === "ended" ? "The board" : canPick ? "Pick your number" : "The board"}
            </h2>
            <p className="text-sm tabular-nums text-muted">
              {listing.picks.length} of {MAX_NUMBER} taken
            </p>
          </div>

          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10" role="group" aria-label="Numbers 1 to 50">
            {NUMBERS.map((n) => {
              const owner = takenBy.get(n);
              const isMine = n === mine;
              const isWinner = listing.drawn && n === listing.winningNumber;
              const isSelected = n === selected;
              const disabled = !canPick || owner !== undefined;
              let cls = "border border-line bg-surface text-ink hover:border-ink";
              if (isWinner) cls = "bg-green text-white pop ring-4 ring-green-bg";
              else if (isMine) cls = "bg-ink text-white";
              else if (isSelected) cls = "bg-ink text-white scale-[1.06]";
              else if (owner !== undefined) cls = "bg-[#efeee9] text-muted line-through decoration-muted/50";
              else if (!canPick) cls = "border border-line bg-surface-2 text-muted";
              return (
                <button
                  key={n}
                  type="button"
                  disabled={disabled}
                  aria-pressed={isSelected}
                  aria-label={
                    owner !== undefined
                      ? `${n}, taken by ${owner}${isWinner ? ", winning number" : ""}`
                      : `${n}${canPick ? ", available" : ""}`
                  }
                  title={owner}
                  onClick={() => {
                    setSelected(n === selected ? null : n);
                    setError(null);
                  }}
                  className={`flex aspect-square items-center justify-center rounded-md text-[15px] font-medium tabular-nums transition duration-150 active:scale-95 disabled:cursor-default ${cls} ${
                    isWinner || isMine || isSelected ? "" : "disabled:hover:border-line"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>

          {canPick && (
            <form onSubmit={claim} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex flex-1 flex-col gap-2">
                <label htmlFor={nameId} className="text-sm font-medium text-ink">
                  Your name
                </label>
                <input
                  ref={nameRef}
                  id={nameId}
                  className={inputClass}
                  value={name}
                  maxLength={40}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="So we know who won"
                  autoComplete="nickname"
                />
              </div>
              <button type="submit" className={`${buttonClass} sm:min-w-44`} disabled={selected === null || pending}>
                {pending ? "Claiming…" : selected === null ? "Choose a number" : `Claim number ${selected}`}
              </button>
            </form>
          )}
          {status === "live" && mine !== null && (
            <p className="mt-6 rounded-md bg-surface-2 px-4 py-3 text-ink-2">
              You hold <strong className="font-semibold text-ink">number {mine}</strong>. The draw happens when the
              clock reaches zero.
            </p>
          )}
          {status === "scheduled" && (
            <p className="mt-6 rounded-md bg-surface-2 px-4 py-3 text-ink-2">
              Numbers open at {formatStart(listing.startsAt)}. Keep this page open and the board unlocks on its own.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-4 rounded-md bg-red-bg px-4 py-3 text-sm text-red">
              {error}
            </p>
          )}
        </section>

        {listing.picks.length > 0 && (
          <section aria-labelledby="entrants-heading" className="px-1">
            <h2 id="entrants-heading" className="mb-3 text-sm font-medium text-ink">
              Entrants
            </h2>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-2">
              {listing.picks.map((p) => (
                <li key={p.number} className={p.number === listing.winningNumber && listing.drawn ? "font-semibold text-green" : ""}>
                  <span className="tabular-nums text-muted">{p.number}</span> {p.name}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function Clock({
  status,
  remaining,
  startsAt,
  drawn,
}: {
  status: ListingStatus;
  remaining: number | null;
  startsAt: string;
  drawn: boolean;
}) {
  if (status === "ended") {
    return (
      <div className="rounded-xl bg-surface-2 p-6">
        <p className="text-sm text-muted">Countdown</p>
        <p className="font-serif text-6xl leading-none tabular-nums tracking-[-0.03em] text-ink/30">00:00</p>
        <p className="mt-3 text-sm text-ink-2">{drawn ? "Closed. The winner has been drawn." : "Closed. Drawing the winner…"}</p>
      </div>
    );
  }
  const urgent = status === "live" && remaining !== null && remaining < 30_000;
  return (
    <div className="rounded-xl bg-surface-2 p-6" aria-live="off">
      <p className="text-sm text-muted">{status === "scheduled" ? "Opens in" : "Closes in"}</p>
      <p
        className={`font-serif text-[clamp(3.5rem,9vw,5.5rem)] leading-none tabular-nums tracking-[-0.03em] ${urgent ? "text-red" : "text-ink"}`}
        role="timer"
      >
        {remaining === null ? "--:--" : formatRemaining(remaining)}
      </p>
      {status === "scheduled" && <p className="mt-3 text-sm text-ink-2">Starts {formatStart(startsAt)}</p>}
    </div>
  );
}

function Result({ listing, status, won }: { listing: PublicListing; status: ListingStatus; won: boolean }) {
  if (status !== "ended") return null;
  if (!listing.drawn) {
    return (
      <div className="rounded-xl border border-line bg-surface p-7" role="status">
        <p className="font-serif text-3xl tracking-[-0.03em] text-ink">Drawing the winner…</p>
      </div>
    );
  }
  if (listing.winningNumber === null) {
    return (
      <div className="pop rounded-xl border border-line bg-surface p-7" role="status">
        <p className="font-serif text-3xl tracking-[-0.03em] text-ink">No winner this time.</p>
        <p className="mt-2 text-ink-2">Nobody picked a number before the countdown ended.</p>
      </div>
    );
  }
  return (
    <div className="pop flex items-center gap-6 rounded-xl bg-green-bg p-7" role="status">
      <span className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-green font-serif text-4xl tabular-nums text-white">
        {listing.winningNumber}
      </span>
      <div>
        <p className="font-serif text-3xl leading-tight tracking-[-0.03em] text-ink">
          {won ? "You won." : `Number ${listing.winningNumber} wins.`}
        </p>
        <p className="mt-1 text-ink-2">
          {won ? `Your number ${listing.winningNumber} was drawn.` : `Picked by ${listing.winnerName}.`}
        </p>
      </div>
    </div>
  );
}

function RoomSkeleton() {
  return (
    <div className="grid gap-12 pt-12 md:grid-cols-[5fr_6fr]" aria-busy>
      <div className="flex flex-col gap-6">
        <div className="aspect-[4/3] animate-pulse rounded-xl bg-surface" />
        <div className="h-12 w-3/4 animate-pulse rounded bg-surface" />
      </div>
      <div className="h-96 animate-pulse rounded-xl bg-surface" />
    </div>
  );
}
