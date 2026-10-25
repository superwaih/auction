import { adminNameFrom, errorResponse } from "@/lib/api";
import { endListingNow } from "@/lib/listings";

// Admin: end a live draw now and draw its winners.
export async function POST(req: Request, ctx: RouteContext<"/api/admin/listings/[slug]/end">) {
  try {
    const { slug } = await ctx.params;
    adminNameFrom(req);
    await endListingNow(slug);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
