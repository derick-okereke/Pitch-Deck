import { apiError, apiSuccess } from "@/lib/api-response";
import { discoveryFilterSchema } from "@/lib/marketplace";
import { getDiscovery, getInvestorAccess } from "@/lib/marketplace-data";

export async function GET(request: Request) {
  const access = await getInvestorAccess();
  if (access.status === "anonymous") return apiError("AUTH_REQUIRED", "Sign in to use investor discovery.", 401);
  if (access.status === "onboarding" || access.status === "profile_required") return apiError("ONBOARDING_REQUIRED", "Complete your investor profile before using discovery.", 403);
  if (access.status !== "ready") return apiError("INVESTOR_REQUIRED", "Discovery is available to investor accounts.", 403);

  const url = new URL(request.url);
  const parsed = discoveryFilterSchema.safeParse({
    q: url.searchParams.get("q") ?? "",
    sector: url.searchParams.get("sector") ?? "",
    stage: url.searchParams.get("stage") ?? "",
    page: url.searchParams.get("page") ?? "1",
  });
  if (!parsed.success) return apiError("FILTERS_INVALID", "One or more discovery filters are invalid.", 422);
  try {
    return apiSuccess(await getDiscovery(parsed.data));
  } catch {
    return apiError("DISCOVERY_UNAVAILABLE", "Discovery could not be loaded. Try again.", 503, true);
  }
}
