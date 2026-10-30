import assert from "node:assert/strict";
import { test } from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { alias: { "server-only": new URL("../node_modules/server-only/empty.js", import.meta.url).pathname } });
const auth = await jiti.import("../lib/admin-auth.ts");

test("passwords are salted and only the correct password verifies", async () => {
  const first = await auth.hashPassword("adminpassword");
  const second = await auth.hashPassword("adminpassword");
  assert.notEqual(first, second);
  assert.equal(first.includes("adminpassword"), false);
  assert.equal(await auth.verifyPassword("adminpassword", first), true);
  assert.equal(await auth.verifyPassword("wrong-password", first), false);
});

test("a forged legacy name header does not grant access", async () => {
  const request = new Request("https://kivos.test/api/admin/listings", { headers: { "x-admin-name": "Owner" } });
  assert.equal(await auth.getAdminSession(request), null);
  await assert.rejects(auth.requireAdmin(request), { status: 401 });
  await assert.rejects(auth.requireListingAdmin(request, "a-prize"), { status: 401 });
});

test("malformed session cookies cannot authenticate", async () => {
  const request = new Request("https://kivos.test/api/admin/listings", { headers: { cookie: "kivos-admin-session=forged" } });
  assert.equal(await auth.getAdminSession(request), null);
});

test("cross-origin writes and writes without an origin are rejected", () => {
  for (const origin of [undefined, "https://other.test"]) {
    const request = new Request("https://kivos.test/api/admin/session", { method: "POST", headers: origin ? { origin } : {} });
    assert.throws(() => auth.checkOrigin(request), { status: 403 });
  }
  assert.doesNotThrow(() => auth.checkOrigin(new Request("https://kivos.test/api/admin/session", {
    method: "POST", headers: { origin: "https://kivos.test" },
  })));
});

test("session cookies are HttpOnly and restricted to same-site requests", () => {
  assert.equal(auth.sessionOptions.httpOnly, true);
  assert.equal(auth.sessionOptions.sameSite, "strict");
  assert.equal(auth.sessionOptions.path, "/");
  assert.equal(auth.SESSION_SECONDS, 604800);
});
