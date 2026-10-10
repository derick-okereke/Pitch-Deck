import { apiError, apiSuccess } from "@/lib/api-response";
import { getCurrentAccount } from "@/lib/account";
import { BachsError } from "@/lib/bachs";
import { beginFounderProCheckout } from "@/lib/billing";
import { captureServerFailure, withWatchupRequest } from "@/lib/telemetry/watchup-server";

export const runtime = "nodejs";

async function handlePOST() {
  const account = await getCurrentAccount();
  if (!account) return apiError("AUTH_REQUIRED", "Sign in to continue.", 401);
  try {
    const checkout = await beginFounderProCheckout(account);
    return apiSuccess({ checkout_id: checkout.checkoutId, checkout_url: checkout.checkoutUrl, reused: checkout.reused }, 201);
  } catch (error) {
    if (error instanceof BachsError) {
      captureServerFailure("billing_checkout", error.code);
      const status = error.code === "ALREADY_PRO" ? 409 : error.code === "FOUNDER_REQUIRED" ? 403 : error.code === "BACHS_NOT_CONFIGURED" ? 503 : 502;
      return apiError(error.code, error.message, status, error.retryable);
    }
    captureServerFailure("billing_checkout", "CHECKOUT_FAILED");
    return apiError("CHECKOUT_FAILED", "The sandbox checkout could not be started.", 500, true);
  }
}

export const POST = withWatchupRequest("/api/v1/billing/checkout", "POST", handlePOST);
