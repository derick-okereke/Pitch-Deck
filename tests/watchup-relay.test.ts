import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { parseWatchupAnalytics } from "../src/lib/telemetry/watchup-analytics-policy.ts";

function relay(outage = false) {
  const forwarded: { body: string; headers: Record<string, string> }[] = [];
  const events: { name: string; properties: Record<string, unknown> }[] = [];
  const exports = {} as { POST: (request: Request) => Promise<Response> };
  const code = ts.transpileModule(readFileSync(new URL("../src/app/api/v1/telemetry/route.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(code, {
    exports, URL, Response, Buffer, AbortSignal, process: { env: { WATCHUP_API_KEY: "server-only-test-key" } },
    fetch: async (_url: string, options: { body: string; headers: Record<string, string> }) => { if (outage) throw new Error("offline"); forwarded.push(options); return new Response(null, { status: 201 }); },
    require: (name: string) => {
      if (name === "node:crypto") return { createHash };
      if (name.endsWith("site-url")) return { applicationOrigin: () => origin };
      if (name.endsWith("watchup-analytics-policy")) return { parseWatchupAnalytics };
      if (name.endsWith("watchup-server")) return { captureWatchupEvent: (name: string, properties: Record<string, unknown>) => events.push({ name, properties }) };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return { post: exports.POST, forwarded, events };
}

const origin = "https://example.com";
const page = () => ({ kind: "pageview", path: "/discover", visitor_id: crypto.randomUUID(), session_id: crypto.randomUUID() });
function request(body: unknown, requestOrigin = origin) {
  return new Request(`${origin}/api/v1/telemetry`, { method: "POST", headers: { Origin: requestOrigin, "Content-Type": "application/json", "User-Agent": "synthetic-browser" }, body: typeof body === "string" ? body : JSON.stringify(body) });
}

test("relay rejects foreign origins, raw URLs, and oversized streamed bodies", async () => {
  const { post, forwarded } = relay();
  assert.equal((await post(request(page(), "https://foreign.example"))).status, 403);
  assert.equal((await post(request({ ...page(), path: "/discover?token=secret" }))).status, 400);
  assert.equal((await post(request("x".repeat(2049)))).status, 413);
  assert.equal(forwarded.length, 0);
});

test("relay rebuilds page payloads and keeps its key on the server", async () => {
  const { post, forwarded } = relay();
  const response = await post(request({ ...page(), hostname: "attacker.example", email: "secret", referrer: "secret", utm_source: "secret" }));
  assert.equal(response.status, 204);
  const batch = JSON.parse(forwarded[0].body);
  assert.equal(batch.web[0].hostname, "example.com");
  assert.equal(batch.web[0].event_name, "pageview");
  assert.equal(JSON.stringify(batch).includes("secret"), false);
  assert.equal(forwarded[0].headers["X-Api-Key"], "server-only-test-key");
  assert.equal(await response.text(), "");
});

test("relay accepts the configured public origin behind an internal localhost proxy", async () => {
  const { post, forwarded } = relay();
  const proxied = new Request("http://localhost:3000/api/v1/telemetry", { method: "POST", headers: { Origin: origin }, body: JSON.stringify(page()) });
  assert.equal((await post(proxied)).status, 204);
  assert.equal(JSON.parse(forwarded[0].body).web[0].hostname, "example.com");
});

test("relay strips private event content, isolates outages, and bounds anonymous traffic", async () => {
  const { post, events } = relay();
  const body = { kind: "event", visitor_id: crypto.randomUUID(), event: "session_step_completed", properties: { step: "pitch", transcript: "secret" } };
  assert.equal((await post(request(body))).status, 204);
  assert.deepEqual(JSON.parse(JSON.stringify(events)), [{ name: "session_step_completed", properties: { step: "pitch" } }]);
  const offline = relay(true);
  assert.equal((await offline.post(request(page()))).status, 204);
  for (let i = 1; i < 120; i++) assert.equal((await post(request(body))).status, 204);
  assert.equal((await post(request(body))).status, 429);
});
