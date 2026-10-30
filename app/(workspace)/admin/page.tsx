// This page is rendered after the shared client session gate.
export const instant = false;

import { AdminDashboard } from "@/components/admin/admin-dashboard";

export default function AdminPage() {
  return <AdminDashboard />;
}
