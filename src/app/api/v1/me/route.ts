import { apiError, apiSuccess } from "@/lib/api-response";
import { accountHome, getCurrentAccount } from "@/lib/account";
import { createClient } from "@/lib/supabase/server";
import { getFounderBillingOverview } from "@/lib/billing";

export async function GET() {
  const account = await getCurrentAccount();
  if (!account) return apiError("AUTH_REQUIRED", "Sign in to open your workspace.", 401);

  let remainingFree: number | null = null;
  let tier: "free" | "pro" = "free";
  if (account.role === "founder") {
    const billing = await getFounderBillingOverview(account.id);
    tier = billing.active ? "pro" : "free";
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("usage_reservations")
      .select("state")
      .in("state", ["reserved", "consumed"]);
    if (error) return apiError("ACCOUNT_STATE_UNAVAILABLE", "Your account state could not be loaded. Try again.", 503, true);
    remainingFree = Math.max(0, 3 - (data?.length ?? 0));
  }

  return apiSuccess({
    role: account.role,
    display_name: account.displayName,
    organization_name: account.organizationName,
    onboarding_complete: Boolean(account.organizationName),
    home_path: account.organizationName ? accountHome(account) : "/onboarding",
    tier,
    remaining_free: remainingFree,
    unread_count: 0,
  });
}
