import assert from "node:assert/strict";
import test from "node:test";
import { siteUrl } from "../src/lib/site-url.ts";

function requestHeaders(values: Record<string, string> = {}) {
  const normalized = new Map(Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]));
  return { get(name: string) { return normalized.get(name.toLowerCase()) ?? null; } };
}

test("uses the configured public production origin", () => {
  assert.equal(
    siteUrl(requestHeaders({ host: "localhost:3000" }), { NODE_ENV: "production", APP_BASE_URL: "https://pitch-deck.pxxlspace.cv/" }),
    "https://pitch-deck.pxxlspace.cv",
  );
});

test("does not put a hosting proxy localhost address in production email links", () => {
  assert.equal(
    siteUrl(requestHeaders({ host: "localhost:3000", origin: "http://localhost:3000" }), { NODE_ENV: "production", APP_BASE_URL: "http://localhost:3000" }),
    "https://pitch-deck.pxxlspace.cv",
  );
});

test("does not trust a request host when choosing a production email origin", () => {
  assert.equal(
    siteUrl(requestHeaders({ host: "untrusted.example", "x-forwarded-proto": "https" }), { NODE_ENV: "production", APP_BASE_URL: "http://localhost:3000" }),
    "https://pitch-deck.pxxlspace.cv",
  );
});

test("keeps localhost available during development", () => {
  assert.equal(
    siteUrl(requestHeaders({ host: "localhost:3000", origin: "http://localhost:3000" }), { NODE_ENV: "development", APP_BASE_URL: "http://localhost:3000" }),
    "http://localhost:3000",
  );
});
