import { apiError, apiSuccess } from "@/lib/api-response";
import { getInvestorAccess, getStartupDetail } from "@/lib/marketplace-data";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getInvestorAccess();
  if (access.status === "anonymous") return apiError("AUTH_REQUIRED", "Sign in to view this startup.", 401);
  if (access.status === "onboarding" || access.status === "profile_required") return apiError("ONBOARDING_REQUIRED", "Complete your investor profile before viewing startup details.", 403);
  if (access.status !== "ready") return apiError("INVESTOR_REQUIRED", "Startup discovery is available to investor accounts.", 403);
  try {
    const detail = await getStartupDetail((await params).id);
    return detail ? apiSuccess(detail) : apiError("STARTUP_NOT_FOUND", "This startup is not currently listed.", 404);
  } catch {
    return apiError("STARTUP_UNAVAILABLE", "This startup could not be loaded. Try again.", 503, true);
  }
}
