"use client";

import { useId, useState } from "react";
import { labelClass } from "./ui";

export function CopyField({ label, value }: { label: string; value: string }) {
  const id = useId();
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      (document.getElementById(id) as HTMLInputElement | null)?.select();
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="flex items-center gap-1 rounded-full bg-paper/70 p-1 pl-4 ring-1 ring-black/6">
        <input
          id={id}
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 bg-transparent py-2 text-base text-ink focus:outline-none sm:text-sm"
        />
        <button
          type="button"
          onClick={copy}
          className={`min-h-11 shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-all duration-500 ease-spring active:scale-[0.97] ${
            copied ? "bg-sage-wash text-sage-deep" : "bg-espresso text-[#fdfbf7] hover:bg-ink"
          }`}
        >
          <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
    </div>
  );
}
