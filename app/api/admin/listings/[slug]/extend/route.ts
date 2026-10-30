import { requireListingAdmin } from "@/lib/admin-auth";
import { errorResponse } from "@/lib/api";
import { extendListing } from "@/lib/listings";

// Admin: add minutes to a live draw's countdown.
export async function POST(req: Request, ctx: RouteContext<"/api/admin/listings/[slug]/extend">) {
  try {
    const { slug } = await ctx.params;
    await requireListingAdmin(req, slug);
    const body = await req.json().catch(() => ({}));
    await extendListing(slug, Number(body.minutes));
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
