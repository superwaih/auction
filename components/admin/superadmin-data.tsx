"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { adminFetch, useAdminRole } from "@/lib/client";

export type Account = { id: string; name: string; username: string; role: string; draws: number };
export type Draw = { slug: string; name: string; adminId: string; adminName: string; status: string; endsAt: string };
export type Overview = {
  admins: Account[];
  listings: Draw[];
  stats: { admins: number; draws: number; entries: number; winners: number; live: number; scheduled: number; closed: number };
  updatedAt: string;
};
const OverviewContext = createContext<{ data: Overview | null; error: string; refreshing: boolean; reload: () => void } | null>(null);

export function SuperadminData({ children }: { children: React.ReactNode }) {
  const role = useAdminRole();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (role !== "superadmin") return;
    let active = true;
    async function load() {
      setRefreshing(true);
      try {
        const res = await adminFetch("/api/admin/overview");
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        if (active) { setData(result); setError(""); }
      } catch (error) { if (active) setError(error instanceof Error ? error.message : "Could not load overview."); }
      finally { if (active) setRefreshing(false); }
    }
    load();
    const timer = setInterval(load, 30000);
    return () => { active = false; clearInterval(timer); };
  }, [role, revision]);
  return <OverviewContext.Provider value={{ data, error, refreshing, reload: () => setRevision((n) => n + 1) }}>{children}</OverviewContext.Provider>;
}

export function useSuperadminData() {
  const value = useContext(OverviewContext);
  if (!value) throw new Error("SuperadminData must wrap the superadmin pages.");
  return value;
}
