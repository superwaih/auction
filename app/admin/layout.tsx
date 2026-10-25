import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";

// The admin area renders on the client behind the name screen, so there's nothing for
// Next's instant-navigation check to validate; opting out silences its dev warning.
export const instant = false;

export const metadata: Metadata = {
  title: "Admin — Alfreed",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <AdminShell>{children}</AdminShell>;
}
