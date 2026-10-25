"use client";

import { useId, useState } from "react";
import { adminFetch, toLocalInput } from "@/lib/client";
import { DEFAULT_DURATION_MINUTES, MAX_DURATION_MINUTES } from "@/lib/types";
import { DateTimePicker, suggestedStart } from "../date-time-picker";
import { inputClass, labelClass } from "../ui";

const PRESETS = [5, 10, 15, 30, 60];

/** New countdown and start for a closed draw nobody won. */
export function ReopenPanel({
  slug,
  previousMinutes,
  onDone,
  onCancel,
}: {
  slug: string;
  previousMinutes: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const id = useId();
  const initial = previousMinutes || DEFAULT_DURATION_MINUTES;
  const [durationText, setDurationText] = useState(String(initial));
  const [custom, setCustom] = useState(!PRESETS.includes(initial));
  const [startMode, setStartMode] = useState<"now" | "later">("now");
  const [startsAt, setStartsAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const duration = Number(durationText);

  async function reopen() {
    setError(null);
    if (!Number.isInteger(duration) || duration < 1 || duration > MAX_DURATION_MINUTES) {
      setError(`Enter a countdown between 1 and ${MAX_DURATION_MINUTES} minutes.`);
      return;
    }
    if (startMode === "later" && (!startsAt || new Date(startsAt).getTime() <= Date.now())) {
      setError("Pick a start time in the future.");
      return;
    }
    setPending(true);
    const res = await adminFetch(`/api/admin/listings/${slug}/reopen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        durationMinutes: duration,
        startMode,
        startsAt: startMode === "later" ? new Date(startsAt).toISOString() : "",
      }),
    });
    setPending(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Could not reopen the draw.");
      return;
    }
    onDone();
  }

  const chip = (active: boolean) =>
    `min-h-10 rounded-full px-4 text-sm tabular-nums transition-all duration-500 ease-spring active:scale-[0.97] ${
      active ? "bg-espresso text-[#fdfbf7]" : "bg-surface text-ink-2 ring-1 ring-black/[0.06] hover:text-ink"
    }`;

  return (
    <div className="pop flex flex-col gap-5 rounded-[1.75rem] bg-mint-wash p-5 ring-1 ring-mint/25 sm:p-6">
      <div>
        <h2 className="font-serif text-2xl font-light tracking-[-0.03em] text-ink">Reopen this draw</h2>
        <p className="mt-1 text-sm text-ink">
          Nobody picked last time. The board starts empty with the same name, photo, slots and winners.
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className={`${labelClass} mb-2`}>New countdown</legend>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={!custom && duration === m}
              className={chip(!custom && duration === m)}
              onClick={() => {
                setCustom(false);
                setDurationText(String(m));
              }}
            >
              {m} min
            </button>
          ))}
          <button type="button" aria-pressed={custom} className={chip(custom)} onClick={() => setCustom(true)}>
            Custom
          </button>
        </div>
        {custom && (
          <div className="mt-1 flex items-center gap-3">
            <input
              id={`${id}-d`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              aria-label="Countdown length in minutes"
              className={`${inputClass} w-28 bg-surface tabular-nums`}
              value={durationText}
              onChange={(e) => setDurationText(e.target.value.replace(/\D/g, ""))}
            />
            <span className="text-sm text-ink">minutes, 1 to {MAX_DURATION_MINUTES}</span>
          </div>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className={`${labelClass} mb-2`}>Start</legend>
        <div className="flex gap-1.5">
          {(["now", "later"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={startMode === m}
              className={chip(startMode === m)}
              onClick={() => {
                setStartMode(m);
                if (m === "later" && !startsAt) setStartsAt(toLocalInput(suggestedStart(Date.now())));
              }}
            >
              {m === "now" ? "Right away" : "Later"}
            </button>
          ))}
        </div>
        {startMode === "later" && (
          <div className="mt-2 rounded-[1.5rem] bg-surface p-3">
            <DateTimePicker value={startsAt} onChange={setStartsAt} />
          </div>
        )}
      </fieldset>

      {error && <p className="rounded-2xl bg-tomato-wash px-4 py-3 text-sm font-medium text-tomato-ink">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={reopen}
          className="min-h-11 rounded-full bg-espresso px-6 text-sm font-semibold text-[#fdfbf7] transition-transform active:scale-[0.97] disabled:opacity-50"
        >
          {pending ? "Reopening…" : startMode === "now" ? "Reopen now" : "Schedule reopen"}
        </button>
        <button type="button" className="min-h-11 px-3 text-sm text-ink hover:underline" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
