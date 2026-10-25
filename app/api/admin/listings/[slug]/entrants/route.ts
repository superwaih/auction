import { adminNameFrom, errorResponse } from "@/lib/api";
import { getEntrants } from "@/lib/listings";

// Admin: every pick with its name, visible to the admin while the draw runs.
export async function GET(req: Request, ctx: RouteContext<"/api/admin/listings/[slug]/entrants">) {
  try {
    const { slug } = await ctx.params;
    adminNameFrom(req);
    return Response.json(await getEntrants(slug), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return errorResponse(err);
  }
}
