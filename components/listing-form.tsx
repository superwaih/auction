"use client";

import { useId, useRef, useState } from "react";
import { downscaleImage, toLocalInput } from "@/lib/client";
import { DEFAULT_DURATION_MINUTES, MAX_DURATION_MINUTES, MAX_NAME_LENGTH } from "@/lib/types";
import { buttonClass, inputClass } from "./ui";

const PRESETS = [5, 10, 15, 30, 60];

export type ListingFormValues = {
  name: string;
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
  const [duration, setDuration] = useState(initial?.durationMinutes ?? DEFAULT_DURATION_MINUTES);
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
    if (startMode === "later" && !startsAt) {
      setError("Pick a start time.");
      return;
    }
    const form = new FormData();
    form.set("name", name);
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
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${ids}-name`} className="text-sm font-medium text-ink">
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

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink" id={`${ids}-image-label`}>
          Photo <span className="font-normal text-muted">optional</span>
        </span>
        {preview ? (
          <div className="flex items-center gap-4 rounded-lg border border-line bg-surface p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob preview */}
            <img src={preview} alt="" className="size-16 rounded-md object-cover" />
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
            className={`flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-6 text-sm transition ${
              dragging ? "border-ink bg-surface" : "border-[#d9d8d4] bg-surface-2 hover:bg-surface"
            }`}
          >
            <span className="text-ink">Drop a photo or click to upload</span>
            <span className="text-muted">JPG, PNG or WebP</span>
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
        <legend className="mb-2 text-sm font-medium text-ink">Countdown</legend>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((m) => (
            <Chip
              key={m}
              active={!custom && duration === m}
              onClick={() => {
                setCustom(false);
                setDuration(m);
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
          <div className="mt-1 flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={MAX_DURATION_MINUTES}
              aria-label="Countdown length in minutes"
              className={`${inputClass} w-28 tabular-nums`}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
            <span className="text-sm text-muted">minutes, up to 24 hours</span>
          </div>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-ink">Start</legend>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#efeee9] p-1">
          {(["now", "later"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={startMode === mode}
              onClick={() => {
                setStartMode(mode);
                setMinStart(toLocalInput(new Date(Date.now() + 60_000)));
              }}
              className={`rounded-md py-2 text-sm font-medium transition ${
                startMode === mode ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.04)]" : "text-muted hover:text-ink"
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
            className={`${inputClass} mt-1`}
            value={startsAt}
            min={minStart}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        )}
      </fieldset>

      {error && (
        <p role="alert" className="rounded-md bg-red-bg px-3.5 py-2.5 text-sm text-red">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <button type="submit" className={buttonClass} disabled={pending || !name.trim()}>
          {pending ? "Saving…" : label}
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
      className={`rounded-md border px-3.5 py-1.5 text-sm tabular-nums transition active:scale-[0.98] ${
        active ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink hover:bg-surface-2"
      }`}
    >
      {children}
    </button>
  );
}
