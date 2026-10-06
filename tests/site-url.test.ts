import assert from "node:assert/strict";
import test from "node:test";
import { applicationOrigin, authEmailRedirectOrigin } from "../src/lib/site-url.ts";

test("uses the canonical production origin by default", () => {
  assert.equal(
    authEmailRedirectOrigin({}),
    "https://peekytoe.pxxl.click",
  );
});

test("allows an explicit local override for local email testing", () => {
  assert.equal(
    authEmailRedirectOrigin({ AUTH_EMAIL_REDIRECT_ORIGIN: "http://localhost:3000/" }),
    "http://localhost:3000",
  );
});

test("ignores malformed explicit overrides", () => {
  assert.equal(authEmailRedirectOrigin({ AUTH_EMAIL_REDIRECT_ORIGIN: "not a url" }), "https://peekytoe.pxxl.click");
});

test("billing uses the new production origin unless explicitly configured", () => {
  assert.equal(applicationOrigin({}), "https://peekytoe.pxxl.click");
  assert.equal(applicationOrigin({ APP_BASE_URL: "https://peekytoe.pxxl.click/" }), "https://peekytoe.pxxl.click");
});
