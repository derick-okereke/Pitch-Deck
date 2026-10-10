import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { analyticsPage, parseWatchupAnalytics } from "../src/lib/telemetry/watchup-analytics-policy.ts";
import { isAllowedBrowserFailure } from "../src/lib/telemetry/watchup-policy.ts";
import { ANALYTICS_CONSENT_KEY } from "../src/lib/telemetry/consent.ts";

function browser() {
  const values = new Map<string, string>();
  const sessions = new Map<string, string>();
  const storage = (map: Map<string, string>) => ({ getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => map.set(key, value), removeItem: (key: string) => map.delete(key) });
  const sent: Record<string, unknown>[] = [];
  const exports: Record<string, (...args: unknown[]) => void> = {};
  const location = { pathname: "/discover" };
  const code = ts.transpileModule(readFileSync(new URL("../src/lib/telemetry/watchup-browser.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(code, {
    exports, crypto, localStorage: storage(values), sessionStorage: storage(sessions),
    window: { location }, screen: { width: 1920, height: 1080 }, navigator: { language: "en-GB" },
    fetch: (_url: string, options: { body: string }) => { sent.push(JSON.parse(options.body)); return Promise.resolve(); },
    require: (name: string) => {
      if (name.endsWith("watchup-policy")) return { isAllowedBrowserFailure };
      if (name.endsWith("consent")) return { ANALYTICS_CONSENT_KEY };
      if (name.endsWith("watchup-analytics-policy")) return { analyticsPage, parseWatchupAnalytics };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return { api: exports, values, sessions, sent };
}

test("WatchUp browser analytics requires configuration and explicit consent", () => {
  const { api, sent, values } = browser();
  values.set("pitch-deck:analytics-consent-v1", "yes");
  api.startWatchupAnalytics();
  api.captureWatchupPageView("/discover");
  api.captureWatchupProductEvent("checkout_started");
  assert.equal(sent.length, 0);
  values.set(ANALYTICS_CONSENT_KEY, "yes");
  api.stopWatchupAnalytics();
  api.captureWatchupPageView("/discover");
  assert.equal(sent.length, 0);
  api.startWatchupAnalytics();
  api.captureWatchupPageView("/discover");
  assert.equal(sent.length, 1);
});

test("page views deduplicate React reruns, track navigation, and redact private URLs", () => {
  const { api, sent, values } = browser();
  values.set(ANALYTICS_CONSENT_KEY, "yes");
  api.startWatchupAnalytics();
  api.captureWatchupPageView("/discover");
  api.captureWatchupPageView("/discover");
  api.captureWatchupPageView("/startups/private-company?token=secret");
  api.captureWatchupPageView("/discover");
  assert.deepEqual(sent.map(p => p.path), ["/discover", "/startups/[slug]", "/discover"]);
  assert.equal(new Set(sent.map(p => p.visitor_id)).size, 1);
  assert.equal(new Set(sent.map(p => p.session_id)).size, 1);
  assert.equal(JSON.stringify(sent).includes("secret"), false);
  assert.equal(JSON.stringify(sent).includes("private-company"), false);
});

test("withdrawing consent blocks events and resets WatchUp identifiers", () => {
  const { api, sent, values, sessions } = browser();
  values.set(ANALYTICS_CONSENT_KEY, "yes");
  api.startWatchupAnalytics();
  api.captureWatchupPageView("/discover");
  const firstVisitor = sent[0].visitor_id;
  values.set(ANALYTICS_CONSENT_KEY, "no");
  api.stopWatchupAnalytics();
  api.captureWatchupProductEvent("checkout_started");
  api.captureWatchupWebVital({ name: "LCP", value: 123 });
  assert.equal(sent.length, 1);
  assert.equal(values.size, 1);
  assert.equal(sessions.size, 0);
  values.set(ANALYTICS_CONSENT_KEY, "yes");
  api.startWatchupAnalytics();
  api.captureWatchupPageView("/discover");
  assert.notEqual(sent[1].visitor_id, firstVisitor);
});

test("browser sends filtered product properties and numeric web vitals", () => {
  const { api, sent, values } = browser();
  values.set(ANALYTICS_CONSENT_KEY, "yes");
  api.startWatchupAnalytics();
  api.captureWatchupProductEvent("role_selected", { role: "founder", transcript: "private", email: "private@example.com" });
  api.captureWatchupWebVital({ name: "LCP", value: 1250, entries: [{ url: "secret" }] });
  assert.deepEqual(sent[0].properties, { role: "founder" });
  assert.equal(sent[1].value, 1250);
  assert.equal(JSON.stringify(sent).includes("private"), false);
  assert.equal(JSON.stringify(sent).includes("secret"), false);
});
