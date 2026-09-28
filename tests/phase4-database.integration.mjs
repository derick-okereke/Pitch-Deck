import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

nextEnv.loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !anonKey || !serviceKey) throw new Error("Supabase integration environment is incomplete.");

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const password = "Phase4!Integration8";
const stamp = Date.now();
const createdUsers = [];

async function createAccount(role, index) {
  const email = `phase4-${role}-${stamp}-${index}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("Synthetic user was not created.");
  createdUsers.push(data.user.id);
  const { error: accountError } = await admin.from("accounts").update({ role, display_name: `${role} ${index}`, organization_name: `${role} QA`, onboarding_completed_at: new Date().toISOString(), is_demo: true }).eq("id", data.user.id);
  if (accountError) throw accountError;
  return { id: data.user.id, email };
}

async function createPublishedStartup(founder, index) {
  const profile = { name: `Phase 4 Boundary ${index}`, tagline: "Synthetic integration fixture", sector: "fintech", stage: "pre-seed", country: "NG", city: "Lagos", problem: "Synthetic boundary evidence", solution: "Synthetic boundary response", ask_currency: "USD", ask_amount_minor: "25000000", team: [], traction: { evidence_note: "Synthetic only" } };
  const { data: startup, error: startupError } = await admin.from("startups").insert({ founder_id: founder.id, draft_payload: profile, publication_status: "draft", is_demo: true }).select("id").single();
  if (startupError) throw startupError;
  const { data: revision, error: revisionError } = await admin.from("profile_revisions").insert({ startup_id: startup.id, revision_number: 1, draft_version: 1, content_hash: randomUUID().replaceAll("-", "").padEnd(64, "0"), payload: profile }).select("id").single();
  if (revisionError) throw revisionError;
  const { error: publishError } = await admin.from("startups").update({ published_revision_id: revision.id, publication_status: "published" }).eq("id", startup.id);
  if (publishError) throw publishError;
  return startup.id;
}

try {
  const investor = await createAccount("investor", 1);
  const founders = await Promise.all([1, 2, 3].map((index) => createAccount("founder", index)));
  const { error: profileError } = await admin.from("investor_profiles").insert({ user_id: investor.id, full_name: "Phase Four Investor", investor_type: "angel", firm_name: "Synthetic QA", professional_title: "QA investor", bio: null, sectors: ["fintech"], stages: ["pre-seed"], countries: ["NG"], check_currency: "USD", check_min_minor: 1000000, check_max_minor: 50000000, linkedin_url: null });
  if (profileError) throw profileError;
  const startups = await Promise.all(founders.map(createPublishedStartup));

  const reserve = (startupId) => admin.rpc("reserve_investor_detail_view", { p_investor_id: investor.id, p_startup_id: startupId, p_demo_mode: true, p_limit: 2 });
  const first = await reserve(startups[0]);
  assert.equal(first.error, null);
  assert.equal(first.data[0].allowed, true);
  assert.equal(first.data[0].consumed, true);
  const boundary = await Promise.all([reserve(startups[1]), reserve(startups[2])]);
  assert.equal(boundary.filter(({ data }) => data?.[0]?.allowed).length, 1, "Only one concurrent new detail may claim the final slot.");
  const deniedStartup = startups[boundary[0].data[0].allowed ? 2 : 1];
  const refresh = await reserve(startups[0]);
  assert.equal(refresh.data[0].allowed, true);
  assert.equal(refresh.data[0].consumed, false);
  assert.equal(refresh.data[0].used_count, 2);

  const { error: entitlementError } = await admin.from("demo_entitlements").insert({ account_id: investor.id, role: "investor", tier: "pro", expires_at: new Date(Date.now() + 86_400_000).toISOString(), granted_by: "phase4-integration", reason: "Synthetic Phase 4 acceptance test" });
  if (entitlementError) throw entitlementError;
  const proView = await reserve(deniedStartup);
  assert.equal(proView.data[0].allowed, true);
  assert.equal(proView.data[0].demo_pro, true);

  const introId = randomUUID();
  const introArgs = { p_investor_id: investor.id, p_startup_id: startups[0], p_body: "Synthetic introduction note for the Phase 4 integration boundary.", p_client_message_id: introId, p_demo_mode: true };
  const firstIntro = await admin.rpc("create_intro_request", introArgs);
  const duplicateIntro = await admin.rpc("create_intro_request", { ...introArgs, p_client_message_id: randomUUID() });
  assert.equal(firstIntro.error, null);
  assert.equal(firstIntro.data[0].created, true);
  assert.equal(duplicateIntro.data[0].created, false);
  assert.equal(duplicateIntro.data[0].conversation_id, firstIntro.data[0].conversation_id);

  const replyId = randomUUID();
  const replyArgs = { p_sender_id: founders[0].id, p_conversation_id: firstIntro.data[0].conversation_id, p_body: "Synthetic founder reply remains free.", p_client_message_id: replyId };
  const reply = await admin.rpc("send_conversation_message", replyArgs);
  const retry = await admin.rpc("send_conversation_message", replyArgs);
  assert.equal(reply.error, null);
  assert.equal(retry.data[0].reused, true);

  const outsiderClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const signIn = await outsiderClient.auth.signInWithPassword({ email: founders[1].email, password });
  assert.equal(signIn.error, null);
  const outsiderMessages = await outsiderClient.from("messages").select("id").eq("conversation_id", firstIntro.data[0].conversation_id);
  assert.equal(outsiderMessages.error, null);
  assert.equal(outsiderMessages.data.length, 0, "RLS must hide participant messages from outsiders.");

  await admin.rpc("set_conversation_block", { p_user_id: founders[0].id, p_conversation_id: firstIntro.data[0].conversation_id, p_blocked: true });
  const blockedSend = await admin.rpc("send_conversation_message", { ...replyArgs, p_client_message_id: randomUUID(), p_body: "This must be rejected while blocked." });
  assert.match(blockedSend.error?.message ?? "", /CONVERSATION_BLOCKED/);
  console.log("Phase 4 database integration passed: concurrent cap, Demo Pro, duplicate intro, free reply, retry, RLS, and block enforcement.");
} finally {
  for (const userId of createdUsers.reverse()) await admin.auth.admin.deleteUser(userId);
}
