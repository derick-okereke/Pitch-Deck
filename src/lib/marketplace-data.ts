import "server-only";

import { cache } from "react";
import { getCurrentAccount } from "@/lib/account";
import { founderDraftSchema, type FounderDraft } from "@/lib/profile";
import { sectorLabels, stageLabels } from "@/lib/investor-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasProDiscoveryFilters, matchesDiscoveryFilters, type DiscoveryCard, type DiscoveryFilters, type DiscoveryResult } from "@/lib/marketplace";

export const getInvestorAccess = cache(async () => {
  const account = await getCurrentAccount();
  if (!account) return { status: "anonymous" as const, account: null, profile: null };
  if (!account.organizationName) return { status: "onboarding" as const, account, profile: null };
  if (account.role !== "investor") return { status: "wrong_role" as const, account, profile: null };
  const supabase = await createClient();
  const admin = createAdminClient();
  const [{ data: profile, error }, { data: entitlement }] = await Promise.all([
    supabase.from("investor_profiles").select("user_id, sectors, stages, countries").eq("user_id", account.id).maybeSingle(),
    admin.from("demo_entitlements").select("expires_at").eq("account_id", account.id).eq("role", "investor").eq("tier", "pro").gt("expires_at", new Date().toISOString()).maybeSingle(),
  ]);
  if (error || !profile) return { status: "profile_required" as const, account, profile: null };
  const demoPro = process.env.DEMO_MODE === "true" && Boolean(entitlement);
  return { status: "ready" as const, account, profile, demoPro, demoProExpiresAt: demoPro ? entitlement?.expires_at ?? null : null };
});

function formatMoney(minor: string, currency: "NGN" | "USD") {
  const whole = Number(BigInt(minor) / BigInt(100));
  return currency === "NGN"
    ? `NGN ${new Intl.NumberFormat("en-NG").format(whole)}`
    : `$${new Intl.NumberFormat("en-US").format(whole)} USD`;
}

function location(profile: FounderDraft) {
  const country = new Intl.DisplayNames(["en"], { type: "region" }).of(profile.country) ?? profile.country;
  return profile.city ? `${profile.city}, ${country}` : country;
}

function cardFrom(profile: FounderDraft, startup: { id: string; is_demo: boolean }, score: number): DiscoveryCard {
  return {
    id: startup.id,
    name: profile.name,
    tagline: profile.tagline,
    sector: sectorLabels[profile.sector],
    stage: stageLabels[profile.stage],
    location: location(profile),
    ask: formatMoney(profile.ask_amount_minor, profile.ask_currency),
    score: Math.floor(score + 0.5),
    verified: false,
    isDemo: startup.is_demo,
  };
}

async function publishedRows() {
  const access = await getInvestorAccess();
  if (access.status !== "ready") throw new Error("INVESTOR_PROFILE_REQUIRED");
  const admin = createAdminClient();
  const { data: startups, error: startupError } = await admin.from("startups")
    .select("id, published_revision_id, is_demo, updated_at")
    .eq("publication_status", "published")
    .not("published_revision_id", "is", null);
  if (startupError) throw new Error("DISCOVERY_UNAVAILABLE");
  const revisionIds = (startups ?? []).map((startup) => startup.published_revision_id).filter((id): id is string => Boolean(id));
  if (revisionIds.length === 0) return [];

  const [{ data: revisions, error: revisionError }, { data: reviews, error: reviewError }] = await Promise.all([
    admin.from("profile_revisions").select("id, payload, created_at").in("id", revisionIds),
    admin.from("profile_reviews").select("revision_id, content_points, completed_at, state, ratings").in("revision_id", revisionIds).eq("state", "passed"),
  ]);
  if (revisionError || reviewError) throw new Error("DISCOVERY_UNAVAILABLE");

  const revisionMap = new Map((revisions ?? []).map((revision) => [revision.id, revision]));
  const reviewMap = new Map((reviews ?? []).map((review) => [review.revision_id, review]));
  return (startups ?? []).flatMap((startup) => {
    const revision = startup.published_revision_id ? revisionMap.get(startup.published_revision_id) : null;
    const review = startup.published_revision_id ? reviewMap.get(startup.published_revision_id) : null;
    const parsed = founderDraftSchema.safeParse(revision?.payload);
    if (!revision || !review || !parsed.success || review.content_points === null) return [];
    return [{ startup, revision, review, profile: parsed.data, card: cardFrom(parsed.data, startup, Number(review.content_points)) }];
  });
}

export async function getDiscovery(filters: DiscoveryFilters): Promise<DiscoveryResult> {
  const access = await getInvestorAccess();
  if (access.status !== "ready") throw new Error("INVESTOR_PROFILE_REQUIRED");
  if (hasProDiscoveryFilters(filters) && !access.demoPro) throw new Error("INVESTOR_PRO_REQUIRED");
  const rows = await publishedRows();
  const filtered = rows.filter(({ profile, card }) => {
    const searchable = `${profile.name} ${profile.tagline} ${profile.problem} ${profile.solution}`.toLocaleLowerCase();
    return matchesDiscoveryFilters({ searchableText: searchable, sector: profile.sector, stage: profile.stage, country: profile.country, askCurrency: profile.ask_currency, askMinor: profile.ask_amount_minor, score: card.score, verified: card.verified }, filters);
  }).sort((a, b) => b.card.score - a.card.score
    || Date.parse(b.review.completed_at ?? b.revision.created_at) - Date.parse(a.review.completed_at ?? a.revision.created_at)
    || a.startup.id.localeCompare(b.startup.id));

  const pageSize = 12 as const;
  const pageCount = Math.ceil(filtered.length / pageSize);
  const page = pageCount === 0 ? 1 : Math.min(filters.page, pageCount);
  return { items: filtered.slice((page - 1) * pageSize, page * pageSize).map((row) => row.card), total: filtered.length, page, pageSize, pageCount };
}

export async function getStartupDetail(id: string) {
  const access = await getInvestorAccess();
  if (access.status !== "ready") return { status: "not_found" as const };
  const rows = await publishedRows();
  const match = rows.find((row) => row.startup.id === id);
  if (!match) return { status: "not_found" as const };
  const admin = createAdminClient();
  const { data: reservation, error } = await admin.rpc("reserve_investor_detail_view", {
    p_investor_id: access.account.id,
    p_startup_id: id,
    p_demo_mode: process.env.DEMO_MODE === "true",
    p_limit: 20,
  });
  if (error || !reservation?.[0]) throw new Error("DETAIL_VIEW_UNAVAILABLE");
  const usage = reservation[0];
  if (!usage.allowed) return { status: "limit_reached" as const, usage };
  return { status: "ok" as const, usage, detail: {
    ...match.card,
    profile: match.profile,
    reviewedAt: match.review.completed_at ?? match.revision.created_at,
    ratings: match.review.ratings,
  } };
}
