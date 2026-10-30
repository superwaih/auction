import { AdminEntrants } from "@/components/admin/admin-entrants";

// Same as app/l/[slug]/page.tsx: read the slug at the top so the page arrives complete.
export const instant = false;

export default async function AdminEntrantsPage({ params }: PageProps<"/admin/listings/[slug]/entrants">) {
  const { slug } = await params;
  return <AdminEntrants slug={slug} />;
}
