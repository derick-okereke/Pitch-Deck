import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import * as redirects from "../src/lib/auth-redirect.ts";
import { authEmailRedirectOrigin } from "../src/lib/site-url.ts";

const require = createRequire(import.meta.url);
// Execute the actual route with a fake auth provider, without issuing emails or
// consuming real confirmation tokens. NextResponse is the real implementation.
const compiled = ts.transpileModule(
  readFileSync(new URL("../src/app/auth/callback/route.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;

function callback({ valid = true, organizationName = null as string | null, errorCode = "" } = {}) {
  const authResult = { data: { user: valid ? { id: "test-user" } : null }, error: valid ? null : Object.assign(new Error("Expired"), { code: errorCode }) };
  let accountReads = 0;
  const client = {
    auth: { exchangeCodeForSession: async () => authResult, verifyOtp: async () => authResult },
    from: () => {
      accountReads++;
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: "founder", organization_name: organizationName } }) }) }) };
    },
  };
  const exports: { GET?: (request: Request) => Promise<Response> } = {};
  new Function("require", "exports", compiled)((name: string) => {
    if (name === "@/lib/auth-redirect") return redirects;
    if (name === "@/lib/site-url") return { authEmailRedirectOrigin: () => authEmailRedirectOrigin({}) };
    if (name === "@/lib/supabase/server") return { createClient: async () => client };
    return require(name);
  }, exports);
  return { get: exports.GET!, accountReads: () => accountReads };
}

test("callback success and failure never redirect to the proxy's localhost origin", async () => {
  for (const [query, valid, path] of [
    ["?code=test", true, "/onboarding"],
    ["?code=test", false, "/auth/auth-code-error"],
    ["", true, "/auth/auth-code-error"],
  ] as const) {
    const response = await callback({ valid }).get(new Request(`http://localhost:3000/auth/callback${query}`));
    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), `https://pitch-deck.pxxlspace.cv${path}`);
  }
});

test("PKCE and token-hash recovery reach password update before onboarding", async () => {
  for (const query of ["?code=test&next=/auth/update-password", "?token_hash=test&type=recovery"]) {
    const route = callback();
    const response = await route.get(new Request(`http://localhost:3000/auth/callback${query}`));
    assert.equal(response.headers.get("location"), "https://pitch-deck.pxxlspace.cv/auth/update-password");
    assert.equal(route.accountReads(), 0);
  }
});

test("failed recovery cannot proceed to the password form", async () => {
  const response = await callback({ valid: false }).get(new Request("http://localhost:3000/auth/callback?code=test&next=/auth/update-password"));
  assert.equal(response.headers.get("location"), "https://pitch-deck.pxxlspace.cv/auth/auth-code-error");
});

test("missing PKCE verifier directs a confirmed signup to sign in with its requested destination", async () => {
  const response = await callback({ valid: false, errorCode: "pkce_code_verifier_not_found" }).get(
    new Request("http://localhost:3000/auth/callback?code=test&next=/discover"),
  );
  assert.equal(response.headers.get("location"), "https://pitch-deck.pxxlspace.cv/auth/sign-in?link=session-unavailable&next=%2Fdiscover");
});
