import assert from "node:assert/strict";
import test from "node:test";
import { beforeSendProductEvent } from "../src/lib/telemetry/posthog-policy.ts";
import { isAllowedBrowserFailure } from "../src/lib/telemetry/watchup-policy.ts";

test("private URLs and content are stripped from permitted events", () => {
  const result = beforeSendProductEvent({
    uuid: crypto.randomUUID(),
    event: "role_selected",
    properties: {
      token: "public-project-token",
      distinct_id: "account-id",
      role: "investor",
      $current_url: "https://example.com/auth/confirm?token_hash=secret",
      note: "private introduction",
      transcript: "private recording",
    },
    $set: { email: "private@example.com" },
  });
  assert.deepEqual(result?.properties, { token: "public-project-token", distinct_id: "account-id", role: "investor" });
  assert.equal(result?.$set, undefined);
  assert.equal(beforeSendProductEvent({ uuid: crypto.randomUUID(), event: "$pageview", properties: { $current_url: "secret" } }), null);
});

test("WatchUp browser relay accepts only fixed failure codes", () => {
  assert.equal(isAllowedBrowserFailure("simulator_step", "PITCH_CLIENT_FAILURE"), true);
  assert.equal(isAllowedBrowserFailure("simulator_step", "raw transcript"), false);
  assert.equal(isAllowedBrowserFailure("/auth/confirm?token=secret", "PITCH_CLIENT_FAILURE"), false);
  assert.equal(isAllowedBrowserFailure("__proto__", "PITCH_CLIENT_FAILURE"), false);
});
