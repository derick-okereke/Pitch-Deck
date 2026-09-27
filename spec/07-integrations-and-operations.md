# Integrations, billing, analytics, and runtime

Reviewed26 September2026. **Documentation found is not integration tested.** No account credentials or live deployments were accessed. The contracts here are our proposed design; vendor-specific assertions have primary-source links. Package versions and account-specific quotas must be captured in the build lockfile and evidence ledger, not guessed from these notes.

## Technical baseline

One Next.js App Router TypeScript application, Node server runtime, Supabase Postgres/auth/storage/realtime, Tailwind with the incumbent tokens. Proposed Node22 LTS subject to chosen stable Next.js and pxxl support; pin actual patch versions/package manager at scaffold and commit one lockfile. No static export because auth, API, billing and AI require a backend. Pin dependencies; no `latest` in reproducible build instructions. Three.js WebGPURenderer/TSL is lazy-loaded in simulator only; static DOM fallback is mandatory.

Suggested layout: `src/app` routes; `src/features/{auth,profiles,discovery,messaging,simulator,billing}`; `src/lib/{schemas,domain,providers,auth,telemetry}`; `supabase/migrations`; `tests/{unit,integration,e2e,fixtures}`. Provider adapters implement named interfaces `ProfileReviewer`, `PitchCoach`, `Transcriber`, `SpeechSynthesizer`, `BillingGateway`, `ErrorMonitor`; production code cannot import fixture adapters unless explicit DEMO_FIXTURE_MODE and visible labeling are enabled. Prefer domain functions shared by routes over business rules duplicated in React.

## Integration evidence ledger

| Service | Researched evidence | Remaining build proof |
|---|---|---|
| pxxl | Official [supported stacks](https://docs.pxxl.app/projects/supported-stacks) lists Next.js/Node; server frameworks use a Web Service target. [Configuration guide](https://docs.pxxl.app/deploy/configuration) exposes runtime/build/start/port/secrets settings | Account access, deployed commit, configured Node/port, HTTPS auth callback, request/upload limits, outbound provider calls, request lifetime, restart persistence |
| Bachs | Official [checkout guide](https://docs.bachs.io/guides/checkout/checkout-sessions), [subscription guide](https://docs.bachs.io/guides/subscriptions/overview), [signature guide](https://docs.bachs.io/guides/webhooks/overview) located; contract below | Actual sandbox monthly USD product, current request schema, successful payment/failed payment/duplicate/reordered webhook fixtures and lookup binding |
| WatchUp | Owner-supplied [official Next.js guide](https://watchup.site/docs/sdks/nextjs) successfully read through browser; official @watchupltd packages and split client/server setup documented | Account keys, pinned SDK compatibility, privacy scrubbing configuration and client/server events received under deployed release |
| Groq STT | [Official STT documentation](https://console.groq.com/docs/speech-to-text) supports planned model, file formats, verbose timestamps | Actual Chrome/Safari recording acceptance, duration parsing, word timing, silence/error behavior and account limits |
| Groq LLM | [Output-mode documentation](https://console.groq.com/docs/structured-outputs) shows strict schema capability depends on model | Exact supported Llama ID, JSON mode/schema validation proof and four prompt fixtures; no assumed retired model |
| ElevenLabs | [Speech endpoint](https://elevenlabs.io/docs/api-reference/text-to-speech/convert) documented | Three distinct available voice IDs, model, output MIME, use rights/account quota, audible playback in target browser |
| Supabase | [RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) | Project/region, email callbacks/SMTP, storage and realtime participant rules, row-level denial tests |
| PostHog | Product chosen by source brief; privacy configuration is a project requirement | Confirm installed SDK settings/event endpoint, consent behavior and scrubbed payload capture; do not repeat old free-tier quotas as guarantees |

Do not use public package aggregators or a similarly named service as proof of the organiser-required WatchUp integration. The owner supplied the missing official guide, so no further manual documentation search is currently needed. Configure credentials privately during build; never request API keys in chat.

## Bachs contract: researched facts and project policy

**Currency correction:** current Bachs subscription guide says recurring billing is USD-card-only. Use the owner's selected base **USD3.00/month** (300 cents), no trial, one monthly recurring Founder Pro product. The owner also selected NGN5,000/month; retain that reference price but do not imply a working naira recurring checkout. Investor Pro's selected USD29/month price is a preview without billing. These are owner-selected prices, not invented FX conversions. Subscription creation happens by checking out a recurring product; do not invent a create-subscription endpoint. [Subscription source](https://docs.bachs.io/guides/subscriptions/overview)

Documented checkout base `https://sandbox-api.bachs.io`, `POST /v1/checkout-sessions`, Bearer sandbox key, product_cart with product_id/quantity, customer, hosted checkout_url response. Attach the authenticated founder's customer; store checkout ID binding before returning redirect. Use server-defined product and URLs. Guides differ on `success_url`/`cancel_url` versus `return_url`; resolve against current reference and sandbox request before wiring the adapter. Do not claim every example is interchangeable. [Checkout source](https://docs.bachs.io/guides/checkout/checkout-sessions)

Documented signing uses timestamp plus raw body with HMAC-SHA256; prefer `X-Bachs-Signature-V2`, parse `t=` and all `v1=` values, accept a constant-time matching digest within300 seconds. Keep raw bytes before JSON parsing. Never use an assumed Stripe/Svix signature scheme. Relevant documented events include `collection.succeeded`, `invoice.paid`, `invoice.payment_failed`, and `customer.subscription.created/updated/deleted`. [Webhook source](https://docs.bachs.io/guides/webhooks/overview)

Our internal flow:

1. Verify founder session; server selects the configured USD monthly sandbox product. Create/reuse checkout_attempt with idempotency binding. Disable checkout if product/config/currency verification incomplete.
2. Call gateway and persist returned checkout ID/expiry. If timeout outcome unknown, mark pending reconciliation; never blindly create another charge attempt. Provider-specific idempotency capability must be verified; local uniqueness alone cannot guarantee upstream idempotency.
3. Redirect to validated HTTPS provider-owned URL. Return page displays Pending until our server status is active. User-edited query parameters cannot activate Pro.
4. Signature-verify webhook, deduplicate ID+environment; store receipt. Match to known server-created checkout/customer/product and expected amount/currency. Unknown association quarantines event without granting tier.
5. Re-fetch provider checkout/subscription/invoice through documented retrieval endpoints. Record successful paid interval and subscription ID. `paid_through` comes from verified paid coverage, not the date of any arriving webhook. Failed renewal must not extend it. Trial or a bare checkout-completed notification does not grant the no-trial paid plan.
6. Map confirmed state to internal pending/active/past_due/cancelled/expired; enforce paid-through/current suspension in every entitlement read. Process out-of-order webhooks by current provider state, not arrival order. Provider verification outage preserves prior verified coverage until expiry and leaves pending work for retry.
7. Store processing result before2xx; reconciliation via return action and operator maintenance processes unhandled receipts. No payment recovery job may change owner binding or overwrite a newer provider state with stale data. Unknown webhook types are recorded/ignored safely, not treated as payment success.

Live billing, refunds/payouts and custom cancellation UI are excluded. Demo cancellation can be performed in Bachs sandbox dashboard for testing and must produce correct local expiry behavior. Before real payments, implement customer cancellation/support and owner-approved terms/price/capacity; B07 remains a separate release gate.

## Configuration contract

Commit `.env.example` with variable names and descriptions, **no actual secrets**. Public: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or verified publishable-key equivalent for selected SDK), optional `NEXT_PUBLIC_POSTHOG_KEY/HOST`, `NEXT_PUBLIC_WATCHUP_KEY` for documented browser ingestion only. Server-only: `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `GROQ_CHAT_MODEL`, `GROQ_STT_MODEL`, `ELEVENLABS_API_KEY`, `ELEVENLABS_MODEL_ID`, `ELEVENLABS_VOICE_WARM/DIRECT/CALM`, `BACHS_SECRET_KEY`, `BACHS_WEBHOOK_SECRET`, `BACHS_FOUNDER_PRODUCT_ID`, `WATCHUP_API_KEY`, `GIT_SHA`, `APP_BASE_URL`, `DEMO_MODE`, `DEMO_FIXTURE_MODE`, `DEMO_INVITE_ALLOWLIST`, provider budget and limits. Never reuse the server monitoring key in public config.

Defaults: DEMO_MODE=true, DEMO_FIXTURE_MODE=false, billing environment=sandbox, checkout amount_minor=300,currency=USD, interval=month, free_sessions=3, free_detail_views=20, publication_content_min=50, badge_total_min=70, badge_session_min=75,badge_delivery_min=7. Prices are owner-selected C13; other defaults are proposed D. Every value is versioned application config, not an AI prompt decision. Config validation at startup distinguishes unavailable optional telemetry from missing core auth/database. Never dump config values in logs.

Before deployment: select one Node version/lockfile, `npm ci` (if npm selected), typecheck/lint/tests, `next build`, long-running `next start` on configured host/port. Record actual commands compatible with pxxl runtime; don't paste Windows shell syntax into a Linux start command. Supabase migrations are a separate explicit deployment step. Audio persists in storage/DB, never an instance filesystem.

## Analytics contract

Primary actions succeed independently of event delivery. For the small demo, use a bounded, caught event append after successful domain mutation with <=200ms extra latency; log a scrubbed dropped-event counter and accept explicitly documented best-effort loss. Do not launch an un-awaited promise and claim reliable delivery. Guaranteed analytics later needs a transactionally persisted outbox plus worker; deferred. Critical payment receipts, usage and operation state are operational records and **must not** use best-effort analytics writes.

| Event table / types | When / dedupe | Allowed properties |
|---|---|---|
| profile_score_history / profile_reviewed | Once per valid review ID | revision, rubric/model version, sector/stage, ratings, total, passed |
| search_events / search_performed | Once per settled query request, not every keypress | normalized filters, keyword length (not raw query), result_count, tier |
| profile_view_events / profile_viewed | Once per successful detail fetch with request ID | startup, source, is_repeat; monthly cap ledger independent |
| intro_request_events / intro_requested, intro_responded | Once per conversation and first founder reply | conversation, role/tier snapshots, latency on response event |
| simulator_session_events / session_started, session_completed, session_failed | Once per session+terminal type | tier, stage, category results, duration, prompt version, failure code |

All include schema_version, occurred_at and is_demo. Event failures do not revoke a completed report/message/payment. Append-only histories may be redacted/deleted under the retention policy; 'append-only' is an analytical design, not a prohibition on privacy deletion. Do not infer actual funding outcomes from intros or response rates.

PostHog tracks minimal deliberate events: role selected, draft saved, review finished, session step completed, intro sent, checkout begun/verified. Use pseudonymous account IDs; no auth email, raw filter query, profile text, transcript, mic/audio, message text, full URLs containing tokens, or billing payload. Autocapture and session replay disabled on all private routes in demo; optional consented landing page views only. Heatmaps and replay aspirations do not override private data protection. No founder analytics dashboard in current demo scope.

WatchUp setup: install `@watchupltd/nextjs`, `@watchupltd/browser`, `@watchupltd/node`, `@watchupltd/react`. Mount a client-only dynamic `WatchupProvider` from `@watchupltd/nextjs/client` inside the root layout. Initialize `initWatchup` from `@watchupltd/nextjs/server` in instrumentation; use an initialization-safe helper and `withWatchupRoute` for handlers. `getWatchup().captureError` supports manual server capture. These names are documented in the [official Next.js guide](https://watchup.site/docs/sdks/nextjs), read in-browser on September26. Pin actual versions and verify redaction hooks before enabling automatic capture on sensitive routes.

Our monitoring payload policy: sanitized request_id, route template (not raw URLs), environment/release, status/error code, operation stage and latency only. No microphone data, messages, tokens or payment payload. Catch reporting failures. Require one deliberate safe browser error and one server exception visible under correct release before marking integration complete. Documentation support is established; deployed capture and scrubbing remain untested.

## Operating targets and failure playbook

Targets for seeded dataset/real demo device, not vendor SLAs: p95 authenticated non-AI requests<1s, search<750ms, message visible to peer<2s, STT per max-length segment<30s, LLM stage<30s, question audio ready<10s, result after answer<45s. Show progress throughout, timeout per API contract. Measure at least five real rehearsals and report observed latency; no fabricated benchmarks. AI can be nondeterministic: educational/schema quality tests matter more than an exact numeric score for real model calls.

Provider outage: persisted state + Retry, no canned hidden success. Supabase outage: preserve local unsaved text/audio where possible, disable protected mutations, retry after recovery. Realtime outage: reconnect/refetch/poll conversation every5s while visible, stop when hidden. pxxl restart: recover from DB operations/leases, no lost completed report. Payment webhook delay: Pending + reconcile; never encourage repeated payment. WatchUp/PostHog outage: core app still works.

Daily before judging: check expiry/retention cleanup, provider budgets/credits, sandbox product configuration, auth redirect URLs, demo investor entitlements, private bucket/RLS, one full session and intro. Rollback: redeploy last verified commit; forward-compatible additive migrations preferred, backup before destructive migration. Reset only dedicated synthetic demo records, never arbitrary user data. Operator runbooks must distinguish resetting fixtures from real payment/session evidence.
