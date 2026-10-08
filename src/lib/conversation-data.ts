import "server-only";

import { cache } from "react";
import { getCurrentAccount } from "@/lib/account";
import type { ConversationDetail, ConversationMessage, ConversationSummary } from "@/lib/conversation";
import { investorTypeLabels } from "@/lib/investor-profile";
import { founderDraftSchema, type FounderDraft } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";

type ConversationRow = {
  id: string;
  investor_id: string;
  startup_id: string;
  founder_id: string;
  next_sequence: number;
  created_at: string;
  last_message_at: string;
};

function unique(values: string[]) {
  return [...new Set(values)];
}

function parsedProfile(payload: unknown): FounderDraft | null {
  const parsed = founderDraftSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

function preview(body: string) {
  const oneLine = body.replace(/\s+/g, " ").trim();
  return oneLine.length > 92 ? `${oneLine.slice(0, 89)}…` : oneLine;
}

export const getConversationAccount = cache(async () => {
  const account = await getCurrentAccount();
  if (!account || !account.organizationName || !account.role) return null;
  return account;
});

export async function getIntroState(startupId: string) {
  const account = await getConversationAccount();
  if (!account || account.role !== "investor") return { existingConversationId: null, canRequest: false };
  const admin = createAdminClient();
  const [{ data: existing }, { data: entitlement }] = await Promise.all([
    admin.from("conversations").select("id").eq("investor_id", account.id).eq("startup_id", startupId).maybeSingle(),
    admin.from("demo_entitlements").select("expires_at").eq("account_id", account.id).eq("role", "investor").eq("tier", "pro").gt("expires_at", new Date().toISOString()).maybeSingle(),
  ]);
  return {
    existingConversationId: existing?.id ?? null,
    canRequest: process.env.DEMO_MODE === "true" && Boolean(entitlement),
  };
}

export async function getConversationList(): Promise<ConversationSummary[]> {
  const account = await getConversationAccount();
  if (!account) return [];
  const admin = createAdminClient();
  const { data: conversationData, error } = await admin.from("conversations")
    .select("id, investor_id, startup_id, founder_id, next_sequence, created_at, last_message_at")
    .or(`investor_id.eq.${account.id},founder_id.eq.${account.id}`)
    .order("last_message_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(20);
  if (error) throw new Error("CONVERSATIONS_UNAVAILABLE");
  const conversations = (conversationData ?? []) as ConversationRow[];
  if (conversations.length === 0) return [];

  const conversationIds = conversations.map(({ id }) => id);
  const startupIds = unique(conversations.map(({ startup_id }) => startup_id));
  const investorIds = unique(conversations.map(({ investor_id }) => investor_id));
  const [{ data: startups }, { data: investorProfiles }, { data: accounts }, { data: reads }, { data: messages }] = await Promise.all([
    admin.from("startups").select("id, published_revision_id, publication_status").in("id", startupIds),
    admin.from("investor_profiles").select("user_id, full_name, investor_type, firm_name, professional_title").in("user_id", investorIds),
    admin.from("accounts").select("id, display_name").in("id", investorIds),
    admin.from("conversation_reads").select("conversation_id, last_read_sequence").eq("user_id", account.id).in("conversation_id", conversationIds),
    admin.from("messages").select("conversation_id, body, sequence, created_at").in("conversation_id", conversationIds).order("created_at", { ascending: false }).limit(500),
  ]);
  const revisionIds = (startups ?? []).flatMap((startup) => startup.published_revision_id ? [startup.published_revision_id] : []);
  const { data: revisions } = revisionIds.length
    ? await admin.from("profile_revisions").select("id, payload").in("id", revisionIds)
    : { data: [] };

  const startupMap = new Map((startups ?? []).map((row) => [row.id, row]));
  const revisionMap = new Map((revisions ?? []).map((row) => [row.id, parsedProfile(row.payload)]));
  const investorMap = new Map((investorProfiles ?? []).map((row) => [row.user_id, row]));
  const accountMap = new Map((accounts ?? []).map((row) => [row.id, row]));
  const readMap = new Map((reads ?? []).map((row) => [row.conversation_id, Number(row.last_read_sequence)]));
  const latestMap = new Map<string, { body: string; sequence: number; created_at: string }>();
  for (const message of messages ?? []) if (!latestMap.has(message.conversation_id)) latestMap.set(message.conversation_id, message);

  return conversations.map((conversation) => {
    const startup = startupMap.get(conversation.startup_id);
    const profile = startup?.published_revision_id ? revisionMap.get(startup.published_revision_id) : null;
    const investor = investorMap.get(conversation.investor_id);
    const investorAccount = accountMap.get(conversation.investor_id);
    const latest = latestMap.get(conversation.id);
    const startupName = profile?.name ?? "Startup conversation";
    const counterpartName = account.role === "investor" ? startupName : investor?.full_name ?? investorAccount?.display_name ?? "Investor";
    const counterpartMeta = account.role === "investor"
      ? `Founder · ${startupName}`
      : [investor?.professional_title, investor?.firm_name].filter(Boolean).join(" · ") || (investor ? investorTypeLabels[investor.investor_type] : "Investor");
    return {
      id: conversation.id,
      startupId: conversation.startup_id,
      startupName,
      counterpartName,
      counterpartMeta,
      lastMessage: latest ? preview(latest.body) : "Introduction opened",
      lastMessageAt: latest?.created_at ?? conversation.last_message_at,
      unreadCount: Math.max(0, conversation.next_sequence - 1 - (readMap.get(conversation.id) ?? 0)),
      listed: startup?.publication_status === "published",
    };
  });
}

export async function getConversationDetail(conversationId: string): Promise<ConversationDetail | null> {
  const account = await getConversationAccount();
  if (!account) return null;
  const admin = createAdminClient();
  const { data: rawConversation } = await admin.from("conversations")
    .select("id, investor_id, startup_id, founder_id, next_sequence, created_at, last_message_at")
    .eq("id", conversationId)
    .maybeSingle();
  const conversation = rawConversation as ConversationRow | null;
  if (!conversation || (conversation.investor_id !== account.id && conversation.founder_id !== account.id)) return null;

  const [{ data: startup }, { data: investor }, { data: investorAccount }, { data: rawMessages }, { data: blocks }] = await Promise.all([
    admin.from("startups").select("id, published_revision_id, publication_status").eq("id", conversation.startup_id).maybeSingle(),
    admin.from("investor_profiles").select("user_id, full_name, investor_type, firm_name, professional_title, bio, linkedin_url, domain_signal").eq("user_id", conversation.investor_id).maybeSingle(),
    admin.from("accounts").select("id, display_name").eq("id", conversation.investor_id).maybeSingle(),
    admin.from("messages").select("id, client_message_id, sender_id, sequence, body, created_at").eq("conversation_id", conversation.id).order("sequence", { ascending: false }).limit(50),
    admin.from("conversation_blocks").select("blocker_id").eq("conversation_id", conversation.id),
  ]);
  const { data: revision } = startup?.published_revision_id
    ? await admin.from("profile_revisions").select("payload").eq("id", startup.published_revision_id).maybeSingle()
    : { data: null };
  const profile = parsedProfile(revision?.payload);
  const startupName = profile?.name ?? "Startup conversation";
  const currentRole = account.role as "founder" | "investor";
  const messages: ConversationMessage[] = (rawMessages ?? []).reverse().map((message) => ({
    id: message.id,
    clientMessageId: message.client_message_id,
    senderId: message.sender_id,
    sequence: Number(message.sequence),
    body: message.body,
    createdAt: message.created_at,
  }));
  const blockerIds = new Set((blocks ?? []).map(({ blocker_id }) => blocker_id));
  return {
    id: conversation.id,
    startupId: conversation.startup_id,
    startupName,
    startupTagline: profile?.tagline ?? "This startup is no longer listed.",
    listed: startup?.publication_status === "published",
    currentUserId: account.id,
    currentRole,
    counterpart: currentRole === "founder" ? {
      name: investor?.full_name ?? investorAccount?.display_name ?? "Investor",
      meta: [investor?.professional_title, investor?.firm_name].filter(Boolean).join(" · ") || (investor ? investorTypeLabels[investor.investor_type] : "Investor"),
      bio: investor?.bio ?? null,
      linkedinUrl: investor?.linkedin_url ?? null,
      domainSignal: investor?.domain_signal ?? false,
    } : {
      name: startupName,
      meta: `Founder · ${startupName}`,
      bio: profile?.tagline ?? null,
      linkedinUrl: null,
      domainSignal: false,
    },
    messages,
    blocked: blockerIds.size > 0,
    blockedByMe: blockerIds.has(account.id),
    highestSequence: conversation.next_sequence - 1,
  };
}

export async function getUnreadConversationCount() {
  const account = await getConversationAccount();
  if (!account) return 0;
  const admin = createAdminClient();
  const pageSize = 50;
  let total = 0;

  // Count incoming messages across every conversation, not only the inbox's first page.
  for (let offset = 0; ; offset += pageSize) {
    const { data: conversations, error } = await admin.from("conversations")
      .select("id, next_sequence")
      .eq(account.role === "founder" ? "founder_id" : "investor_id", account.id)
      .order("id")
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error("UNREAD_COUNT_UNAVAILABLE");
    if (!conversations?.length) break;
    const { data: reads, error: readError } = await admin.from("conversation_reads")
      .select("conversation_id, last_read_sequence")
      .eq("user_id", account.id)
      .in("conversation_id", conversations.map(({ id }) => id));
    if (readError) throw new Error("UNREAD_COUNT_UNAVAILABLE");
    const readMap = new Map((reads ?? []).map((read) => [read.conversation_id, Number(read.last_read_sequence)]));
    const filters = conversations.flatMap(({ id, next_sequence }) => {
      const lastRead = readMap.get(id) ?? 0;
      return next_sequence - 1 > lastRead ? [`and(conversation_id.eq.${id},sequence.gt.${lastRead})`] : [];
    });
    if (filters.length) {
      const { count, error: countError } = await admin.from("messages")
        .select("id", { count: "exact", head: true })
        .neq("sender_id", account.id)
        .or(filters.join(","));
      if (countError || count === null) throw new Error("UNREAD_COUNT_UNAVAILABLE");
      total += count;
    }
    if (conversations.length < pageSize) break;
  }
  return total;
}
