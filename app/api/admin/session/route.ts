import { randomBytes } from "node:crypto";
import { MongoServerError, ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { checkOrigin, migrateLegacyAdmins, getAdminSession, hashPassword, verifyPassword, sessionToken, tokenHash, SESSION_COOKIE, SESSION_SECONDS, sessionOptions } from "@/lib/admin-auth";
import { getDb } from "@/lib/mongodb";
import { errorResponse } from "@/lib/api";
import { ListingError } from "@/lib/listings";

export async function GET(req: Request) {
  try {
    return NextResponse.json({ admin: await getAdminSession(req) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const input = await req.json();
    const username = typeof input.username === "string" ? input.username.trim().toLowerCase() : "";
    const password = typeof input.password === "string" ? input.password : "";
    const name = typeof input.name === "string" ? input.name.trim() : "";
    if (!["signup", "login"].includes(input.mode)) throw new ListingError("Choose sign in or create account.");
    if (!username || username.length > 60) throw new ListingError("Enter a username of up to 60 characters.");
    if (!password || password.length > 128) throw new ListingError("Enter a password of at most 128 characters.");
    const db = await getDb();
    await migrateLegacyAdmins();
    // Shared database counter keeps login limits effective across app instances.
    const bucket = Math.floor(Date.now() / (15 * 60_000));
    const attempt = await db.collection("adminAuthAttempts").findOneAndUpdate(
      { key: `${username}:${bucket}` },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(Date.now() + 30 * 60_000) } },
      { upsert: true, returnDocument: "after" },
    );
    if (attempt && attempt.count > 10) throw new ListingError("Too many attempts. Try again in 15 minutes.", 429);
    const admins = db.collection<{ name: string; username: string; passwordHash: string; mustChangePassword?: boolean; role?: "admin" | "superadmin" }>("admins");
    let admin;
    if (input.mode === "signup") {
      if (!name || name.length > 60) throw new ListingError("Enter a name of up to 60 characters.");
      if (password.length < 8) throw new ListingError("Use at least 8 characters for your password.");
      const passwordHash = await hashPassword(password);
      try {
        const result = await admins.insertOne({ name, username, passwordHash, role: "admin" });
        admin = { _id: result.insertedId, name, role: "admin" as const, mustChangePassword: false };
      } catch (error) {
        if (error instanceof MongoServerError && error.code === 11000) throw new ListingError("That username is unavailable.", 409);
        throw error;
      }
    } else {
      const found = await admins.findOne({ username });
      // Do the same password work for unknown usernames.
      const fallback = "00000000000000000000000000000000:" + "00".repeat(64);
      const valid = await verifyPassword(password, found?.passwordHash ?? fallback);
      if (!found || !valid) throw new ListingError("Incorrect username or password.", 401);
      admin = found;
    }
    const oldToken = sessionToken(req);
    if (oldToken) await db.collection("adminSessions").deleteOne({ tokenHash: tokenHash(oldToken) });
    const token = randomBytes(32).toString("hex");
    await db.collection("adminSessions").insertOne({ tokenHash: tokenHash(token), adminId: admin._id, expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000) });
    const response = NextResponse.json({ admin: { id: admin._id.toHexString(), name: admin.name, role: admin.role ?? "admin", mustChangePassword: false } }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(SESSION_COOKIE, token, sessionOptions);
    return response;
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(req: Request) {
  try {
    checkOrigin(req);
    const token = sessionToken(req);
    if (token) await (await getDb()).collection("adminSessions").deleteOne({ tokenHash: tokenHash(token) });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, "", { ...sessionOptions, maxAge: 0 });
    return response;
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(req: Request) {
  try {
    const admin = await getAdminSession(req);
    if (!admin) throw new ListingError("Sign in to continue.", 401);
    const input = await req.json();
    const password = typeof input.password === "string" ? input.password : "";
    if (password.length < 8 || password.length > 128 || password === "adminpassword") {
      throw new ListingError("Choose a new password of 8–128 characters.");
    }
    const db = await getDb();
    const account = await db.collection("admins").findOne({ _id: new ObjectId(admin.id) });
    if (typeof input.currentPassword !== "string" || input.currentPassword.length > 128 || !account || !await verifyPassword(input.currentPassword, account.passwordHash)) {
      throw new ListingError("Current password is incorrect.", 400);
    }
    await db.collection("admins").updateOne({ _id: account._id }, { $set: { passwordHash: await hashPassword(password), mustChangePassword: false } });
    await db.collection("adminSessions").deleteMany({ adminId: account._id });
    const token = randomBytes(32).toString("hex");
    await db.collection("adminSessions").insertOne({ tokenHash: tokenHash(token), adminId: account._id, expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000) });
    const response = NextResponse.json({ admin: { ...admin, mustChangePassword: false } }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(SESSION_COOKIE, token, sessionOptions);
    return response;
  } catch (error) { return errorResponse(error); }
}
