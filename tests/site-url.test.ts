import assert from "node:assert/strict";
import test from "node:test";
import { authEmailRedirectOrigin } from "../src/lib/site-url.ts";

test("uses the canonical production origin by default", () => {
  assert.equal(
    authEmailRedirectOrigin({}),
    "https://pitch-deck.pxxlspace.cv",
  );
});

test("allows an explicit local override for local email testing", () => {
  assert.equal(
    authEmailRedirectOrigin({ AUTH_EMAIL_REDIRECT_ORIGIN: "http://localhost:3000/" }),
    "http://localhost:3000",
  );
});

test("ignores malformed explicit overrides", () => {
  assert.equal(authEmailRedirectOrigin({ AUTH_EMAIL_REDIRECT_ORIGIN: "not a url" }), "https://pitch-deck.pxxlspace.cv");
});
