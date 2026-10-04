import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import * as confirmation from "../src/lib/auth-confirmation.ts";
import * as redirects from "../src/lib/auth-redirect.ts";

const require = createRequire(import.meta.url);
const compiled = ts.transpileModule(
  readFileSync(new URL("../src/app/auth/confirm/page.tsx", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } },
).outputText;

class Redirect extends Error {
  destination: string;
  constructor(destination: string) { super(destination); this.destination = destination; }
}

type Page = (props: { searchParams: Promise<{ token_hash?: unknown }> }) => Promise<{
  props: { children: { props: { action: (form: FormData) => Promise<void> } } };
}>;

function confirmationPage({ valid = true, organizationName = null as string | null } = {}) {
  const verifications: { token_hash: string; type: string }[] = [];
  let clientCreates = 0;
  const client = {
    auth: { verifyOtp: async (input: { token_hash: string; type: string }) => {
      verifications.push(input);
      return { data: { user: valid ? { id: "investor" } : null }, error: valid ? null : new Error("Expired") };
    } },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: "investor", organization_name: organizationName } }) }) }) }),
  };
  const exports: { default?: Page } = {};
  new Function("require", "exports", compiled)((name: string) => {
    if (name === "next/navigation") return { redirect: (path: string) => { throw new Redirect(path); } };
    if (name === "next/link") return { default: () => null };
    if (name === "@/components/auth/auth-shell") return { AuthShell: () => null };
    if (name === "@/lib/auth-confirmation") return confirmation;
    if (name === "@/lib/auth-redirect") return redirects;
    if (name === "@/lib/supabase/server") return { createClient: async () => { clientCreates++; return client; } };
    return require(name);
  }, exports);
  return { page: exports.default!, verifications, clientCreates: () => clientCreates };
}

test("Supabase token formats reach confirmation without a GET consuming them", async () => {
  for (const token of ["a".repeat(56), `pkce_${"b".repeat(56)}`, "c".repeat(64)]) {
    const fixture = confirmationPage();
    const rendered = await fixture.page({ searchParams: Promise.resolve({ token_hash: token }) });
    assert.equal(fixture.clientCreates(), 0, "Email previews must not verify tokens.");
    const form = new FormData();
    form.set("token_hash", token);
    await assert.rejects(rendered.props.children.props.action(form), { destination: "/onboarding" });
    assert.deepEqual(fixture.verifications, [{ token_hash: token, type: "email" }]);
  }
});

test("confirmed investor with an organization reaches discovery", async () => {
  const fixture = confirmationPage({ organizationName: "Test fund" });
  const token = "a".repeat(56);
  const rendered = await fixture.page({ searchParams: Promise.resolve({ token_hash: token }) });
  const form = new FormData();
  form.set("token_hash", token);
  await assert.rejects(rendered.props.children.props.action(form), { destination: "/discover" });
});

test("provider rejection cannot open the investor workspace", async () => {
  const fixture = confirmationPage({ valid: false });
  const token = "a".repeat(56);
  const rendered = await fixture.page({ searchParams: Promise.resolve({ token_hash: token }) });
  const form = new FormData();
  form.set("token_hash", token);
  await assert.rejects(rendered.props.children.props.action(form), { destination: "/auth/auth-code-error" });
});

test("missing, repeated, malformed and oversized tokens are rejected on both entry points", async () => {
  const fixture = confirmationPage();
  for (const token of [undefined, ["a", "b"], "", "a b", "a".repeat(513)]) {
    await assert.rejects(fixture.page({ searchParams: Promise.resolve({ token_hash: token }) }), { destination: "/auth/auth-code-error" });
  }
  const rendered = await fixture.page({ searchParams: Promise.resolve({ token_hash: "a".repeat(56) }) });
  await assert.rejects(rendered.props.children.props.action(new FormData()), { destination: "/auth/auth-code-error" });
  assert.equal(fixture.clientCreates(), 0);
});
