import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { usdToMinor, verifyBachsSignature } from "../src/lib/billing-core.ts";

test("accepts any matching v1 signature in the Bachs V2 header", () => {
  const rawBody = JSON.stringify({ id: "evt_test", type: "collection.succeeded", data: {} });
  const secret = "whsec_test";
  const timestamp = 1_800_000_000;
  const digest = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
  assert.equal(verifyBachsSignature({
    rawBody,
    secret,
    signatureV2: `t=${timestamp},v1=${"0".repeat(64)},v1=${digest}`,
    nowSeconds: timestamp + 10,
  }), true);
});
test("rejects stale and body-altered webhook signatures", () => {
  const rawBody = "{\"id\":\"evt_test\"}";
  const secret = "whsec_test";
  const timestamp = 1_800_000_000;
  const digest = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
  const signatureV2 = `t=${timestamp},v1=${digest}`;
  assert.equal(verifyBachsSignature({ rawBody, secret, signatureV2, nowSeconds: timestamp + 301 }), false);
  assert.equal(verifyBachsSignature({ rawBody: `${rawBody} `, secret, signatureV2, nowSeconds: timestamp }), false);
});

test("supports the documented legacy timestamp and signature headers", () => {
  const rawBody = "{}";
  const secret = "whsec_test";
  const timestamp = 1_800_000_000;
  const signature = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
  assert.equal(verifyBachsSignature({ rawBody, secret, timestamp: String(timestamp), signature, nowSeconds: timestamp }), true);
});

test("converts USD strings without floating point rounding", () => {
  assert.equal(usdToMinor("3.00"), 300);
  assert.equal(usdToMinor("29.00"), 2900);
  assert.equal(usdToMinor("3"), null);
  assert.equal(usdToMinor("3.001"), null);
  assert.equal(usdToMinor("-3.00"), null);
});
