import assert from "node:assert/strict";
import test from "node:test";
import { beforeSendProductEvent } from "../src/lib/telemetry/posthog-policy.ts";
import { isAllowedBrowserFailure } from "../src/lib/telemetry/watchup-policy.ts";
import { unhandledErrorRoute } from "../src/lib/telemetry/watchup-route.ts";
import { analyticsPage, parseWatchupAnalytics } from "../src/lib/telemetry/watchup-analytics-policy.ts";
import { observeWatchupHandler } from "../src/lib/telemetry/watchup-handler.ts";

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

test("WatchUp unhandled errors use route templates without request data", () => {
  assert.equal(unhandledErrorRoute("/app/startups/[slug]/page", "render"), "server_unhandled:render:/app/startups/[slug]/page");
  assert.equal(unhandledErrorRoute("/app/startups/private-id?token=secret", "render"), "server_unhandled");
  assert.equal(unhandledErrorRoute("/app/discover/page", "unknown"), "server_unhandled");
});

test("page analytics removes tokens and replaces private IDs with templates", () => {
  assert.equal(analyticsPage("/auth/confirm?token_hash=secret#code"), "/auth/confirm");
  assert.equal(analyticsPage("/startups/private-company"), "/startups/[slug]");
  assert.equal(analyticsPage("/simulator/private-session/report"), "/simulator/[id]/report");
  assert.equal(analyticsPage("/inbox/private-conversation"), "/inbox/[id]");
  assert.equal(analyticsPage("/simulator/new"), "/simulator/new");
  assert.equal(analyticsPage("/unknown/private-page"), null);
});

test("relay rejects raw paths and strips extra web payload fields", () => {
  const body = { kind: "pageview", path: "/inbox/[id]", visitor_id: crypto.randomUUID(), session_id: crypto.randomUUID(), screen_w: 1920, lang: "en-GB", referrer: "https://example.com?token=secret", title: "Private founder", transcript: "secret" };
  const result = parseWatchupAnalytics(body);
  assert.deepEqual(result, { kind: "pageview", path: body.path, visitor_id: body.visitor_id, session_id: body.session_id, screen_w: 1920, screen_h: undefined, lang: "en-GB" });
  assert.equal(parseWatchupAnalytics({ ...body, path: "/inbox/private-id" }), null);
  assert.equal(parseWatchupAnalytics({ ...body, path: "/auth/confirm?token=secret" }), null);
  assert.equal(parseWatchupAnalytics({ ...body, visitor_id: "user@example.com" }), null);
});

test("WatchUp events use the product property allowlist", () => {
  const visitor_id = crypto.randomUUID();
  assert.deepEqual(parseWatchupAnalytics({ kind: "event", visitor_id, event: "role_selected", properties: { role: "founder", email: "private@example.com", step: "pitch", $current_url: "secret" } }), { kind: "event", visitor_id, event: "role_selected", properties: { role: "founder" } });
  assert.equal(parseWatchupAnalytics({ kind: "event", visitor_id, event: "$autocapture" }), null);
  assert.equal(parseWatchupAnalytics({ kind: "event", visitor_id, event: "__proto__" }), null);
});

test("web vitals allow only finite numeric measurements and fixed metric names", () => {
  const body = { kind: "vital", visitor_id: crypto.randomUUID(), path: "/discover", name: "LCP", value: 1250 };
  assert.deepEqual(parseWatchupAnalytics(body), body);
  assert.equal(parseWatchupAnalytics({ ...body, value: Infinity }), null);
  assert.equal(parseWatchupAnalytics({ ...body, value: -1 }), null);
  assert.equal(parseWatchupAnalytics({ ...body, name: "private text" }), null);
});

test("request monitoring preserves responses, context, and exact status codes", async () => {
  for (const status of [201, 204, 302, 401, 404, 422, 503]) {
    const response = new Response(null, { status, headers: { "x-operation": "kept" } });
    const context = { params: Promise.resolve({ id: "private-id" }) };
    const statuses: number[] = [];
    const wrapped = observeWatchupHandler(async (_request: Request, received: typeof context) => { assert.equal(received, context); return response; }, () => (code) => statuses.push(code));
    assert.equal(await wrapped(new Request("https://example.com/api/private?token=secret"), context), response);
    assert.deepEqual(statuses, [status]);
  }
});

test("request monitoring rethrows original errors and isolates monitoring outages", async () => {
  const error = new Error("private provider message");
  const statuses: number[] = [];
  const throws = observeWatchupHandler(async () => { throw error; }, () => (code) => statuses.push(code));
  await assert.rejects(throws, (received) => received === error);
  assert.deepEqual(statuses, [500]);
  const response = new Response(null, { status: 204 });
  assert.equal(await observeWatchupHandler(() => response, () => { throw new Error("SDK unavailable"); })(), response);
  assert.equal(await observeWatchupHandler(() => response, () => () => { throw new Error("ingest unavailable"); })(), response);
});
