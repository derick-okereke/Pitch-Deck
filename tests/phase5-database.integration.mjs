import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

nextEnv.loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !serviceKey) throw new Error("Supabase integration environment is incomplete.");

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const stamp = Date.now();
let userId;

try {
  const email = `phase5-founder-${stamp}@example.com`;
  const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password: "Phase5!Integration8", email_confirm: true });
  if (createError || !created.user) throw createError ?? new Error("Synthetic founder was not created.");
  userId = created.user.id;
  const { error: accountError } = await admin.from("accounts").update({ role: "founder", display_name: "Phase Five Founder", organization_name: "Phase Five QA", onboarding_completed_at: new Date().toISOString(), is_demo: true }).eq("id", userId);
  if (accountError) throw accountError;

  const checkoutId = `chk_phase5_${stamp}`;
  const subscriptionId = `sub_phase5_${stamp}`;
  const customerId = `cust_phase5_${stamp}`;
  const productId = "prod_phase5_fixture";
  const eventId = `evt_phase5_${stamp}`;
  const attemptId = randomUUID();
  const periodStart = new Date(Date.now() - 60_000).toISOString();
  const periodEnd = new Date(Date.now() + 30 * 86_400_000).toISOString();

  const { error: attemptError } = await admin.from("billing_checkout_attempts").insert({ id: attemptId, account_id: userId, idempotency_key: attemptId, reference: `phase5-${attemptId}`, provider_checkout_id: checkoutId, state: "pending_verification", environment: "sandbox", product_id: productId, currency: "USD", amount_minor: 300 });
  if (attemptError) throw attemptError;
  const { error: receiptError } = await admin.from("billing_webhook_receipts").insert({ provider_event_id: eventId, event_type: "collection.succeeded", environment: "sandbox", payload_hash: createHash("sha256").update(eventId).digest("hex") });
  if (receiptError) throw receiptError;

  const activation = await admin.rpc("activate_bachs_founder_subscription", { p_event_id: eventId, p_checkout_id: checkoutId, p_customer_id: customerId, p_subscription_id: subscriptionId, p_product_id: productId, p_currency: "USD", p_amount_minor: 300, p_status: "active", p_period_start: periodStart, p_period_end: periodEnd, p_cancel_at_period_end: false });
  assert.equal(activation.error, null);
  assert.equal(activation.data, userId);
  const active = await admin.rpc("founder_has_active_pro", { p_account_id: userId });
  assert.equal(active.error, null);
  assert.equal(active.data, true);

  const profile = { name: "Phase Five QA", tagline: "Synthetic billing boundary", sector: "fintech", stage: "pre-seed", country: "NG", city: "Lagos", problem: "Synthetic", solution: "Synthetic", ask_currency: "USD", ask_amount_minor: "300000", team: [], traction: {} };
  const { data: startup, error: startupError } = await admin.from("startups").insert({ founder_id: userId, draft_payload: profile, draft_version: 1, publication_status: "draft", is_demo: true }).select("id").single();
  if (startupError) throw startupError;
  const contentHash = createHash("sha256").update(JSON.stringify(profile)).digest("hex");
  const session = await admin.rpc("start_simulator_session", { p_founder_id: userId, p_startup_id: startup.id, p_draft_version: 1, p_content_hash: contentHash, p_consent_version: "recording-consent-v1", p_idempotency_key: randomUUID(), p_input_hash: createHash("sha256").update("phase5").digest("hex") });
  assert.equal(session.error, null);
  const { data: sessionRow } = await admin.from("simulator_sessions").select("tier_at_start, entitlement_source").eq("id", session.data[0].session_id).single();
  assert.deepEqual(sessionRow, { tier_at_start: "pro", entitlement_source: "bachs-sandbox" });

  const wrongEventId = `evt_phase5_wrong_${stamp}`;
  await admin.from("billing_webhook_receipts").insert({ provider_event_id: wrongEventId, event_type: "collection.succeeded", environment: "sandbox", payload_hash: createHash("sha256").update(wrongEventId).digest("hex") });
  const mismatch = await admin.rpc("activate_bachs_founder_subscription", { p_event_id: wrongEventId, p_checkout_id: checkoutId, p_customer_id: customerId, p_subscription_id: subscriptionId, p_product_id: "prod_wrong", p_currency: "USD", p_amount_minor: 300, p_status: "active", p_period_start: periodStart, p_period_end: periodEnd, p_cancel_at_period_end: false });
  assert.match(mismatch.error?.message ?? "", /CHECKOUT_BINDING_MISMATCH/);
  console.log("Phase 5 database integration passed: verified activation, effective Pro, session snapshot, and binding rejection.");
} finally {
  if (userId) await admin.auth.admin.deleteUser(userId);
}
