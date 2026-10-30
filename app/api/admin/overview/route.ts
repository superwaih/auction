import { requireSuperadmin } from "@/lib/admin-auth";
import { errorResponse } from "@/lib/api";
import { getDb } from "@/lib/mongodb";

export async function GET(req: Request) {
  try {
    await requireSuperadmin(req);
    const db = await getDb();
    const [admins, draws, entries] = await Promise.all([
      db.collection("admins").find({}, { projection: { name: 1, username: 1, role: 1, mustChangePassword: 1 } }).sort({ name: 1 }).toArray(),
      db.collection("listings").find({}, { projection: { slug: 1, name: 1, createdBy: 1, createdById: 1, startsAt: 1, endsAt: 1, winningNumbers: 1, winningNumber: 1 } }).sort({ createdAt: -1 }).toArray(),
      db.collection("picks").countDocuments(),
    ]);
    const now = new Date();
    const listings = draws.map((draw) => ({
      slug: draw.slug, name: draw.name, adminId: draw.createdById ?? "", adminName: draw.createdBy ?? "Unassigned",
      status: now < draw.startsAt ? "scheduled" : now < draw.endsAt ? "live" : "ended",
      endsAt: draw.endsAt.toISOString(),
    }));
    return Response.json({
      admins: admins.map((admin) => ({ id: admin._id.toHexString(), name: admin.name, username: admin.username, role: admin.role ?? "admin", mustChangePassword: false, draws: listings.filter((draw) => draw.adminId === admin._id.toHexString()).length })),
      listings,
      stats: { admins: admins.length, draws: listings.length, entries, live: listings.filter((draw) => draw.status === "live").length, scheduled: listings.filter((draw) => draw.status === "scheduled").length, closed: listings.filter((draw) => draw.status === "ended").length, winners: draws.reduce((sum, draw) => sum + (draw.winningNumbers?.length ?? (draw.winningNumber ? 1 : 0)), 0) },
      updatedAt: now.toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
