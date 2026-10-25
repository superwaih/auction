import { adminNameFrom, errorResponse } from "@/lib/api";
import { reopenListing } from "@/lib/listings";

// Admin: run a closed, winner-less draw again with a new countdown.
export async function POST(req: Request, ctx: RouteContext<"/api/admin/listings/[slug]/reopen">) {
  try {
    const { slug } = await ctx.params;
    adminNameFrom(req);
    const body = await req.json().catch(() => ({}));
    await reopenListing(slug, {
      durationMinutes: Number(body.durationMinutes),
      startMode: body.startMode === "later" ? "later" : "now",
      startsAt: String(body.startsAt ?? ""),
    });
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
