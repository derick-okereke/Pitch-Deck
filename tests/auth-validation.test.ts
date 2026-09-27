import assert from "node:assert/strict";
import test from "node:test";
import { accountPasswordSchema } from "../src/lib/auth-validation.ts";

test("accepts an eight-character password with capital, number, and special character", () => {
  assert.equal(accountPasswordSchema.safeParse("Pitch8!x").success, true);
});

test("rejects passwords missing any required character class", () => {
  assert.equal(accountPasswordSchema.safeParse("pitch8!x").success, false);
  assert.equal(accountPasswordSchema.safeParse("Pitch!!x").success, false);
  assert.equal(accountPasswordSchema.safeParse("Pitch88x").success, false);
  assert.equal(accountPasswordSchema.safeParse("P8!short").success, true);
});

test("rejects passwords shorter than eight characters", () => {
  assert.equal(accountPasswordSchema.safeParse("P8!tiny").success, false);
});
