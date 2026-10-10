import { withWatchupRequest } from "@/lib/telemetry/watchup-server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getCurrentAccount } from "@/lib/account";
import { getFounderBillingOverview } from "@/lib/billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { sha256 } from "@/lib/billing-core";
import { BachsError, retrieveBachsCheckout } from "@/lib/bachs";
import { reconcilePaidCheckout } from "@/lib/billing";

export const runtime = "nodejs";

async function handleGET(request: Request) {
  const account = await getCurrentAccount();
  if (!account) return apiError("AUTH_REQUIRED", "Sign in to continue.", 401);
  if (account.role !== "founder") return apiError("FOUNDER_REQUIRED", "Founder billing is unavailable for this account.", 403);

  const checkoutId = new URL(request.url).searchParams.get("checkout_id");
  if (checkoutId) {
    const admin = createAdminClient();
    const { data } = await admin.from("billing_checkout_attempts").select("state").eq("account_id", account.id).eq("provider_checkout_id", checkoutId).maybeSingle();
    if (!data) return apiError("CHECKOUT_NOT_FOUND", "Checkout not found.", 404);
    if (data.state === "open") {
      const reconciliationId = `reconcile:${checkoutId}`;
      try {
        const checkout = await retrieveBachsCheckout(checkoutId);
        if (checkout.status === "completed" && checkout.payment_status === "succeeded") {
          await admin.from("billing_webhook_receipts").upsert({
            provider_event_id: reconciliationId,
            event_type: "checkout.return_reconciled",
            environment: "sandbox",
            payload_hash: sha256(reconciliationId),
            state: "received",
          }, { onConflict: "provider_event_id", ignoreDuplicates: true });
          await reconcilePaidCheckout(checkoutId, reconciliationId);
        }
      } catch (error) {
        if (!(error instanceof BachsError) || !error.retryable) {
          // A return-page query never grants access from its own parameters.
          // The signed webhook remains able to verify or quarantine the event.
        }
      }
    }
  }
  return apiSuccess(await getFounderBillingOverview(account.id));
}

export const GET = withWatchupRequest("/api/v1/billing/status", "GET", handleGET);
