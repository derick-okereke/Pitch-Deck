import { sha256, verifyBachsSignature } from "@/lib/billing-core";
import { BachsError, getBachsConfig } from "@/lib/bachs";
import { reconcilePaidCheckout, reconcileSubscription } from "@/lib/billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { captureServerFailure, withWatchupRequest } from "@/lib/telemetry/watchup-server";

export const runtime = "nodejs";

type WebhookEnvelope = { id?: unknown; type?: unknown; data?: unknown };

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function firstString(source: Record<string, unknown> | null, keys: string[]) {
  for (const key of keys) if (typeof source?.[key] === "string") return source[key] as string;
  return null;
}

async function handlePOST(request: Request) {
  let config;
  try { config = getBachsConfig(); } catch { return new Response("Webhook unavailable", { status: 503 }); }
  const rawBody = await request.text();
  const verified = verifyBachsSignature({
    rawBody,
    secret: config.webhookSecret,
    signatureV2: request.headers.get("x-bachs-signature-v2"),
    timestamp: request.headers.get("x-bachs-timestamp"),
    signature: request.headers.get("x-bachs-signature"),
  });
  if (!verified) return new Response("Invalid signature", { status: 401 });

  let envelope: WebhookEnvelope;
  try { envelope = JSON.parse(rawBody) as WebhookEnvelope; } catch { return new Response("Invalid JSON", { status: 400 }); }
  if (typeof envelope.id !== "string" || typeof envelope.type !== "string") return new Response("Invalid event", { status: 400 });

  const admin = createAdminClient();
  const { error: receiptError } = await admin.from("billing_webhook_receipts").insert({
    provider_event_id: envelope.id,
    event_type: envelope.type,
    environment: "sandbox",
    payload_hash: sha256(rawBody),
    state: "received",
  });
  if (receiptError) {
    const { data: existing } = await admin.from("billing_webhook_receipts").select("payload_hash, state").eq("provider_event_id", envelope.id).maybeSingle();
    if (!existing || existing.payload_hash !== sha256(rawBody)) return new Response("Event conflict", { status: 409 });
    if (["processed", "ignored", "quarantined"].includes(existing.state)) return new Response("ok");
  }

  const data = object(envelope.data);
  const invoice = object(data?.invoice);
  const subscriptionObject = object(data?.subscription);
  try {
    if (["collection.succeeded", "checkout.completed"].includes(envelope.type)) {
      const checkoutId = firstString(data, ["checkout_id", "checkout"]);
      if (!checkoutId) throw new BachsError("CHECKOUT_ID_MISSING", "The payment event has no checkout binding.", false);
      await reconcilePaidCheckout(checkoutId, envelope.id);
    } else if (["invoice.paid", "invoice.payment_failed"].includes(envelope.type) || envelope.type.startsWith("customer.subscription.")) {
      const subscriptionId = firstString(data, ["subscription_id", "id"])
        || firstString(invoice, ["subscription_id"])
        || firstString(subscriptionObject, ["id", "subscription_id"]);
      if (!subscriptionId) throw new BachsError("SUBSCRIPTION_ID_MISSING", "The subscription event has no subscription binding.", false);
      await reconcileSubscription(subscriptionId, envelope.id);
    } else {
      await admin.from("billing_webhook_receipts").update({ state: "ignored", processed_at: new Date().toISOString() }).eq("provider_event_id", envelope.id);
    }
    return new Response("ok");
  } catch (error) {
    const providerError = error instanceof BachsError ? error : new BachsError("WEBHOOK_PROCESSING_FAILED", "Webhook processing failed.", true);
    captureServerFailure("billing_webhook", providerError.code);
    await admin.from("billing_webhook_receipts").update({
      state: providerError.retryable ? "failed" : "quarantined",
      error_code: providerError.code,
      processed_at: new Date().toISOString(),
    }).eq("provider_event_id", envelope.id);
    return new Response(providerError.retryable ? "Retry later" : "Event quarantined", { status: providerError.retryable ? 500 : 200 });
  }
}

export const POST = withWatchupRequest("/api/v1/billing/webhook", "POST", handlePOST);
