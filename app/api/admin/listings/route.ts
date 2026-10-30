import { requireAdmin } from "@/lib/admin-auth";
import type { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api";
import { listAdminListings } from "@/lib/listings";

// Dashboard list: ?scope=mine (default) for this admin's listings, ?scope=all for everyone's.
export async function GET(req: NextRequest) {
  // Read outside the try: this access is how Next knows to render per request, and catching it breaks that.
  const scope = req.nextUrl.searchParams.get("scope");
  try {
    const admin = await requireAdmin(req);
    return Response.json(await listAdminListings(admin.role === "superadmin" && scope === "all" ? null : admin.id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
