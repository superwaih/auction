import { ObjectId } from "mongodb";
import { hashPassword, requireSuperadmin } from "@/lib/admin-auth";
import { errorResponse } from "@/lib/api";
import { getDb } from "@/lib/mongodb";
import { ListingError } from "@/lib/listings";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const acting = await requireSuperadmin(req);
    const { id } = await context.params;
    if (!ObjectId.isValid(id)) throw new ListingError("Admin not found.", 404);
    if (id === acting.id) throw new ListingError("Use Change password to update your own password.");
    const body = await req.json();
    if (typeof body.password !== "string" || body.password.length < 8 || body.password.length > 128) throw new ListingError("Use a temporary password of 8–128 characters.");
    const db = await getDb();
    const account = await db.collection("admins").findOne({ _id: new ObjectId(id) });
    if (!account || account.role === "superadmin") throw new ListingError("Choose a regular admin account.", 403);
    await db.collection("admins").updateOne({ _id: account._id }, { $set: { passwordHash: await hashPassword(body.password), mustChangePassword: false } });
    await db.collection("adminSessions").deleteMany({ adminId: account._id });
    return Response.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
