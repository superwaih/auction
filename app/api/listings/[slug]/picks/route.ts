import { errorResponse } from "@/lib/api";
import { pickNumber } from "@/lib/listings";

export async function POST(req: Request, ctx: RouteContext<"/api/listings/[slug]/picks">) {
  try {
    const { slug } = await ctx.params;
    const body = await req.json();
    await pickNumber(slug, {
      number: Number(body.number),
      name: String(body.name ?? ""),
      clientId: String(body.clientId ?? ""),
    });
    return Response.json({ ok: true }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
