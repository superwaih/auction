"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SuperadminShell } from "./superadmin-shell";
import { PasswordInput } from "../password-input";
import { useEffect, useId, useState } from "react";
import { setAdminName, useAdminName, useAdminRole } from "@/lib/client";
import { ArrowBadge, Eyebrow, Shell, buttonClass, inputClass, labelClass } from "../ui";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const admin = useAdminName();
  const role = useAdminRole();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not check your session. Refresh to try again.");
        return res.json();
      })
      .then(({ admin }) => {
        setAdminName(admin?.name ?? "", admin?.role);
      })
      .catch((error) => setError(error.message))
      .finally(() => setLoading(false));
  }, []);

  async function signOut() {
    setError("");
    try {
      const response = await fetch("/api/admin/session", { method: "DELETE" });
      if (!response.ok) throw new Error("Could not sign out. Please try again.");
      setAdminName("");
    } catch (error) { setError(error instanceof Error ? error.message : "Could not sign out."); }
  }

  if (loading) return <p role="status" className="mx-auto mt-24 max-w-md px-4">Checking your session…</p>;
  if (!admin) return <AccountGate changePassword={false} initialError={error} onSuccess={(name, role) => { setAdminName(name, role); setError(""); }} />;

  if (role === "superadmin") return <SuperadminShell name={admin} error={error} onSignOut={signOut}>{children}</SuperadminShell>;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-[#fdfbf7]/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-3 sm:px-6">
          <Link href="/admin" className="mr-auto flex shrink-0 items-baseline gap-2">
            <span className="font-serif text-xl tracking-[-0.03em] text-ink">Kivos</span>
            <span className="rounded-full bg-cobalt-wash px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-cobalt-ink">
              Admin
            </span>
          </Link>
          <Link
            href="/admin"
            className="hidden min-h-10 items-center rounded-full px-3 text-sm text-ink-2 hover:bg-black/[0.05] hover:text-ink sm:flex"
          >
            Draws
          </Link>
          <Link
            href="/"
            className="hidden min-h-10 items-center rounded-full px-3 text-sm text-ink-2 hover:bg-black/[0.05] hover:text-ink sm:flex"
          >
            View site
          </Link>
          {role === "superadmin" && <Link href="/superadmin" className="flex min-h-11 items-center px-3 text-sm">Overview</Link>}
          <Link
            href="/admin/new"
            className={`${buttonClass} min-h-10 shrink-0 whitespace-nowrap px-4 py-1 text-sm sm:pl-4 sm:pr-1`}
          >
            New listing
            <span className="hidden sm:contents">
              <ArrowBadge />
            </span>
          </Link>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl px-4 pt-3 text-right text-xs text-ink-2 sm:px-6">
        <Link href="/admin/password" className="mr-4 underline underline-offset-2">Change password</Link>
        Signed in as <span className="font-medium text-ink">{admin}</span> ·{" "}
        <button type="button" className="underline underline-offset-2 hover:text-ink" onClick={signOut}>
          Sign out
        </button>
      </div>
      {error && <p role="alert" className="mx-auto max-w-6xl px-4 text-rose">{error}</p>}
      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-4 sm:px-6 md:pt-8">{children}</main>
    </>
  );
}

function AccountGate({ changePassword, initialError, onSuccess }: { changePassword: boolean; initialError: string; onSuccess: (name: string, role: string) => void }) {
  const Container = changePassword ? "section" : "main";
  const id = useId();
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Container className={`mx-auto flex w-full max-w-md flex-col justify-center px-4 py-16 ${changePassword ? "" : "min-h-[100dvh]"}`}>
      <Shell innerClassName="flex flex-col gap-6 p-7 sm:p-9">
        <div className="flex flex-col items-start gap-4">
          <Eyebrow tone="cobalt">Admin</Eyebrow>
          <h1 className="font-serif text-4xl font-light leading-[1.05] tracking-[-0.035em] text-ink">
            {changePassword ? "Choose a new password" : signup ? "Create your account" : "Sign in"}
          </h1>
          <p className="text-ink-2">{changePassword ? "Enter your current password and choose a new one." : signup ? "Create an admin account to list prizes and run your own draws." : "Sign in to create and manage your draws. Existing admins can use their previous admin name as their username."}</p>
        </div>
        <form key={`${signup}-${changePassword}`} className="flex flex-col gap-4" onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setBusy(true);
          setError("");
          try {
            const response = await fetch("/api/admin/session", {
              method: changePassword ? "PATCH" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mode: signup ? "signup" : "login", name: form.get("name"), username: form.get("username"), password: form.get("password"), currentPassword: form.get("currentPassword") }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error ?? "Could not sign in. Please try again.");
            onSuccess(result.admin.name, result.admin.role);
          } catch (error) { setError(error instanceof Error ? error.message : "Could not connect. Please try again."); }
          finally { setBusy(false); }
        }}>
          {signup && !changePassword && <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-name`} className={labelClass}>Your name</label>
            <input id={`${id}-name`} name="name" className={inputClass} maxLength={60} autoComplete="name" required disabled={busy} />
          </div>}
          {!changePassword && <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-username`} className={labelClass}>Username</label>
            <input id={`${id}-username`} name="username" className={inputClass} maxLength={60} autoComplete="username" autoCapitalize="none" required disabled={busy} />
          </div>}
          {changePassword && <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-current`} className={labelClass}>Current password</label>
            <PasswordInput id={`${id}-current`} name="currentPassword" className={inputClass} maxLength={128} autoComplete="current-password" required disabled={busy} />
          </div>}
          <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-password`} className={labelClass}>{changePassword ? "New password" : "Password"}</label>
            <PasswordInput id={`${id}-password`} name="password" className={inputClass} minLength={signup || changePassword ? 8 : undefined} maxLength={128} autoComplete={signup || changePassword ? "new-password" : "current-password"} aria-describedby={signup || changePassword ? `${id}-hint` : undefined} required disabled={busy} />
            {(signup || changePassword) && <p id={`${id}-hint`} className="text-sm text-ink-2">Use 8–128 characters.</p>}
          </div>
          {(error || initialError) && <p role="alert" className="text-sm text-rose">{error || initialError}</p>}
          <button type="submit" className={`${buttonClass} justify-between`} disabled={busy}>
            {busy ? "Please wait…" : changePassword ? "Save password" : signup ? "Create account" : "Sign in"}<ArrowBadge />
          </button>
        </form>
        {!changePassword && <button type="button" disabled={busy} className="min-h-11 text-sm underline underline-offset-4" onClick={() => { setSignup(!signup); setError(""); }}>
          {signup ? "Already an admin? Sign in" : "New here? Create an account"}
        </button>}
        <Link href={changePassword ? "/admin" : "/"} className="text-sm underline underline-offset-4">{changePassword ? "Cancel" : "Back to Kivos"}</Link>
      </Shell>
    </Container>
  );
}

export function AdminPasswordForm() {
  const router = useRouter();
  return <AccountGate changePassword initialError="" onSuccess={(name, role) => {
    setAdminName(name, role);
    router.push("/admin");
  }} />;
}
