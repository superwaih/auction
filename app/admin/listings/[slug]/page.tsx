import { Suspense } from "react";
import { AdminEditListing } from "@/components/admin/admin-edit-listing";

export default function AdminListingPage({ params, searchParams }: PageProps<"/admin/listings/[slug]">) {
  return (
    <Suspense fallback={<div className="h-[32rem] animate-pulse rounded-[2rem] bg-black/[0.04]" />}>
      <Edit params={params} searchParams={searchParams} />
    </Suspense>
  );
}

// Await route data inside the boundary (see app/l/[slug]/page.tsx for why).
async function Edit({
  params,
  searchParams,
}: Pick<PageProps<"/admin/listings/[slug]">, "params" | "searchParams">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  return <AdminEditListing slug={slug} created={query.created === "1"} />;
}
