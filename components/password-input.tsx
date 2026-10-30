"use client";

import { useState, type InputHTMLAttributes } from "react";
import { inputClass } from "./ui";

export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={`${inputClass} ${props.className ?? ""} pr-14`} />
      <button type="button" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} disabled={props.disabled} className="absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-xl text-ink-2 hover:text-ink disabled:opacity-40" onClick={() => setVisible(!visible)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5" aria-hidden>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="m3 3 18 18" />}
        </svg>
      </button>
    </div>
  );
}
