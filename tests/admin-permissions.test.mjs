import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { moduleCache: false, alias: {
  "server-only": new URL("../node_modules/server-only/empty.js", import.meta.url).pathname,
  "./mongodb": new URL("./fixtures/database.mjs", import.meta.url).pathname,
} });
const auth = await jiti.import("../lib/admin-auth.ts");
const accountId = new ObjectId();
const token = "a".repeat(64);
const request = () => new Request("https://kivos.test/api/admin/listings/prize", { headers: { cookie: `kivos-admin-session=${token}` } });

function database({ role = "admin", owner = accountId.toHexString(), expired = false, mustChangePassword = false } = {}) {
  globalThis.authTestDb = { collection(name) {
    return { async findOne(query) {
      if (name === "adminSessions") {
        assert.equal(query.tokenHash, auth.tokenHash(token));
        assert.ok(query.expiresAt.$gt instanceof Date);
        return expired ? null : { adminId: accountId };
      }
      if (name === "admins") return { _id: accountId, name: "An admin", role, mustChangePassword };
      if (name === "listings") return { createdById: owner };
      throw Error(name);
    } };
  } };
}

test("regular admins can manage their own draws but not other admins' draws", async () => {
  database();
  assert.equal((await auth.requireListingAdmin(request(), "prize")).id, accountId.toHexString());
  database({ owner: new ObjectId().toHexString() });
  await assert.rejects(auth.requireListingAdmin(request(), "prize"), { status: 403 });
  await assert.rejects(auth.requireSuperadmin(request()), { status: 403 });
});

test("superadmin can oversee another admin's draw", async () => {
  database({ role: "superadmin", owner: new ObjectId().toHexString() });
  assert.equal((await auth.requireListingAdmin(request(), "prize")).role, "superadmin");
  assert.equal((await auth.requireSuperadmin(request())).role, "superadmin");
});

test("expired sessions are rejected while initial-password accounts can manage their own draws", async () => {
  database({ expired: true });
  await assert.rejects(auth.requireAdmin(request()), { status: 401 });
  database({ mustChangePassword: true });
  assert.equal((await auth.requireAdmin(request())).id, accountId.toHexString());
});

test("legacy migration preserves changed passwords and assigns existing draws", async () => {
  const passwordHash = await auth.hashPassword("a-new-private-password");
  const admin = { _id: accountId, username: "existing admin", passwordHash };
  const listing = { _id: new ObjectId(), createdBy: "Existing Admin" };
  let assigned;
  globalThis.authTestDb = { collection(name) {
    if (name === "admins") return {
      async findOne() { return { username: "superadmin" }; },
      async findOneAndUpdate(query, update) {
        assert.equal(query.username, "existing admin");
        assert.deepEqual(Object.keys(update), ["$setOnInsert"]);
        assert.equal(await auth.verifyPassword("adminpassword", update.$setOnInsert.passwordHash), true);
        return admin;
      },
    };
    if (name === "listings") return {
      find() { return { async toArray() { return [listing]; } }; },
      async updateOne(query, update) { assert.equal(query._id, listing._id); assigned = update.$set.createdById; },
    };
    throw Error(name);
  } };
  await auth.migrateLegacyAdmins();
  assert.equal(assigned, accountId.toHexString());
  assert.equal(await auth.verifyPassword("a-new-private-password", admin.passwordHash), true);
});

test("setup seeds the requested superadmin only when absent", async () => {
  let seeded;
  globalThis.authTestDb = { collection(name) {
    if (name === "admins") return {
      async findOne(query) { assert.equal(query.username, "superadmin"); return null; },
      async updateOne(query, update, options) {
        assert.equal(query.username, "superadmin");
        assert.deepEqual(Object.keys(update), ["$setOnInsert"]);
        assert.equal(options.upsert, true);
        seeded = update.$setOnInsert;
      },
    };
    if (name === "listings") return { find() { return { async toArray() { return []; } }; } };
    throw Error(name);
  } };
  await auth.migrateLegacyAdmins();
  assert.equal(seeded.role, "superadmin");
  assert.equal(seeded.mustChangePassword, false);
  assert.equal(await auth.verifyPassword("superadmin", seeded.passwordHash), true);
});
