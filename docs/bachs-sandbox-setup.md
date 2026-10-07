# Bachs sandbox setup for Founder Pro

This build accepts Bachs sandbox credentials only. The working offer is **Founder Pro — USD 3.00 every month, no trial**. It is a demonstration subscription and does not move real money.

## 1. Enter the sandbox organization

1. Sign in to the Bachs dashboard.
2. Open the organization switcher at the upper left.
3. Select **Sandbox**. Confirm that the dashboard identifies the sandbox organization before creating anything.

Sandbox products, keys, webhook endpoints, customers, and transactions are isolated from production. A production key will be rejected by this application.

## 2. Create the recurring product

1. Open **Products** and create a product named `Founder Pro`.
2. Add a fixed recurring price:
   - Currency: `USD`
   - Amount: `3.00`
   - Billing interval: `month`
   - Frequency: `1`
   - Trial: none
3. Save the product and copy its `prod_...` identifier into `.env.local` as `BACHS_FOUNDER_PRODUCT_ID`.

The application sends the product ID to checkout and independently verifies that the returned line item is the same product, quantity one, USD 3.00.

## 3. Create a sandbox API key

1. While still inside the sandbox organization, open **Developer Portal → API Keys**.
2. Create a sandbox secret key with permission to create and retrieve checkout sessions and retrieve subscriptions.
3. Copy the secret once into `.env.local` as `BACHS_SECRET_KEY`.
4. Confirm that it begins with `sk_sandbox_`. Never paste this value into chat, source control, or a browser-exposed `NEXT_PUBLIC_` variable.

Use this fixed base URL:

```text
BACHS_API_BASE_URL=https://sandbox-api.bachs.io
```

## 4. Apply the database migrations

Apply migrations `202609280013_bachs_billing.sql` and `202609280014_pro_simulator_entitlement.sql` to the demo Supabase project before opening the billing page. They create the checkout, webhook, and subscription records and make new simulator sessions read the verified entitlement.

## 5. Create the webhook destination

The endpoint must be publicly reachable over HTTPS. Use one healthy deployment as the webhook destination. While Pxxl cannot deploy, use Vercel:

```text
https://peekytoeapp.vercel.app/api/v1/billing/webhook
```

Subscribe to:

- `collection.succeeded`
- `checkout.completed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Copy the endpoint signing secret into `.env.local` and the selected host's server environment as `BACHS_WEBHOOK_SECRET`. Bachs sends `X-Bachs-Signature-V2`; the handler also supports the documented legacy signature headers during migration.

For local webhook work, use Bachs's documented local forwarding flow. Do not set a localhost webhook URL in the dashboard because Bachs cannot reach it directly.

## 6. Configure application URLs

Local development:

```text
APP_BASE_URL=http://localhost:3000
```

Vercel:

```text
APP_BASE_URL=https://peekytoeapp.vercel.app
```

Pxxl, when active:

```text
APP_BASE_URL=https://peekytoe.pxxl.click
```

The server supplies `/founder/billing/return` as the success destination and `/founder/billing?checkout=cancelled` as the cancel destination. The success URL carries a `checkout_id`, but that value never grants access by itself.

## 7. Run the sandbox proof

1. Sign in with an onboarded founder account and open `/founder/billing`.
2. Choose **Continue to sandbox checkout**.
3. Complete the hosted checkout with the test credentials shown by Bachs in its sandbox checkout or developer documentation. Do not use a real card.
4. On return, wait for **Founder Pro is active**.
5. Refresh the page and sign in again to prove the entitlement is persisted.
6. Start a new simulator session and confirm its database row has `tier_at_start = 'pro'` and `entitlement_source = 'bachs-sandbox'`.
7. Replay the webhook event from the Bachs developer portal and confirm the paid-through date does not increase.
8. Send an invalid/stale signature fixture and confirm the endpoint returns `401` with no entitlement change.

If checkout succeeds but verification remains pending, do not pay again. Inspect the Bachs webhook delivery and the `billing_webhook_receipts` row, correct the endpoint or secret, then replay the same event.
