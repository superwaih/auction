import { AdminEditListing } from "@/components/admin/admin-edit-listing";

// Same as app/l/[slug]/page.tsx: read the slug at the top so the page arrives complete.
export const instant = false;

export default async function AdminEditPage({ params }: PageProps<"/admin/listings/[slug]">) {
  const { slug } = await params;
  return <AdminEditListing slug={slug} />;
}
