import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";

export const instant = false;
export const metadata: Metadata = { title: "Admin — Kivos", robots: { index: false, follow: false } };

// Both admin route trees share this shell, preserving the session and sidebar on navigation.
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
