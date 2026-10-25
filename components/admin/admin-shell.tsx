"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { setAdminName, useAdminName, useMounted } from "@/lib/client";
import { ArrowBadge, Eyebrow, Shell, buttonClass, inputClass, labelClass } from "../ui";

/**
 * Frame for every admin page. Asks for the admin's name once per device, then
 * shows the admin bar. The name labels listings; it is not a password.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const mounted = useMounted();
  const admin = useAdminName();

  if (!mounted) return <div className="mx-auto mt-24 h-80 max-w-md animate-pulse rounded-[2rem] bg-black/[0.04]" />;
  if (!admin) return <NameGate />;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-[#fdfbf7]/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-3 sm:px-6">
          <Link href="/admin" className="mr-auto flex items-baseline gap-2">
            <span className="font-serif text-xl tracking-[-0.03em] text-ink">Alfreed</span>
            <span className="rounded-full bg-cobalt-wash px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-cobalt-ink">
              Admin
            </span>
          </Link>
          <Link
            href="/admin"
            className="hidden min-h-10 items-center rounded-full px-3 text-sm text-ink-2 hover:bg-black/[0.05] hover:text-ink sm:flex"
          >
            Dashboard
          </Link>
          <Link
            href="/"
            className="hidden min-h-10 items-center rounded-full px-3 text-sm text-ink-2 hover:bg-black/[0.05] hover:text-ink sm:flex"
          >
            View site
          </Link>
          <Link href="/admin/new" className={`${buttonClass} min-h-10 whitespace-nowrap py-1 pl-4 pr-1 text-sm`}>
            New listing
            <ArrowBadge />
          </Link>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl px-4 pt-3 text-right text-xs text-ink-2 sm:px-6">
        Signed in as <span className="font-medium text-ink">{admin}</span> ·{" "}
        <button type="button" className="underline underline-offset-2 hover:text-ink" onClick={() => setAdminName("")}>
          Switch
        </button>
      </div>
      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-4 sm:px-6 md:pt-8">{children}</main>
    </>
  );
}

function NameGate() {
  const id = useId();
  const [name, setName] = useState("");
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-4 py-16">
      <Shell innerClassName="flex flex-col gap-6 p-7 sm:p-9">
        <div className="flex flex-col items-start gap-4">
          <Eyebrow tone="cobalt">Admin</Eyebrow>
          <h1 className="font-serif text-4xl font-light leading-[1.05] tracking-[-0.035em] text-ink">Who&rsquo;s listing?</h1>
          <p className="text-ink-2">Enter your name to create and manage draws. It&rsquo;s remembered on this device.</p>
        </div>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) setAdminName(name);
          }}
        >
          <div className="flex flex-col gap-2">
            <label htmlFor={id} className={labelClass}>
              Your name
            </label>
            <input
              id={id}
              className={inputClass}
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              autoFocus
            />
          </div>
          <button type="submit" className={`${buttonClass} justify-between`} disabled={!name.trim()}>
            Continue
            <ArrowBadge />
          </button>
        </form>
      </Shell>
    </main>
  );
}
