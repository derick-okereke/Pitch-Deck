import assert from "node:assert/strict";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { confirmationTokenHash } from "../src/lib/auth-confirmation.ts";

nextEnv.loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !serviceKey || !publishableKey) throw new Error("Supabase integration environment is incomplete.");

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const publicClient = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
const createdIds = [];
const suffix = crypto.randomUUID();

try {
  // Generate a disposable confirmation without sending an email. Exercise the
  // provider's actual token format, not a guessed hash length.
  const generated = await admin.auth.admin.generateLink({
    type: "signup",
    email: `confirmation-${suffix}@example.com`,
    password: "AuthTest8!",
    options: { data: { role: "investor", display_name: "Confirmation test" } },
  });
  if (generated.error || !generated.data.user) throw generated.error ?? new Error("Test confirmation was not generated.");
  createdIds.push(generated.data.user.id);
  const tokenHash = generated.data.properties.hashed_token;
  assert.equal(confirmationTokenHash(tokenHash), tokenHash, "Accept the token hash Supabase actually issues.");
  const confirmationClient = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const verified = await confirmationClient.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
  assert.equal(verified.error, null);
  assert.equal(verified.data.user?.id, generated.data.user.id);
  assert.ok(verified.data.session, "Confirmation must establish a session without a signup verifier cookie.");
  const investorAccount = await admin.from("accounts").select("role").eq("id", generated.data.user.id).single();
  assert.equal(investorAccount.data?.role, "investor");
  console.log(`Investor confirmation passed using Supabase's ${tokenHash.length}-character token hash.`);

  const confirmedEmail = `confirmed-${suffix}@example.com`;
  const unconfirmedEmail = `unconfirmed-${suffix}@example.com`;
  for (const [email, emailConfirm] of [[confirmedEmail, true], [unconfirmedEmail, false]]) {
    const { data, error } = await admin.auth.admin.createUser({ email, password: "AuthTest8!", email_confirm: emailConfirm });
    if (error || !data.user) throw error ?? new Error("Synthetic auth user was not created.");
    createdIds.push(data.user.id);
  }

  const confirmed = await admin.rpc("confirmed_signup_email_exists", { p_email: confirmedEmail.toUpperCase() });
  assert.equal(confirmed.error, null);
  assert.equal(confirmed.data, true);

  const unconfirmed = await admin.rpc("confirmed_signup_email_exists", { p_email: unconfirmedEmail });
  assert.equal(unconfirmed.error, null);
  assert.equal(unconfirmed.data, false);

  const unknown = await admin.rpc("confirmed_signup_email_exists", { p_email: `unknown-${suffix}@example.com` });
  assert.equal(unknown.error, null);
  assert.equal(unknown.data, false);

  const publicLookup = await publicClient.rpc("confirmed_signup_email_exists", { p_email: confirmedEmail });
  assert.ok(publicLookup.error, "Public clients must not be allowed to look up confirmed emails.");

  console.log("Signup email lookup passed: confirmed, unconfirmed, unknown, and public-access cases.");
} finally {
  for (const id of createdIds) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw error;
  }
}
