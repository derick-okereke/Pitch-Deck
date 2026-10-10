import { withWatchupRequest } from "@/lib/telemetry/watchup-server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { discoveryFilterSchema } from "@/lib/marketplace";
import { getDiscovery, getInvestorAccess } from "@/lib/marketplace-data";

async function handleGET(request: Request) {
  const access = await getInvestorAccess();
  if (access.status === "anonymous") return apiError("AUTH_REQUIRED", "Sign in to use investor discovery.", 401);
  if (access.status === "onboarding" || access.status === "profile_required") return apiError("ONBOARDING_REQUIRED", "Complete your investor profile before using discovery.", 403);
  if (access.status !== "ready") return apiError("INVESTOR_REQUIRED", "Discovery is available to investor accounts.", 403);

  const url = new URL(request.url);
  const parsed = discoveryFilterSchema.safeParse({
    q: url.searchParams.get("q") ?? "",
    sectors: url.searchParams.getAll("sector"),
    stages: url.searchParams.getAll("stage"),
    countries: url.searchParams.getAll("country"),
    ask_currency: url.searchParams.get("ask_currency") ?? "",
    ask_min: url.searchParams.get("ask_min") ?? "",
    ask_max: url.searchParams.get("ask_max") ?? "",
    minimum_score: url.searchParams.get("minimum_score") ?? "",
    verified_only: url.searchParams.get("verified_only") ?? "",
    page: url.searchParams.get("page") ?? "1",
  });
  if (!parsed.success) return apiError("FILTERS_INVALID", "One or more discovery filters are invalid.", 422);
  try {
    return apiSuccess(await getDiscovery(parsed.data));
  } catch (error) {
    if (error instanceof Error && error.message === "INVESTOR_PRO_REQUIRED") return apiError("INVESTOR_PRO_REQUIRED", "Investor Pro is required for these filters.", 403);
    return apiError("DISCOVERY_UNAVAILABLE", "Discovery could not be loaded. Try again.", 503, true);
  }
}

export const GET = withWatchupRequest("/api/v1/startups", "GET", handleGET);
