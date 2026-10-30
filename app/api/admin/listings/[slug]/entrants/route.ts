import { requireListingAdmin } from "@/lib/admin-auth";
import { errorResponse } from "@/lib/api";
import { getEntrants } from "@/lib/listings";

// Admin: every pick with its name, visible to the admin while the draw runs.
export async function GET(req: Request, ctx: RouteContext<"/api/admin/listings/[slug]/entrants">) {
  try {
    const { slug } = await ctx.params;
    await requireListingAdmin(req, slug);
    return Response.json(await getEntrants(slug), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return errorResponse(err);
  }
}
