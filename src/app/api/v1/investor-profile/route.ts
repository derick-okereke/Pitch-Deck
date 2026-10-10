import { withWatchupRequest } from "@/lib/telemetry/watchup-server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getCurrentAccount } from "@/lib/account";
import { flattenInvestorErrors, investorProfileSchema } from "@/lib/investor-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function handleGET() {
  const account = await getCurrentAccount();
  if (!account) return apiError("AUTH_REQUIRED", "Sign in to open your investor profile.", 401);
  if (account.role !== "investor") return apiError("INVESTOR_REQUIRED", "This profile is available to investor accounts.", 403);

  const supabase = await createClient();
  const { data, error } = await supabase.from("investor_profiles").select("*").eq("user_id", account.id).maybeSingle();
  if (error) return apiError("PROFILE_UNAVAILABLE", "Your investor profile could not be loaded. Try again.", 503, true);
  return apiSuccess(data);
}

async function handlePUT(request: Request) {
  const account = await getCurrentAccount();
  if (!account) return apiError("AUTH_REQUIRED", "Sign in to save your investor profile.", 401);
  if (account.role !== "investor") return apiError("INVESTOR_REQUIRED", "Only investor accounts can save this profile.", 403);

  const body = await request.json().catch(() => null);
  const parsed = investorProfileSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("PROFILE_INVALID", "Check the highlighted fields and try again.", 422, false, flattenInvestorErrors(parsed.error));
  }

  const profile = parsed.data;
  const admin = createAdminClient();
  const { data, error } = await admin.from("investor_profiles").upsert({
    user_id: account.id,
    ...profile,
    check_min_minor: Number(profile.check_min_minor),
    check_max_minor: Number(profile.check_max_minor),
  }, { onConflict: "user_id" }).select("updated_at").single();

  if (error) return apiError("PROFILE_SAVE_FAILED", "Your profile was not saved. Your browser copy is still available; try again.", 503, true);
  return apiSuccess({ saved_at: data.updated_at });
}

export const GET = withWatchupRequest("/api/v1/investor-profile", "GET", handleGET);
export const PUT = withWatchupRequest("/api/v1/investor-profile", "PUT", handlePUT);
