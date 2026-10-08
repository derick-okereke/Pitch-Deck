import assert from "node:assert/strict";
import test from "node:test";
import { authEntryRole, canReuseAuthSession, founderEntryHref, postAuthDestination, safeAuthNext } from "../src/lib/auth-redirect.ts";

test("homepage founder actions send investors and visitors to founder signup", () => {
  const signup = "/auth/sign-up?role=founder&next=/simulator/new";
  assert.equal(founderEntryHref({ role: "investor", organizationName: "Fund" }), signup);
  assert.equal(founderEntryHref({ role: "investor", organizationName: null }), signup);
  assert.equal(founderEntryHref(null), signup);
  assert.equal(founderEntryHref({ role: "founder", organizationName: "Startup" }), "/simulator/new");
  assert.equal(founderEntryHref({ role: "founder", organizationName: null }), "/onboarding");
});

test("role-specific auth pages remain accessible with an opposite-role session", () => {
  for (const next of ["/simulator/new", "/founder", "/founder/profile/edit"]) {
    const role = authEntryRole(undefined, next);
    assert.equal(role, "founder");
    assert.equal(canReuseAuthSession("investor", role), false);
    assert.equal(canReuseAuthSession("founder", role), true);
  }
  for (const next of ["/discover", "/investor/profile"]) {
    const role = authEntryRole(undefined, next);
    assert.equal(role, "investor");
    assert.equal(canReuseAuthSession("founder", role), false);
    assert.equal(canReuseAuthSession("investor", role), true);
  }
  assert.equal(canReuseAuthSession("investor", authEntryRole("founder")), false);
  assert.equal(canReuseAuthSession("founder", authEntryRole("investor")), false);
  assert.equal(canReuseAuthSession("investor", authEntryRole(undefined, "/inbox")), true);
  assert.equal(canReuseAuthSession("founder", authEntryRole("unknown")), true);
});

test("allows only known same-origin authentication destinations", () => {
  assert.equal(safeAuthNext("/simulator/new"), "/simulator/new");
  assert.equal(safeAuthNext("/founder/profile/edit"), "/founder/profile/edit");
  assert.equal(safeAuthNext("/investor/profile"), "/investor/profile");
  assert.equal(safeAuthNext("/inbox"), "/inbox");
  assert.equal(safeAuthNext("https://attacker.example"), null);
  assert.equal(safeAuthNext("//attacker.example"), null);
  assert.equal(safeAuthNext("/unknown"), null);
});

test("returns an authenticated founder to the requested founder task", () => {
  assert.equal(
    postAuthDestination({ role: "founder", organizationName: "Korah" }, "/simulator/new"),
    "/simulator/new",
  );
});

test("keeps actor-incompatible destinations out of the signed-in flow", () => {
  assert.equal(postAuthDestination({ role: "investor", organizationName: "Fund" }, "/simulator/new"), "/discover");
  assert.equal(postAuthDestination({ role: "investor", organizationName: "Fund" }, "/investor/profile"), "/investor/profile");
  assert.equal(postAuthDestination({ role: "investor", organizationName: "Fund" }, "/inbox"), "/inbox");
  assert.equal(postAuthDestination({ role: "founder", organizationName: "Korah" }, "/discover"), "/founder");
  assert.equal(postAuthDestination({ role: "founder", organizationName: null }, "/simulator/new"), "/onboarding");
});
