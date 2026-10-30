import { SuperadminOverview } from "@/components/admin/superadmin-overview";

export const metadata = { title: "Superadmin — Kivos", robots: { index: false, follow: false } };
export const instant = false;

export default function SuperadminPage() {
  return <SuperadminOverview />;
}
