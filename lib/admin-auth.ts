import "server-only";
import { createHash, randomBytes, scrypt as derive, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import { ListingError } from "./listings";

const scrypt = promisify(derive);
export const SESSION_COOKIE = "kivos-admin-session";
export const SESSION_SECONDS = 60 * 60 * 24 * 7;
export const sessionOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/", maxAge: SESSION_SECONDS };
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, hex] = stored.split(":");
  const expected = Buffer.from(hex, "hex");
  const actual = await scrypt(password, salt, 64) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function checkOrigin(req: Request) {
  if (!["GET", "HEAD"].includes(req.method) && req.headers.get("origin") !== new URL(req.url).origin) {
    throw new ListingError("This request is not allowed.", 403);
  }
}

export function sessionToken(req: Request) {
  return req.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
}

export async function getAdminSession(req: Request) {
  checkOrigin(req);
  const token = sessionToken(req);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const db = await getDb();
  const session = await db.collection<{ tokenHash: string; adminId: ObjectId; expiresAt: Date }>("adminSessions")
    .findOne({ tokenHash: tokenHash(token), expiresAt: { $gt: new Date() } });
  if (!session) return null;
  const admin = await db.collection<{ name: string; username: string; mustChangePassword?: boolean; role?: "admin" | "superadmin" }>("admins").findOne({ _id: session.adminId });
  return admin ? { id: admin._id.toHexString(), name: admin.name, role: admin.role ?? "admin", mustChangePassword: false } : null;
}

export async function requireAdmin(req: Request) {
  const admin = await getAdminSession(req);
  if (!admin) throw new ListingError("Sign in to your admin account to continue.", 401);
  return admin;
}

export async function requireListingAdmin(req: Request, slug: string) {
  const admin = await requireAdmin(req);
  const listing = await (await getDb()).collection("listings").findOne({ slug }, { projection: { createdById: 1 } });
  if (!listing) throw new ListingError("Listing not found.", 404);
  if (admin.role !== "superadmin" && listing.createdById !== admin.id) throw new ListingError("Only the account that created this draw can manage it.", 403);
  return admin;
}

/** Migrate named admins once without ever resetting an existing password. */
export async function migrateLegacyAdmins() {
  const db = await getDb();
  if (!await db.collection("admins").findOne({ username: "superadmin" })) {
    await db.collection("admins").updateOne(
      { username: "superadmin" },
      { $setOnInsert: { name: "Superadmin", role: "superadmin", passwordHash: await hashPassword("superadmin"), mustChangePassword: false } },
      { upsert: true },
    );
  }
  const legacy = await db.collection("listings").find({ createdById: { $exists: false }, createdBy: { $type: "string", $ne: "" } }, { projection: { createdBy: 1 } }).toArray();
  if (!legacy.length) return;
  const passwordHash = await hashPassword("adminpassword");
  for (const listing of legacy) {
    const name = listing.createdBy.trim();
    if (!name) continue;
    const username = name.toLowerCase();
    const admin = await db.collection("admins").findOneAndUpdate(
      { username },
      { $setOnInsert: { name, role: "admin", passwordHash, mustChangePassword: false } },
      { upsert: true, returnDocument: "after" },
    );
    if (admin) await db.collection("listings").updateOne(
      { _id: listing._id, createdById: { $exists: false } },
      { $set: { createdById: admin._id.toHexString() } },
    );
  }
}

export async function requireSuperadmin(req: Request) {
  const admin = await requireAdmin(req);
  if (admin.role !== "superadmin") throw new ListingError("Superadmin access is required.", 403);
  return admin;
}
