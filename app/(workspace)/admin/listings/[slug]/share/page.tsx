import { AdminShareListing } from "@/components/admin/admin-share-listing";

// Same as app/l/[slug]/page.tsx: read route data at the top so the page arrives complete.
export const instant = false;

export default async function AdminSharePage({ params, searchParams }: PageProps<"/admin/listings/[slug]/share">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  return <AdminShareListing slug={slug} created={query.created === "1"} />;
}
