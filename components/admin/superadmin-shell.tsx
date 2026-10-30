"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { HUES } from "@/lib/colors";

const navigation = [
  { label: "Overview", href: "/superadmin", icon: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" },
  { label: "Admins", href: "/superadmin/admins", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" },
  { label: "Draws", href: "/superadmin/draws", icon: "M4 4h16v16H4zM8 8h8M8 12h8M8 16h4" },
];
const settingsIcon = "M4 7h16M4 17h16M8 4v6M16 14v6";

function Icon({ path, className = "size-5" }: { path: string; className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} aria-hidden><path d={path} /></svg>;
}

function Wordmark({ compact = false }: { compact?: boolean }) {
  return compact ? (
    <span aria-label="Kivos" className="font-serif text-4xl leading-none tracking-[-0.06em] text-tomato">k<span className="text-cobalt">.</span></span>
  ) : (
    <span aria-label="Kivos" className="font-serif text-[38px] leading-none tracking-[-0.055em]">{"Kivos".split("").map((letter, index) => <span key={index} aria-hidden style={{ color: HUES[index].solid }}>{letter}</span>)}</span>
  );
}

export function SuperadminShell({ children, name, error, onSignOut }: { children: React.ReactNode; name: string; error: string; onSignOut: () => Promise<void> }) {
  const [collapsed, setCollapsed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const mobileMenu = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const current = navigation.find((item) => item.href === pathname)?.label ?? (pathname === "/admin/new" ? "Create draw" : pathname === "/admin/password" ? "Settings" : "Manage draw");
  const closeMenu = () => mobileMenu.current?.close();

  async function signOut() {
    setSigningOut(true);
    closeMenu();
    try { await onSignOut(); } finally { setSigningOut(false); }
  }

  function sidebar(compact: boolean, mobile = false) {
    const linkClass = (active: boolean) => `group flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm transition-colors ${compact ? "justify-center" : ""} ${active ? "bg-cobalt-wash font-semibold text-cobalt-ink" : "text-ink-2 hover:bg-surface hover:text-ink"}`;
    return (
      <>
        <div className={`flex h-24 shrink-0 items-center ${compact ? "justify-center" : "justify-between px-3"}`}>
          <Link href="/superadmin" onClick={closeMenu}><Wordmark compact={compact} /></Link>
          {!compact && <button type="button" aria-label={mobile ? "Close navigation" : "Collapse sidebar"} onClick={mobile ? closeMenu : () => setCollapsed(true)} className="flex size-11 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink">
            <Icon path={mobile ? "M6 6l12 12M18 6 6 18" : "M15 6l-6 6 6 6"} className="size-[18px]" />
          </button>}
        </div>

        {!compact && <div className="mb-7 px-3"><div className="flex items-center gap-2 text-sm font-medium text-ink"><span className="size-1.5 rounded-full bg-cobalt" aria-hidden />Superadmin workspace</div><p className="mt-1 pl-3.5 text-xs text-muted">Manage every draw, in one place.</p></div>}
        <Link href="/admin/new" onClick={closeMenu} aria-label={compact ? "Create a draw" : undefined} title={compact ? "Create a draw" : undefined} className={`mb-7 flex min-h-12 shrink-0 items-center rounded-xl bg-espresso text-sm font-medium text-canvas transition-colors hover:bg-ink ${compact ? "justify-center" : "justify-between pl-4 pr-2"}`}>
          {!compact && "Create a draw"}<span className={`flex size-8 items-center justify-center rounded-full ${compact ? "text-marigold" : "bg-marigold text-ink"}`}><Icon path="M12 5v14M5 12h14" className="size-[18px]" /></span>
        </Link>

        <nav aria-label={mobile ? "Mobile superadmin navigation" : "Superadmin navigation"} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {!compact && <p className="mb-2 px-3 text-xs text-muted">Manage</p>}
          <div className="space-y-1">{navigation.map(({ label, href, icon }) => {
            const active = pathname === href || (href === "/superadmin/draws" && pathname.startsWith("/admin/listings/"));
            return <Link key={href} href={href} aria-current={active ? "page" : undefined} aria-label={compact ? label : undefined} title={compact ? label : undefined} onClick={closeMenu} className={linkClass(active)}><Icon path={icon} />{!compact && <><span className="flex-1">{label}</span>{active && <Icon path="m9 6 6 6-6 6" className="size-3.5" />}</>}</Link>;
          })}</div>
          <div className="mt-8 space-y-1">
            {!compact && <p className="mb-2 px-3 text-xs text-muted">Workspace</p>}
            <Link href="/admin/password" onClick={closeMenu} aria-current={pathname === "/admin/password" ? "page" : undefined} aria-label={compact ? "Settings" : undefined} title={compact ? "Settings" : undefined} className={linkClass(pathname === "/admin/password")}><Icon path={settingsIcon} />{!compact && "Settings"}</Link>
            <Link href="/" onClick={closeMenu} aria-label={compact ? "View public site" : undefined} title={compact ? "View public site" : undefined} className={linkClass(false)}><Icon path="M14 3h7v7M21 3 10 14M10 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6" />{!compact && "View public site"}</Link>
          </div>
        </nav>

        <div className="mt-6 shrink-0 border-t border-ink/10 pt-4">
          {compact ? <>
            <button type="button" aria-label="Expand sidebar" title="Expand sidebar" onClick={() => setCollapsed(false)} className="mb-3 flex min-h-11 w-full items-center justify-center rounded-xl text-muted hover:bg-surface"><Icon path="m9 6 6 6-6 6" /></button>
            <button type="button" aria-label="Sign out" title={`Sign out ${name}`} disabled={signingOut} onClick={signOut} className="flex min-h-11 w-full items-center justify-center rounded-xl text-ink-2 hover:bg-tomato-wash hover:text-tomato-ink disabled:opacity-50"><Icon path="M9 3H4v18h5M14 8l5 4-5 4M8 12h11" /></button>
          </> : <div className="rounded-xl bg-surface p-3">
            <div className="flex items-center gap-3"><span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mint-wash font-medium text-mint-ink">{name.trim().charAt(0).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{name}</p><p className="text-xs text-muted">Superadmin</p></div></div>
            <button type="button" disabled={signingOut} onClick={signOut} className="mt-3 flex min-h-11 w-full items-center justify-between rounded-lg px-2 text-sm text-ink-2 hover:bg-tomato-wash hover:text-tomato-ink disabled:opacity-50">{signingOut ? "Signing out…" : "Sign out"}<Icon path="M9 3H4v18h5M14 8l5 4-5 4M8 12h11" className="size-[18px]" /></button>
          </div>}
        </div>
      </>
    );
  }

  return (
    <div className={`min-h-dvh bg-canvas text-ink md:grid ${collapsed ? "md:grid-cols-[88px_minmax(0,1fr)]" : "md:grid-cols-[272px_minmax(0,1fr)]"}`}>
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-ink/10 bg-paper px-4 pb-4 md:flex">{sidebar(collapsed)}</aside>
      <dialog ref={mobileMenu} aria-label="Superadmin navigation" className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[min(320px,90vw)] max-w-none border-0 bg-paper p-4 pt-0 text-ink backdrop:bg-ink/35" onClick={(event) => { if (event.target === event.currentTarget && event.clientX > event.currentTarget.getBoundingClientRect().right) closeMenu(); }}>
        <div className="flex h-full flex-col">{sidebar(false, true)}</div>
      </dialog>
      <div className="min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-ink/10 bg-surface px-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3"><button type="button" aria-label="Open navigation" aria-haspopup="dialog" onClick={() => mobileMenu.current?.showModal()} className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-paper text-ink md:hidden"><Icon path="M4 6h16M4 12h16M4 18h16" /></button><p className="truncate text-sm"><span className="hidden text-muted sm:inline">Workspace<span className="mx-3">/</span></span>{current}</p></div>
          <span className="rounded-full bg-mint-wash px-3 py-1 text-xs font-medium text-mint-ink">Superadmin</span>
        </header>
        <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-8">
          {error && <p role="alert" className="mb-4 rounded-md bg-rose-wash p-4 text-rose">{error}</p>}
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
