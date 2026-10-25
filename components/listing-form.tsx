"use client";

import { useId, useRef, useState } from "react";
import { downscaleImage, toLocalInput } from "@/lib/client";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  DEFAULT_DURATION_MINUTES,
  DEFAULT_SLOTS,
  MAX_DURATION_MINUTES,
  MAX_NAME_LENGTH,
  MAX_OWNER_NAME_LENGTH,
  MAX_SLOTS,
  MAX_WINNERS,
  MIN_SLOTS,
  type Category,
} from "@/lib/types";
import { DateTimePicker, suggestedStart } from "./date-time-picker";
import { ArrowBadge, buttonClass, inputClass, labelClass } from "./ui";

const DURATION_PRESETS = [5, 10, 15, 30, 60];
const SLOT_PRESETS = [20, 50, 100];

export type ListingFormValues = {
  name: string;
  ownerName: string;
  category: Category;
  slots: number;
  winnerCount: number;
  durationMinutes: number;
  startMode: "now" | "later";
  startsAt: string; // "YYYY-MM-DDTHH:mm" local
  imageUrl: string | null;
};

type Props = {
  initial?: ListingFormValues;
  /** Pre-fills the seller name for a new listing. */
  defaultOwnerName?: string;
  /** The draw is live or over: countdown, start and winner count can no longer change. */
  rulesLocked?: boolean;
  /** Highest number someone already holds; slots can't go below it. */
  minSlots?: number;
  submitLabel?: (mode: "now" | "later") => string;
  /** Sends the form; resolves with an error message or null on success. */
  onSubmit: (form: FormData) => Promise<string | null>;
};

const digits = (v: string) => v.replace(/\D/g, "");

export function ListingForm({ initial, defaultOwnerName, rulesLocked = false, minSlots = 0, submitLabel, onSubmit }: Props) {
  const ids = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initial?.name ?? "");
  const [ownerName, setOwnerName] = useState(initial?.ownerName ?? defaultOwnerName ?? "");
  const [category, setCategory] = useState<Category>(initial?.category ?? "product");
  // Number fields are kept as text so they can hold "" while typing; digits only.
  const [slotsText, setSlotsText] = useState(String(initial?.slots ?? DEFAULT_SLOTS));
  const slots = Number(slotsText);
  const [customSlots, setCustomSlots] = useState(!SLOT_PRESETS.includes(initial?.slots ?? DEFAULT_SLOTS));
  const [multiWinner, setMultiWinner] = useState((initial?.winnerCount ?? 1) > 1);
  const [winnersText, setWinnersText] = useState(String(Math.max(2, initial?.winnerCount ?? 3)));
  const winnerCount = multiWinner ? Number(winnersText) : 1;
  const [durationText, setDurationText] = useState(String(initial?.durationMinutes ?? DEFAULT_DURATION_MINUTES));
  const duration = Number(durationText);
  const [customDuration, setCustomDuration] = useState(
    !DURATION_PRESETS.includes(initial?.durationMinutes ?? DEFAULT_DURATION_MINUTES),
  );
  const [startMode, setStartMode] = useState<"now" | "later">(initial?.startMode ?? "now");
  const [startsAt, setStartsAt] = useState(initial?.startsAt ?? "");
  const [image, setImage] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(initial?.imageUrl ?? null);
  const [removeImage, setRemoveImage] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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

  function check(): string | null {
    if (!Number.isInteger(slots) || slots < MIN_SLOTS || slots > MAX_SLOTS) {
      return `Slots must be between ${MIN_SLOTS} and ${MAX_SLOTS}.`;
    }
    if (minSlots && slots < minSlots) return `Number ${minSlots} is already picked, so keep at least ${minSlots} slots.`;
    if (rulesLocked) return null;
    if (!Number.isInteger(winnerCount) || winnerCount < 1 || winnerCount > MAX_WINNERS) {
      return `Winners must be between 1 and ${MAX_WINNERS}.`;
    }
    if (winnerCount >= slots) return "There must be fewer winners than slots.";
    if (!Number.isInteger(duration) || duration < 1 || duration > MAX_DURATION_MINUTES) {
      return `Enter a countdown between 1 and ${MAX_DURATION_MINUTES} minutes.`;
    }
    if (startMode === "later" && !startsAt) return "Pick a start time.";
    if (startMode === "later" && new Date(startsAt).getTime() <= Date.now()) {
      return "That start time has passed. Pick a later one.";
    }
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = check();
    setError(problem);
    if (problem) return;
    const form = new FormData();
    form.set("name", name);
    form.set("ownerName", ownerName);
    form.set("category", category);
    form.set("slots", String(slots));
    form.set("winnerCount", String(winnerCount));
    form.set("durationMinutes", String(duration));
    form.set("startMode", startMode);
    if (startMode === "later" && startsAt) form.set("startsAt", new Date(startsAt).toISOString());
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
      <fieldset className="flex flex-col gap-2">
        <legend className={`${labelClass} mb-2`}>Category</legend>
        <div className="grid grid-cols-3 gap-1.5">
          {CATEGORIES.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)} wide>
              {CATEGORY_LABELS[c]}
            </Chip>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor={`${ids}-name`} className={labelClass}>
            {category === "service" ? "Service name" : category === "food" ? "Dish or meal" : "Product name"}
          </label>
          <input
            id={`${ids}-name`}
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
            placeholder={
              category === "service"
                ? "One-hour photo shoot"
                : category === "food"
                  ? "Jollof rice party tray"
                  : "Sony WH-1000XM5 headphones"
            }
            required
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={`${ids}-owner`} className={labelClass}>
            Seller name
          </label>
          <input
            id={`${ids}-owner`}
            className={inputClass}
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            maxLength={MAX_OWNER_NAME_LENGTH}
            placeholder="Shown on the draw as the seller"
            required
            autoComplete="organization"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className={labelClass} id={`${ids}-image-label`}>
          Photo <span className="font-normal text-ink-2">· optional</span>
        </span>
        {preview ? (
          <div className="flex items-center gap-4 rounded-2xl bg-paper p-2 pr-4 ring-1 ring-black/[0.06]">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob or API preview */}
            <img src={preview} alt="" className="size-16 rounded-xl object-cover" />
            <div className="flex flex-1 flex-wrap gap-x-4 gap-y-1 text-sm">
              <button type="button" className="text-ink underline-offset-4 hover:underline" onClick={() => fileRef.current?.click()}>
                Replace
              </button>
              <button type="button" className="text-ink-2 underline-offset-4 hover:underline" onClick={clearImage}>
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
              dragging ? "bg-sage-wash ring-sage/40" : "bg-paper ring-black/[0.06] hover:bg-surface"
            }`}
          >
            <span className="flex size-16 items-center justify-center rounded-xl bg-surface ring-1 ring-black/[0.05] transition-transform duration-500 ease-spring group-hover:scale-105">
              <svg viewBox="0 0 24 24" fill="none" className="size-5 text-ink-2" aria-hidden>
                <path d="M12 16V5m0 0l-4 4m4-4l4 4M5 19h14" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="flex flex-col">
              <span className="text-ink">Drop a photo or click to upload</span>
              <span className="text-ink-2">JPG, PNG or WebP</span>
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
        <legend className={`${labelClass} mb-2`}>Slots on the board</legend>
        <div className="flex flex-wrap gap-1.5">
          {SLOT_PRESETS.map((n) => (
            <Chip
              key={n}
              active={!customSlots && slots === n}
              disabled={minSlots > n}
              onClick={() => {
                setCustomSlots(false);
                setSlotsText(String(n));
              }}
            >
              1–{n}
            </Chip>
          ))}
          <Chip active={customSlots} onClick={() => setCustomSlots(true)}>
            Custom
          </Chip>
        </div>
        {customSlots && (
          <NumberField
            id={`${ids}-slots`}
            label="Number of slots"
            value={slotsText}
            onChange={setSlotsText}
            hint={`slots, ${Math.max(MIN_SLOTS, minSlots)} to ${MAX_SLOTS}`}
          />
        )}
        {minSlots > 0 && (
          <p className="text-[13px] text-ink-2">Number {minSlots} is already picked, so the board can&rsquo;t shrink below it.</p>
        )}
      </fieldset>

      {rulesLocked ? (
        <p className="rounded-2xl bg-cobalt-wash px-4 py-3 text-sm text-cobalt-ink">
          This draw has started, so its countdown, start time and number of winners are locked. Everything above can
          still be edited.
        </p>
      ) : (
        <>
          <fieldset className="flex flex-col gap-2">
            <legend className={`${labelClass} mb-2`}>Winners</legend>
            <Segmented
              options={[
                { value: false, label: "One takes all" },
                { value: true, label: "Multiple winners" },
              ]}
              value={multiWinner}
              onChange={setMultiWinner}
            />
            {multiWinner && (
              <NumberField
                id={`${ids}-winners`}
                label="Number of winners"
                value={winnersText}
                onChange={setWinnersText}
                hint={`winners, each a different number (up to ${MAX_WINNERS})`}
              />
            )}
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className={`${labelClass} mb-2`}>Countdown</legend>
            <div className="flex flex-wrap gap-1.5">
              {DURATION_PRESETS.map((m) => (
                <Chip
                  key={m}
                  active={!customDuration && duration === m}
                  onClick={() => {
                    setCustomDuration(false);
                    setDurationText(String(m));
                  }}
                >
                  {m} min
                </Chip>
              ))}
              <Chip active={customDuration} onClick={() => setCustomDuration(true)}>
                Custom
              </Chip>
            </div>
            {customDuration && (
              <NumberField
                id={`${ids}-duration`}
                label="Countdown length in minutes"
                value={durationText}
                onChange={setDurationText}
                hint={`minutes, 1 to ${MAX_DURATION_MINUTES}`}
              />
            )}
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className={`${labelClass} mb-2`}>Start</legend>
            <Segmented
              options={[
                { value: "now" as const, label: "Right away" },
                { value: "later" as const, label: "Later" },
              ]}
              value={startMode}
              onChange={(mode) => {
                setStartMode(mode);
                // First switch to Later starts from a sensible time instead of an empty picker.
                if (mode === "later" && !startsAt) setStartsAt(toLocalInput(suggestedStart(Date.now())));
              }}
            />
            {startMode === "later" && (
              <div className="pop mt-2">
                <DateTimePicker value={startsAt} onChange={setStartsAt} />
              </div>
            )}
          </fieldset>
        </>
      )}

      {error && (
        <p role="alert" className="pop rounded-2xl bg-tomato-wash px-4 py-3 text-sm font-medium text-tomato-ink">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-4 pt-1">
        <button
          type="submit"
          className={`${buttonClass} w-full justify-between`}
          disabled={pending || !name.trim() || !ownerName.trim()}
        >
          <span>{pending ? "Saving…" : label}</span>
          <ArrowBadge />
        </button>
        {!rulesLocked && (
          <p className="text-[13px] leading-relaxed text-ink-2">
            Once the countdown starts, its length, start time and number of winners are locked.
          </p>
        )}
      </div>
    </form>
  );
}

function Chip({
  active,
  onClick,
  disabled,
  wide,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full py-2 text-sm tabular-nums transition-all duration-500 ease-spring active:scale-[0.97] disabled:opacity-35 ${
        wide ? "px-2" : "px-4"
      } ${active ? "bg-espresso text-[#fdfbf7]" : "bg-black/[0.04] text-ink-2 hover:bg-black/[0.07] hover:text-ink"}`}
    >
      {children}
    </button>
  );
}

function Segmented<T extends string | boolean>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const second = value === options[1].value;
  return (
    <div className="relative grid grid-cols-2 rounded-full bg-black/[0.045] p-1 ring-1 ring-black/[0.04]">
      <span
        aria-hidden
        className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-surface shadow-[0_1px_2px_rgba(42,33,28,0.08),0_6px_16px_-8px_rgba(42,33,28,0.2)] transition-transform duration-500 ease-spring ${
          second ? "translate-x-full" : ""
        }`}
      />
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`relative min-h-10 rounded-full px-2 text-sm font-medium transition-colors duration-500 ease-spring ${
            value === o.value ? "text-ink" : "text-ink-2 hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint: string;
}) {
  return (
    <div className="mt-2 flex items-center gap-3">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        autoComplete="off"
        aria-label={label}
        aria-describedby={`${id}-hint`}
        className={`${inputClass} w-28 tabular-nums`}
        value={value}
        onChange={(e) => onChange(digits(e.target.value))}
      />
      <span id={`${id}-hint`} className="text-sm text-ink-2">
        {hint}
      </span>
    </div>
  );
}
