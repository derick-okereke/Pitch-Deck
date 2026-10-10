# Phase 5 observability and product analytics

WatchUp receives request performance, consented page visits and product events, browser web vitals, structured request logs, and fixed operational error codes. Server initialization lives in `src/instrumentation.ts`. The stock SDK provider and route wrapper include raw URLs/errors, so the app uses filtered adapters. Drafts, messages, transcripts, audio, emails, tokens, billing bodies, raw exceptions, and full URLs are excluded.

Set `WATCHUP_API_KEY` to the existing private server key and `GIT_SHA` to the deployed revision when available. Keep `APP_BASE_URL` set to the deployment's public origin, as required for billing and auth configuration; the relay uses it for origin checks and the tracked hostname even behind an internal localhost proxy. No additional public WatchUp key is required. Without the server key, WatchUp reporting is disabled. The key never enters browser code.

## Dashboard coverage

- **Analytics / Requests / Endpoints:** timing and exact HTTP status for all 26 business API/auth callback handlers, including successful requests and handled failures. Spans use fixed templates such as `POST /api/v1/simulations/[id]/pitch`. Browser telemetry endpoints are excluded. Framework rendering, static assets, and direct Supabase traffic are outside this request coverage.
- **Web Analytics:** initial page visits and App Router navigations after consent, with random visitor/session IDs, screen dimensions, and language. Dynamic identifiers become templates; query strings, referrers, UTM values, titles, and account details are excluded. The same-origin server relay sends the official SDK's `/api/v1/ingest/web-batch` format using the private key. Browser user agents are forwarded for device classification; client IPs are not forwarded, so geographic data may reflect the app server.
- **Events:** `role_selected`, `founder_draft_saved`, `profile_review_finished`, `session_step_completed`, `intro_sent`, `checkout_started`, and `checkout_verified`, independently of PostHog configuration. Only applicable fixed role/step values are included.
- **Browser performance:** consented `web_vital` events for FCP, LCP, INP, CLS, and TTFB with numeric values and page templates. Events keep browser measurements from distorting API request rates and latency percentiles. Measurements observed before consent are discarded.
- **Live logs:** structured `REQUEST_COMPLETED` records containing template, method, exact status, and duration. Console capture stays disabled. Logs do not increase error counts.
- **Errors:** existing fixed operational failure codes and validated unhandled server route templates. Browser failures retain their authenticated, rate-limited code relay.

## Consent and delivery

The existing **Analytics choices** UI controls both WatchUp browser analytics and PostHog and appears when either provider is configured. The consent key is version 2, so existing users receive a fresh choice for the expanded page/performance scope. Refusing or withdrawing consent stops subsequent browser analytics; withdrawal clears WatchUp identifiers. Choice changes synchronize across tabs. Operational traces/logs and scrubbed errors are independent of optional usage consent. Page visits are deduplicated across React effect reruns. The relay checks same-origin requests, caps bodies at 2 KiB, filters payloads again on the server, and uses a bounded per-instance rate limit.

Delivery is best effort. SDK queues flush periodically in a running Node server; page forwarding has a three-second timeout. Reporting failures cannot alter business responses or completed actions. Abrupt process termination or serverless freezing can lose queued data. Rate limiting is per process rather than distributed.

PostHog still uses `NEXT_PUBLIC_POSTHOG_KEY` and its regional HTTPS `NEXT_PUBLIC_POSTHOG_HOST`. It starts after consent. Autocapture, page views, session replay, and exception capture remain disabled there. Named product events share their property allowlist with WatchUp.

Validation: `npm run test:phase5`, `npm run lint`, `npx tsc --noEmit`, and `npm run build`. On October 10, 2026, WatchUp accepted both a labeled synthetic page-view batch and an installed-SDK batch containing one request trace (exact HTTP 204), one custom event, and one structured log, returning HTTP 201 for both batches. The verification hostname was `telemetry-verification.invalid`, route `/__watchup-verification`, and SDK release `watchup-analytics-verification`. These check ingestion rather than production traffic or deployed browser navigation. The owner verifies deployment; do not monitor Pxxl builds after pushing.
