import { SuperadminData } from "@/components/admin/superadmin-data";

export const instant = false;

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  return <SuperadminData>{children}</SuperadminData>;
}
