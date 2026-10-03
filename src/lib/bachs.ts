import "server-only";

import { z } from "zod";
import { usdToMinor } from "@/lib/billing-core";

const SANDBOX_BASE_URL = "https://sandbox-api.bachs.io";
const REQUEST_TIMEOUT_MS = 10_000;

const checkoutCreateSchema = z.object({
  checkout_id: z.string().min(4),
  checkout_url: z.string().url(),
  status: z.string(),
  expires_at: z.string().datetime(),
  created_at: z.string().datetime(),
}).passthrough();

const checkoutSchema = z.object({
  checkout_id: z.string().min(4),
  status: z.string(),
  amount: z.string(),
  currency: z.string(),
  payment_status: z.string().nullable().optional(),
  customer: z.object({
    id: z.string().optional(),
    customer_id: z.string().optional(),
    email: z.string().email().optional(),
  }).nullable().optional(),
  products: z.array(z.object({
    product_id: z.string(),
    quantity: z.number().int().positive(),
    unit_amount: z.string(),
    currency: z.string(),
  }).passthrough()).nullable().optional(),
  charge: z.object({
    status: z.string(),
    subscription_id: z.string().nullable().optional(),
    invoice: z.object({
      subscription_id: z.string(),
      period_start: z.string().datetime(),
      period_end: z.string().datetime(),
    }).nullable().optional(),
  }).nullable().optional(),
}).passthrough();

const subscriptionSchema = z.object({
  id: z.string(),
  status: z.string(),
  currency: z.string(),
  amount: z.string(),
  current_period_start: z.string().datetime().nullable().optional(),
  current_period_end: z.string().datetime(),
  cancel_at_period_end: z.boolean().optional().default(false),
  customer: z.object({ customer_id: z.string(), email: z.string().email().optional() }).passthrough(),
  product: z.object({ id: z.string() }).passthrough(),
}).passthrough();

export type BachsCheckout = z.infer<typeof checkoutSchema>;
export type BachsSubscription = z.infer<typeof subscriptionSchema>;

export class BachsError extends Error {
  constructor(public readonly code: string, message: string, public readonly retryable: boolean) {
    super(message);
    this.name = "BachsError";
  }
}
export function getBachsConfig() {
  const secretKey = process.env.BACHS_SECRET_KEY;
  const webhookSecret = process.env.BACHS_WEBHOOK_SECRET;
  const productId = process.env.BACHS_FOUNDER_PRODUCT_ID;
  const configuredBase = process.env.BACHS_API_BASE_URL || SANDBOX_BASE_URL;

  if (configuredBase !== SANDBOX_BASE_URL) {
    throw new BachsError("BACHS_LIVE_DISABLED", "This build accepts only the Bachs sandbox API.", false);
  }
  if (!secretKey?.startsWith("sk_sandbox_")) {
    throw new BachsError("BACHS_NOT_CONFIGURED", "A Bachs sandbox secret key is required.", false);
  }
  if (!webhookSecret || !productId) {
    throw new BachsError("BACHS_NOT_CONFIGURED", "Bachs sandbox product and webhook configuration is incomplete.", false);
  }

  return { baseUrl: SANDBOX_BASE_URL, secretKey, webhookSecret, productId, amountMinor: 300, currency: "USD" as const };
}

async function bachsRequest(path: string, init: RequestInit, secretKey: string) {
  let response: Response;
  try {
    response = await fetch(`${SANDBOX_BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new BachsError("BACHS_UNAVAILABLE", "Bachs did not confirm the request. The checkout remains pending reconciliation.", true);
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const providerCode = body && typeof body === "object" && "error_code" in body ? String(body.error_code) : `HTTP_${response.status}`;
    throw new BachsError(`BACHS_${providerCode}`, "Bachs could not complete the sandbox request.", response.status >= 500 || response.status === 429);
  }
  return body;
}

export async function createBachsCheckout(input: {
  attemptId: string;
  reference: string;
  email: string;
  name: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const config = getBachsConfig();
  const data = await bachsRequest("/v1/checkout-sessions", {
    method: "POST",
    headers: { "Idempotency-Key": input.attemptId },
    body: JSON.stringify({
      product_cart: [{ product_id: config.productId, quantity: 1 }],
      customer: { email: input.email, name: input.name },
      billing_currency: "USD",
      payment_method_types: ["USD_CARD"],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      reference: input.reference,
      metadata: { plan: "founder-pro", environment: "sandbox" },
      expires_in_minutes: 60,
    }),
  }, config.secretKey);
  const checkout = checkoutCreateSchema.parse(data);
  const url = new URL(checkout.checkout_url);
  if (url.protocol !== "https:" || (url.hostname !== "checkout.bachs.io" && !url.hostname.endsWith(".bachs.io"))) {
    throw new BachsError("BACHS_INVALID_CHECKOUT_URL", "Bachs returned an unexpected checkout destination.", false);
  }
  return checkout;
}

export async function retrieveBachsCheckout(checkoutId: string) {
  const config = getBachsConfig();
  const data = await bachsRequest(`/v1/checkout-sessions/${encodeURIComponent(checkoutId)}`, { method: "GET" }, config.secretKey);
  return checkoutSchema.parse(data);
}

export async function retrieveBachsSubscription(subscriptionId: string) {
  const config = getBachsConfig();
  const data = await bachsRequest(`/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, { method: "GET" }, config.secretKey);
  return subscriptionSchema.parse(data);
}

export function paidCheckoutEvidence(checkout: BachsCheckout, expected: { checkoutId: string; productId: string; amountMinor: number }) {
  const product = checkout.products?.find((item) => item.product_id === expected.productId);
  const invoice = checkout.charge?.invoice;
  const customerId = checkout.customer?.id || checkout.customer?.customer_id;
  const subscriptionId = checkout.charge?.subscription_id || invoice?.subscription_id;
  if (
    checkout.checkout_id !== expected.checkoutId
    || checkout.status !== "completed"
    || checkout.payment_status !== "succeeded"
    || checkout.charge?.status.toLowerCase() !== "succeeded"
    || checkout.currency !== "USD"
    || usdToMinor(checkout.amount) !== expected.amountMinor
    || !product
    || product.quantity !== 1
    || product.currency !== "USD"
    || usdToMinor(product.unit_amount) !== expected.amountMinor
    || !customerId
    || !subscriptionId
    || !invoice
  ) {
    throw new BachsError("BACHS_PAYMENT_MISMATCH", "The paid checkout did not match the Founder Pro offer.", false);
  }
  return {
    customerId,
    subscriptionId,
    periodStart: invoice.period_start,
    periodEnd: invoice.period_end,
  };
}

export function mapBachsSubscriptionStatus(status: string) {
  if (status === "active") return "active" as const;
  if (status === "past_due") return "past_due" as const;
  if (status === "unpaid") return "unpaid" as const;
  if (status === "canceled" || status === "cancelled") return "cancelled" as const;
  return "pending" as const;
}
