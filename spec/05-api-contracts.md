# Internal application API contract

These paths are **our Next.js routes**, not claims about any external vendor API. All types refer to the domain/data specifications. Runtime validators reject unknown mutation fields, invalid enums/IDs, overlength text and client-supplied role/score/entitlement. Generate TypeScript types from shared schemas; do not independently redefine UI and server schemas.

## Common protocol

Base `/api/v1`. Auth from verified server session; never body user_id. HTTPS JSON except signed direct uploads and raw webhook receiver. Success `{data: T, request_id: string}`. Failure `{error:{code,message,field_errors?:Record<string,string>,retryable:boolean,retry_after_seconds?:number},request_id}`. Return401 auth missing,403 actor/entitlement forbidden,404 unknown/foreign object,409 state/version/idempotency conflict,413 too large,422 validation/unusable input,429 rate/quota protection,502 invalid provider response,503 provider/config unavailable,504 timeout. No provider secret/raw exception in message.

Mutating resource-creation/provider endpoints require `Idempotency-Key` UUID. Persist `(account,operation,key,input_hash)`; same key/body returns original resource/result; same key/different body409. A still-running attempt returns202 `{operation_id,state,poll_url}` with Retry-After2. Non-provider updates use expected version. Clients poll no faster than every2 seconds, back off to5 seconds after30; stop on terminal state. Operation timeout is not automatically evidence of provider failure; reconcile before starting a second attempt.

Provider work executes in an awaited server request with persisted step result. No un-awaited promise as a workflow queue. Polling reads state; explicit resume retries only a failed/expired-lease operation. Provider attempt timeout45 seconds, lease60 seconds, per-stage one automatic retry only for network/429/5xx with small jitter if time permits; otherwise user Retry after lease expiry. Deployment must support request timeout>60 seconds or use a verified durable worker alternative under B03; do not let a hosted request promise to run after it has been terminated. Exactly-three logical LLM steps does not mean exactly-three network attempts under retry.

## Identity / profile / discovery endpoints

| Method/path | Input | Success / side effects | Gates / failures |
|---|---|---|---|
| GET `/me` | none | account role/onboarding, computed tier, free remaining, unread count | Auth; no secrets |
| POST `/onboarding/role` | `{role,display_name}` | account with immutable selected role | Verified auth; different existing role409 |
| PUT `/investor-profile` | InvestorProfile payload | validated saved projection + onboarding state | Investor only; validation422 |
| GET `/investor-profile` | none | Own full safe profile | Investor only |
| GET `/founder-profile` | none | startup draft/version/publication pointers or null | Founder only |
| PUT `/founder-profile` | `{expected_version:0 for create else current,profile:FounderDraft}` | `{startup_id,draft_version,saved_at}` | Founder; one startup; stale409 |
| POST `/profile-reviews` | `{startup_id,draft_version}` | review ID/state or202 operation; snapshot persisted | Owner, publish fields valid, rate limit |
| GET `/profile-reviews/:id` | none | status + validated result/flags; published/reviewed-earlier-draft | Owner;404 otherwise |
| POST `/startups/:id/publish` | `{review_id,expected_draft_version,acknowledge_older_revision:boolean}` | publication + recalculated readiness | Owner, passed review same startup; optimistic409 |
| POST `/startups/:id/unpublish` | `{expected_draft_version}` | hidden, audio detached | Owner; idempotent |
| GET `/startups` | q,sectors[],stages[],countries[],currency,min_ask,max_ask,min_score,verified_only,page | `{items:Card[],total,page,page_size:12}` | Investor complete, validate filters; unauthorized Pro filter403 |
| GET `/startups/:id` | source search/direct/alert (allowlist) | Detail projection after atomic view reservation | Investor complete/cap; unavailable404, cap403 `VIEW_LIMIT_REACHED` |
| GET `/startups/:id/preview` | revision draft/published | Explicit owner-only preview | Owner only; never consumes cap |
| POST `/startups/:id/audio` | `{session_id}` | Selected recording metadata and public availability | Owner, active Pro, completed matching eligible session |
| DELETE `/startups/:id/audio` | none | audio selection removed | Owner; retry-safe |
| GET `/startups/:id/audio` | none | short-lived playback grant or streamed audio | Investor authorized for current detail/month or Pro; no extra view charge; current publication/Pro/selection checks |

On review completion automatically call the same publication domain transaction when current draft version still matches (domain spec); explicit publish endpoint handles reviewed older revision/republish. Review API must not duplicate scoring for identical content+rubric merely because user pressed twice. Server can map duplicate content to existing result while recording no fake new AI run.

## Simulator endpoints

| Method/path | Input | Output / state |
|---|---|---|
| POST `/simulations` | `{startup_id,draft_version,consent_version}` | `{session_id,state,tier_at_start,remaining_free,operation_id?}`; atomically reserve and snapshot; generate personas |
| GET `/simulations` | page1..100 | Owner's latest20 summaries per page, total; no transcript list payload |
| GET `/simulations/:id` | none | State/version, personas, safe segment statuses, question, allowed next actions; no foreign data |
| POST `/simulations/:id/uploads` | `{kind: pitch|answer,mime,bytes}` | Scoped `upload_url`, headers, media_id, expiry; validate state/size |
| POST `/simulations/:id/segments` | `{media_id,kind,state_version}` | Validate owned uploaded media, advance to STT; accepted immutable segment/status |
| POST `/simulations/:id/question` | `{state_version}` | One question+persona, playback availability; Q&A logical call2; no other transcript accepted from browser |
| POST `/simulations/:id/question-audio` | none | TTS playback URL/status; same question cache reused; text is already usable |
| POST `/simulations/:id/feedback` | `{state_version}` | Report or202; logical call3; completion/quota/score transaction |
| POST `/simulations/:id/resume` | `{operation_id,state_version}` | Retry failed recoverable step or return existing result; never regenerates completed step |
| POST `/simulations/:id/cancel` | `{state_version}` | cancelled, media tracks stop client-side, reservation released; terminal complete409 |
| GET `/simulations/:id/report` | none | validated ratings, notes, metrics, transcript, public contribution status and eligible audio actions |
| GET `/simulations/:id/media/:media_id` | none | Owner-only playback grant; separate from investor audio route |

Recording_started can be a client phase while durable server state is ready/waiting_for_upload; server never treats a browser event as proof audio exists. Segment commit drives actual server processing. Record start/end timestamps for diagnostics, but validate duration from media. API accepts no client `scores`, transcript edits, voice IDs, prompt overrides, provider URL, or `is_pro`.

## Messaging endpoints

| Method/path | Input | Output / constraint |
|---|---|---|
| POST `/intros` | `{startup_id,note,client_message_id}` | `{conversation_id,created:boolean}`; active investor Pro and published target; uniqueness enforced |
| GET `/conversations` | before timestamp/id optional | Latest20 participant summaries, unread count, next_cursor |
| GET `/conversations/:id/messages` | before_sequence optional | Last50, ascending for display; pagination older; participant check |
| POST `/conversations/:id/messages` | `{client_message_id,body}` | authoritative message + sequence; participants and not blocked; no paid gate on reply |
| PUT `/conversations/:id/read` | `{last_read_sequence}` | monotonic own read cursor, bounded by existing sequence |
| POST `/conversations/:id/block` | none | blocked by caller; duplicate success |
| DELETE `/conversations/:id/block` | none | caller block removed; other participant block still effective |

Realtime message subscription uses verified participant access. Treat realtime as a hint: fetch missing sequences after reconnect. Render optimistic pending messages keyed by client_message_id, replace with server result; failure displays Retry. A duplicate echo cannot render duplicate text. No delivery/read receipts product feature beyond unread tracking.

## Billing and health endpoints

- POST `/billing/checkout` body `{plan:"founder_pro"}` -> `{checkout_attempt_id,checkout_url,expires_at}`. Server chooses product/price/customer/return URLs; require founder, sandbox enabled, no active subscription. Existing open attempt reused; request cannot name a price or owner. Config missing503 `BILLING_UNAVAILABLE`.
- GET `/billing/status` -> `{tier,subscription_state,paid_through,cancel_at_period_end,checkout_state}`. Owner only; never derives status from query string.
- POST `/billing/reconcile` body `{checkout_attempt_id}` -> verified persisted status or pending. Owner binding; throttle once/10 sec; provider unavailable preserves last verified status/expiry, never grants access.
- POST `/webhooks/bachs` is outside user auth, raw bytes, signature and event replay validation mandatory. Respond2xx only after receipt and result/retryable work is durably stored. Malformed/signature-failed400/401; valid duplicate200; temporary storage failure503 so provider retries.
- GET `/health/live` -> `{status:"ok"}` with no configuration details. GET `/health/ready` -> readiness status only, no secrets, bounded DB check. Deeper provider/config diagnostics operator-only.

## Example envelopes (illustrative values, not evidence of live output)

```json
{"data":{"startup_id":"11111111-1111-4111-8111-111111111111","draft_version":2,"saved_at":"2026-09-28T12:00:00Z"},"request_id":"req-example"}
```

```json
{"error":{"code":"DRAFT_VERSION_CONFLICT","message":"A newer draft was saved. Reload it or copy your unsaved changes before continuing.","retryable":false},"request_id":"req-example"}
```

Domain error code set includes `ONBOARDING_REQUIRED`, `EMAIL_VERIFICATION_REQUIRED`, `PRO_REQUIRED`, `FREE_SESSIONS_EXHAUSTED`, `ACTIVE_SESSION_EXISTS`, `VIEW_LIMIT_REACHED`, `DRAFT_VERSION_CONFLICT`, `INVALID_SESSION_STATE`, `EMPTY_TRANSCRIPT`, `INVALID_AI_OUTPUT`, `MIC_UNSUPPORTED` (client), `MEDIA_INVALID`, `PROVIDER_UNAVAILABLE`, `OPERATION_PENDING`, `BILLING_UNAVAILABLE`, `CONVERSATION_BLOCKED`. Map these to visible states in the screen spec; unknown errors get safe generic copy plus request_id, never invented success.
