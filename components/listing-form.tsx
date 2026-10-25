"use client";

import { useId, useRef, useState } from "react";
import { downscaleImage, toLocalInput } from "@/lib/client";
import { DEFAULT_DURATION_MINUTES, MAX_DURATION_MINUTES, MAX_NAME_LENGTH, MAX_OWNER_NAME_LENGTH } from "@/lib/types";
import { ArrowBadge, buttonClass, inputClass, labelClass } from "./ui";

const PRESETS = [5, 10, 15, 30, 60];

export type ListingFormValues = {
  name: string;
  ownerName: string;
  durationMinutes: number;
  startMode: "now" | "later";
  startsAt: string; // datetime-local value
  imageUrl: string | null;
};

type Props = {
  initial?: ListingFormValues;
  submitLabel?: (mode: "now" | "later") => string;
  /** Sends the form; resolves with an error message or null on success. */
  onSubmit: (form: FormData) => Promise<string | null>;
};

export function ListingForm({ initial, submitLabel, onSubmit }: Props) {
  const ids = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initial?.name ?? "");
  const [ownerName, setOwnerName] = useState(initial?.ownerName ?? "");
  // Kept as text so the custom field can hold "" while typing; digits only.
  const [durationText, setDurationText] = useState(String(initial?.durationMinutes ?? DEFAULT_DURATION_MINUTES));
  const duration = Number(durationText);
  const [custom, setCustom] = useState(!PRESETS.includes(initial?.durationMinutes ?? DEFAULT_DURATION_MINUTES));
  const [startMode, setStartMode] = useState<"now" | "later">(initial?.startMode ?? "now");
  const [startsAt, setStartsAt] = useState(initial?.startsAt ?? "");
  const [image, setImage] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(initial?.imageUrl ?? null);
  const [removeImage, setRemoveImage] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [minStart, setMinStart] = useState<string>();

  function showPreview(url: string | null) {
    setPreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return url;
    });
  }

  async function chooseFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That file is not an image.");
      return;
    }
    setError(null);
    const blob = await downscaleImage(file);
    setImage(blob);
    showPreview(URL.createObjectURL(blob));
    setRemoveImage(false);
  }

  function clearImage() {
    setImage(null);
    showPreview(null);
    setRemoveImage(true);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!Number.isInteger(duration) || duration < 1 || duration > MAX_DURATION_MINUTES) {
      setError(`Enter a countdown between 1 and ${MAX_DURATION_MINUTES} minutes.`);
      return;
    }
    if (startMode === "later" && !startsAt) {
      setError("Pick a start time.");
      return;
    }
    const form = new FormData();
    form.set("name", name);
    form.set("ownerName", ownerName);
    form.set("durationMinutes", String(duration));
    form.set("startMode", startMode);
    if (startMode === "later") form.set("startsAt", new Date(startsAt).toISOString());
    if (image) form.set("image", image, "image");
    if (removeImage) form.set("removeImage", "1");
    setPending(true);
    const err = await onSubmit(form);
    setPending(false);
    if (err) setError(err);
  }

  const label = submitLabel?.(startMode) ?? (startMode === "now" ? "Go live now" : "Schedule draw");

  return (
    <form onSubmit={submit} className="flex flex-col gap-7" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <label htmlFor={`${ids}-name`} className={labelClass}>
            Product name
          </label>
          <input
            id={`${ids}-name`}
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
            placeholder="Sony WH-1000XM5 headphones"
            required
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <label htmlFor={`${ids}-owner`} className={labelClass}>
            Your name
          </label>
          <input
            id={`${ids}-owner`}
            className={inputClass}
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            maxLength={MAX_OWNER_NAME_LENGTH}
            placeholder="Shown on the draw as the seller"
            required
            autoComplete="name"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className={labelClass} id={`${ids}-image-label`}>
          Photo <span className="font-normal text-muted">· optional</span>
        </span>
        {preview ? (
          <div className="flex items-center gap-4 rounded-2xl bg-paper/70 p-2 pr-4 ring-1 ring-black/[0.06]">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob preview */}
            <img src={preview} alt="" className="size-16 rounded-xl object-cover" />
            <div className="flex flex-1 flex-wrap gap-x-4 gap-y-1 text-sm">
              <button type="button" className="text-ink underline-offset-4 hover:underline" onClick={() => fileRef.current?.click()}>
                Replace
              </button>
              <button type="button" className="text-muted underline-offset-4 hover:underline" onClick={clearImage}>
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            aria-labelledby={`${ids}-image-label`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              chooseFile(e.dataTransfer.files[0]);
            }}
            className={`group flex items-center gap-4 rounded-2xl p-2 pr-4 text-left text-sm ring-1 transition-all duration-500 ease-spring ${
              dragging ? "bg-sage-wash ring-sage/40" : "bg-paper/70 ring-black/[0.06] hover:bg-paper"
            }`}
          >
            <span className="flex size-16 items-center justify-center rounded-xl bg-surface ring-1 ring-black/[0.05] transition-transform duration-500 ease-spring group-hover:scale-105">
              <svg viewBox="0 0 24 24" fill="none" className="size-5 text-ink-2" aria-hidden>
                <path d="M12 16V5m0 0l-4 4m4-4l4 4M5 19h14" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="flex flex-col">
              <span className="text-ink">Drop a photo or click to upload</span>
              <span className="text-muted">JPG, PNG or WebP</span>
            </span>
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => chooseFile(e.target.files?.[0])}
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className={`${labelClass} mb-2`}>Countdown</legend>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((m) => (
            <Chip
              key={m}
              active={!custom && duration === m}
              onClick={() => {
                setCustom(false);
                setDurationText(String(m));
              }}
            >
              {m} min
            </Chip>
          ))}
          <Chip active={custom} onClick={() => setCustom(true)}>
            Custom
          </Chip>
        </div>
        {custom && (
          <div className="mt-2 flex items-center gap-3">
            <input
              id={`${ids}-duration`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              autoComplete="off"
              aria-label="Countdown length in minutes"
              aria-describedby={`${ids}-duration-hint`}
              className={`${inputClass} w-28 tabular-nums`}
              value={durationText}
              onChange={(e) => setDurationText(e.target.value.replace(/\D/g, ""))}
              placeholder="5"
            />
            <span id={`${ids}-duration-hint`} className="text-sm text-ink-2">
              minutes, 1 to {MAX_DURATION_MINUTES}
            </span>
          </div>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className={`${labelClass} mb-2`}>Start</legend>
        <div className="relative grid grid-cols-2 rounded-full bg-black/[0.045] p-1 ring-1 ring-black/[0.04]">
          <span
            aria-hidden
            className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-surface shadow-[0_1px_2px_rgba(42,33,28,0.08),0_6px_16px_-8px_rgba(42,33,28,0.2)] transition-transform duration-500 ease-spring ${
              startMode === "later" ? "translate-x-full" : ""
            }`}
          />
          {(["now", "later"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={startMode === mode}
              onClick={() => {
                setStartMode(mode);
                setMinStart(toLocalInput(new Date(Date.now() + 60_000)));
              }}
              className={`relative rounded-full py-2.5 text-sm font-medium transition-colors duration-500 ease-spring ${
                startMode === mode ? "text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {mode === "now" ? "Right away" : "Later"}
            </button>
          ))}
        </div>
        {startMode === "later" && (
          <input
            type="datetime-local"
            aria-label="Start time"
            className={`${inputClass} pop mt-2`}
            value={startsAt}
            min={minStart}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        )}
      </fieldset>

      {error && (
        <p role="alert" className="pop rounded-2xl bg-rose-wash px-4 py-3 text-sm text-rose">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-4 pt-1">
        <button type="submit" className={`${buttonClass} w-full justify-between`} disabled={pending || !name.trim() || !ownerName.trim()}>
          <span>{pending ? "Saving…" : label}</span>
          <ArrowBadge />
        </button>
        <p className="text-[13px] leading-relaxed text-muted">
          Once the countdown starts, nothing about the listing can be changed.
        </p>
      </div>
    </form>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm tabular-nums transition-all duration-500 ease-spring active:scale-[0.97] ${
        active ? "bg-espresso text-[#fdfbf7]" : "bg-black/[0.04] text-ink-2 hover:bg-black/[0.07] hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
