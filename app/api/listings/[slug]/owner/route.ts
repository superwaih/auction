import { errorResponse, ownerKeyFrom } from "@/lib/api";
import { verifyOwner } from "@/lib/listings";

// Lets the manage page confirm its owner link before showing the edit form.
export async function POST(req: Request, ctx: RouteContext<"/api/listings/[slug]/owner">) {
  try {
    const { slug } = await ctx.params;
    await verifyOwner(slug, ownerKeyFrom(req));
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
