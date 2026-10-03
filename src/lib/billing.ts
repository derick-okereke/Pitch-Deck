import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { applicationOrigin } from "@/lib/site-url";
import {
  BachsError,
  createBachsCheckout,
  getBachsConfig,
  mapBachsSubscriptionStatus,
  paidCheckoutEvidence,
  retrieveBachsCheckout,
  retrieveBachsSubscription,
} from "@/lib/bachs";

export type FounderBillingOverview = {
  active: boolean;
  status: "free" | "pending" | "active" | "past_due" | "unpaid" | "cancelled" | "expired";
  paidThrough: string | null;
  cancelAtPeriodEnd: boolean;
  latestCheckoutState: string | null;
};

export async function getFounderBillingOverview(accountId: string): Promise<FounderBillingOverview> {
  const admin = createAdminClient();
  const [{ data: subscription }, { data: checkout }] = await Promise.all([
    admin.from("billing_subscriptions").select("status, current_period_end, cancel_at_period_end, revoked_at").eq("account_id", accountId).maybeSingle(),
    admin.from("billing_checkout_attempts").select("state").eq("account_id", accountId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const active = Boolean(
    subscription
    && !subscription.revoked_at
    && ["active", "past_due"].includes(subscription.status)
    && new Date(subscription.current_period_end).getTime() > Date.now(),
  );
  const pending = checkout && ["creating", "open", "pending_verification"].includes(checkout.state);
  return {
    active,
    status: active ? subscription!.status as "active" | "past_due" : pending ? "pending" : subscription?.status ?? "free",
    paidThrough: subscription?.current_period_end ?? null,
    cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
    latestCheckoutState: checkout?.state ?? null,
  };
}
export async function beginFounderProCheckout(account: { id: string; email: string | null; displayName: string; role: string | null }) {
  if (account.role !== "founder") throw new BachsError("FOUNDER_REQUIRED", "Founder checkout is available only to founder accounts.", false);
  if (!account.email) throw new BachsError("EMAIL_REQUIRED", "A verified account email is required for recurring billing.", false);

  const config = getBachsConfig();
  const admin = createAdminClient();
  const overview = await getFounderBillingOverview(account.id);
  if (overview.active) throw new BachsError("ALREADY_PRO", "Founder Pro is already active.", false);

  const { data: reusable } = await admin
    .from("billing_checkout_attempts")
    .select("id, provider_checkout_id, checkout_url, expires_at")
    .eq("account_id", account.id)
    .eq("state", "open")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (reusable?.checkout_url && reusable.provider_checkout_id) {
    return { checkoutId: reusable.provider_checkout_id, checkoutUrl: reusable.checkout_url, reused: true };
  }

  const attemptId = crypto.randomUUID();
  const reference = `founder-pro-${attemptId}`;
  const { error: insertError } = await admin.from("billing_checkout_attempts").insert({
    id: attemptId,
    account_id: account.id,
    idempotency_key: attemptId,
    reference,
    state: "creating",
    environment: "sandbox",
    product_id: config.productId,
    currency: config.currency,
    amount_minor: config.amountMinor,
  });
  if (insertError) throw new BachsError("CHECKOUT_STATE_FAILED", "The checkout could not be prepared safely.", true);

  const origin = applicationOrigin();
  try {
    const checkout = await createBachsCheckout({
      attemptId,
      reference,
      email: account.email,
      name: account.displayName,
      successUrl: `${origin}/founder/billing/return`,
      cancelUrl: `${origin}/founder/billing?checkout=cancelled`,
    });
    const { error } = await admin.from("billing_checkout_attempts").update({
      provider_checkout_id: checkout.checkout_id,
      checkout_url: checkout.checkout_url,
      state: "open",
      expires_at: checkout.expires_at,
      error_code: null,
    }).eq("id", attemptId).eq("account_id", account.id);
    if (error) throw new BachsError("CHECKOUT_STATE_FAILED", "The checkout was created but could not be bound safely. Contact the demo operator before retrying.", true);
    return { checkoutId: checkout.checkout_id, checkoutUrl: checkout.checkout_url, reused: false };
  } catch (error) {
    const providerError = error instanceof BachsError ? error : new BachsError("BACHS_INVALID_RESPONSE", "Bachs returned an invalid sandbox response.", true);
    await admin.from("billing_checkout_attempts").update({
      state: providerError.code === "BACHS_UNAVAILABLE" ? "pending_verification" : "failed",
      error_code: providerError.code,
    }).eq("id", attemptId);
    throw providerError;
  }
}

export async function reconcilePaidCheckout(checkoutId: string, eventId: string) {
  const config = getBachsConfig();
  const checkout = await retrieveBachsCheckout(checkoutId);
  const evidence = paidCheckoutEvidence(checkout, { checkoutId, productId: config.productId, amountMinor: config.amountMinor });
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("activate_bachs_founder_subscription", {
    p_event_id: eventId,
    p_checkout_id: checkoutId,
    p_customer_id: evidence.customerId,
    p_subscription_id: evidence.subscriptionId,
    p_product_id: config.productId,
    p_currency: config.currency,
    p_amount_minor: config.amountMinor,
    p_status: "active",
    p_period_start: evidence.periodStart,
    p_period_end: evidence.periodEnd,
    p_cancel_at_period_end: false,
  });
  if (error || !data) throw new BachsError("ENTITLEMENT_UPDATE_FAILED", error?.message || "The paid checkout could not be applied.", true);
  return data;
}

export async function reconcileSubscription(subscriptionId: string, eventId: string) {
  const subscription = await retrieveBachsSubscription(subscriptionId);
  const config = getBachsConfig();
  if (
    subscription.id !== subscriptionId
    || subscription.product.id !== config.productId
    || subscription.currency !== config.currency
    || subscription.amount !== "3.00"
  ) throw new BachsError("BACHS_SUBSCRIPTION_MISMATCH", "The subscription does not match Founder Pro.", false);

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("update_bachs_founder_subscription", {
    p_event_id: eventId,
    p_subscription_id: subscription.id,
    p_status: mapBachsSubscriptionStatus(subscription.status),
    p_period_start: subscription.current_period_start ?? null,
    p_period_end: subscription.current_period_end,
    p_cancel_at_period_end: subscription.cancel_at_period_end,
  });
  if (error || !data) throw new BachsError("ENTITLEMENT_UPDATE_FAILED", error?.message || "The subscription could not be updated.", true);
  return data;
}
