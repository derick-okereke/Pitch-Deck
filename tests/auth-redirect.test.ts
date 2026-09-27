import assert from "node:assert/strict";
import test from "node:test";
import { postAuthDestination, safeAuthNext } from "../src/lib/auth-redirect.ts";

test("allows only known same-origin authentication destinations", () => {
  assert.equal(safeAuthNext("/simulator/new"), "/simulator/new");
  assert.equal(safeAuthNext("/founder/profile/edit"), "/founder/profile/edit");
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
  assert.equal(postAuthDestination({ role: "founder", organizationName: "Korah" }, "/discover"), "/founder");
  assert.equal(postAuthDestination({ role: "founder", organizationName: null }, "/simulator/new"), "/onboarding");
});
