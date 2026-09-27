# Data model, authorization, and media

This is a logical schema contract, not applied SQL. Builder must deliver migrations, generated types, RLS policies and tests. Avoid a second application backend. Next.js server endpoints call domain services and Supabase; media uploads go directly to private storage with narrowly scoped authorization. Database functions handle atomic state transitions, not LLM calls.

## Entity dictionary

All application IDs UUID, timestamps `timestamptz` UTC. Mutable rows have `updated_at`; immutable records do not. JSON payloads must pass versioned runtime schemas before insertion; SQL CHECKs cover scalar bounds and enums. Delete cascades are explicit, never assumed.

| Entity | Essential fields | Constraints / purpose |
|---|---|---|
| auth.users | Managed by Supabase | Source of authenticated ID and verified email; never public |
| accounts | id FK auth.users, role nullable then founder/investor, display_name, onboarding_completed_at, suspended_at, is_demo | Owner reads; role/suspension/demo flags server-only; no `is_pro` writable by client |
| investor_profiles | user_id PK/FK, required/optional fields in domain spec, domain_signal | Owner edits allowlisted fields; participants see safe projection |
| startups | id, founder_id unique FK, draft_payload, draft_version int, published_revision_id nullable, publication_status, selected_audio_session_id nullable, is_demo | One startup per founder; row lock for publication/audio updates; no public direct SELECT |
| profile_revisions | id, startup_id FK, revision_number, draft_version, content_hash, payload, created_at | Immutable, unique(startup_id,revision_number); payload conforms to founder schema |
| profile_reviews | id, revision_id FK, rubric_version, model_id, prompt_version, operation_id, state, ratings/evidence/flags, content_points, completed_at | Unique(revision_id,rubric_version) for successful outcome; raw provider output never public |
| simulator_sessions | id, founder_id, startup_id, snapshot_revision_id, tier_at_start, entitlement_source, state, state_version, expires_at, started_at, completed_at, failure_code, is_fixture | One nonterminal session/founder via partial unique index; immutable snapshot/tier |
| simulator_personas | session_id FK, persona_key p1/p2/p3, fictional name/title/focus/style, selected_voice_key | PK(session_id,persona_key), exactly three enforced before ready state |
| simulator_segments | id, session_id FK, kind pitch/answer, storage_path, mime, bytes, duration_ms, transcript, timed_words, status | Unique(session_id,kind); immutable accepted recording per kind; owner only |
| simulator_questions | session_id PK/FK, persona_key, text, source_excerpt, tts_path nullable, tts_status | Exactly one question; validates persona membership |
| simulator_feedback | session_id PK/FK, ratings, category_evidence, persona_notes, metrics, session_points, delivery_points, prompt/model/rubric versions | Immutable valid result only; repeated completion cannot create another |
| usage_reservations | session_id PK/FK, founder_id, state reserved/consumed/released, expires_at | Serialized with session creation and account lock; consumed history persists across deletion |
| subscriptions | id, founder_id, provider, environment, provider_customer_id, provider_subscription_id unique with environment, state, paid_through, cancel_at_period_end, revoked_at, last_reconciled_at | Server-only updates from reconciled provider state; unique active identity per owner |
| demo_entitlements | account_id PK, role investor, tier pro, expires_at, granted_by, reason | Only trusted seed/operator; ignored when DEMO_MODE=false |
| checkout_attempts | id, founder_id, idempotency_key, provider_checkout_id unique, expected_product_id, expected_amount_minor, currency, state, expires_at | One open attempt per founder; bindings from server, never client email match alone |
| webhook_receipts | provider_event_id + environment composite PK, payload_hash, received_at, processing_state, error_code | Validated events only; duplicates no-op; encrypted/restricted payload if retained |
| conversations | id, investor_id, startup_id, founder_id, created_at, last_message_at | Unique(investor_id,startup_id); founder must match startup owner |
| messages | id, conversation_id, sender_id, client_message_id, sequence bigint, body, created_at | Unique(sender_id,client_message_id); sequence generated server-side; no edit/delete product feature |
| conversation_reads | conversation_id,user_id composite PK,last_read_sequence | Participant only; monotonic increase |
| conversation_blocks | conversation_id, blocker_id composite PK, created_at | Participant only; either-side block disables sends both ways |
| monthly_profile_views | investor_id,startup_id,month_utc composite PK,first_viewed_at | Atomic unique detail-cap ledger, not event analytics |
| operations | id, account_id, kind, resource_id, input_hash, state, attempt_count, lease_expires_at, result_ref, error_code, idempotency_key | Unique(account_id,kind,idempotency_key); protects provider steps and replay |

Business event tables remain separate: `profile_score_history`, `search_events`, `profile_view_events`, `intro_request_events`, `simulator_session_events`. Shared fields: `id`, `event_key` unique, `event_type`, `actor_id` nullable, `entity_id`, `occurred_at`, `created_at`, `schema_version`, `is_demo`, bounded JSON properties. No event contains audio, transcript, message body, email, or complete profile. `intro_requested` and `intro_responded` are separate append-only events; calculate response latency, do not overwrite `responded` on the original event. Score history references immutable review/report and contains numeric category results.

Indexes: every FK used for joins; all event tables `(created_at,id)`; conversations(participant,last_message_at) through participant predicates; messages(conversation_id,sequence); revisions(startup_id,created_at); sessions(founder_id,created_at); review revision/hash; subscriptions(founder_id,paid_through). For demo volume a safe joined published projection is enough; do not add a search service, warehouse, or materialized cache until measured.

## Atomicity and invariants

1. Publication transaction verifies owner, passed review, matching revision/startup and expected draft version; changes pointer and clears ineligible selected audio. There is never a partially published profile.
2. Session start locks account, expires stale reservations, checks rate/entitlement and single-active constraint, checks `consumed + reserved <3` for free, then creates snapshot/session/reservation. This limit is lifetime by account, not startup. Pro starts do not consume free slots.
3. Successful completion inserts feedback once, marks complete and consumes any free reservation in one transaction. Cancellation/terminal failure releases reservation. Completed free usage is never refunded by deleting audio/report/account content within the same auth identity.
4. Reservation expiration30 minutes from start; successful authorized activity extends session expiry up to a maximum60 minutes from initial start. Terminal state is monotonic. Startup cleanup at next session start and scheduled maintenance enforce expiration. Stale browser/provider response cannot resurrect expired state.
5. Intro request inserts conversation+first message once, or returns existing ID. Read cursor and unique message IDs handle reconnect/retries.
6. View cap transaction locks investor month counter/row then inserts unique view; do not COUNT and INSERT outside the same serialization boundary.
7. Public score/badge are derived server-side from current publication and current paid-through time. Do not rely on a nightly expiry job to hide an expired badge. Search/detail share the same calculation; a cached projection, if later introduced, must update on expiry/revision/session removal.
8. All UUID references checked for consistent ownership in domain transactions. A valid UUID from another startup/session is never acceptable input just because its shape validates.

## Authorization matrix

| Resource | Owner | Other signed-in user | Anonymous | Service role |
|---|---|---|---|---|
| Draft/revisions/reviews/private reports | Read own, mutations via guarded API | Deny | Deny | Least-purpose server routines |
| Published startup | Founder preview | Investor through view-cap API only | Deny | Safe projection |
| Investor profile | Read/edit safe own fields | Founder participant projection only | Deny | Domain signal update |
| Session/audio/transcript | Owner through API | Selected pitch only via authorized profile API | Deny | Upload validation/STT processing |
| Conversations/messages | Participants only | Deny | Deny | Guarded send/intro routines |
| Entitlements/usage/billing | Read computed own status | Deny | Deny | Only writer |
| Business events | No direct browser reads/writes | Deny | Deny | Append only; operator aggregates |
| Webhook/operations | Redacted operation status only | Deny | Deny | Only writer |

Enable RLS on every exposed application table and storage bucket; Supabase service keys bypass RLS and **must stay server-only**. Published private drafts cannot share a permissive owner-or-published policy because investors could then read unapproved fields. Do not grant authenticated users direct table SELECT that bypasses view caps. Use vetted server functions/API projections for discovery/details; Realtime only for participant-authorized message inserts. Authorization must also be enforced inside any SECURITY DEFINER function with fixed search_path and restricted execute grants. [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security) documents row policies and service-key bypass; the matrix above is this project's proposed policy.

## Public projections (allowlists)

Card: startup_id,name,tagline,sector,stage,country,city,ask,currency,readiness_display,verified_pitch_ready,is_demo. Detail additionally includes published content/team/market source links, category public points, rubric/date/help and `has_audio`; never storage paths or auth contact. Investor-in-conversation projection: name,type,firm/title,bio,preferences,LinkedIn,domain-signal label. Do not serialize full DB rows then remove two private fields.

## Media/storage contract

- Private bucket `pitch-audio`; generated path `{owner_uuid}/{session_uuid}/{pitch|answer}/{upload_uuid}.{validated_extension}`. Browser does not choose an arbitrary owner/path. Store metadata on server.
- Supported capture preference: `audio/webm;codecs=opus`, then `audio/mp4`, then supported `audio/ogg;codecs=opus`. Probe using MediaRecorder.isTypeSupported; negotiate against actual Groq-compatible files. [MDN API reference](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static) supports this detection approach. Do not assume browser brands imply a codec.
- Maximum20 MiB per segment, pitch<=300 seconds and answer<=90. Verify owner, declared/actual size, media signature/container and parseable duration server-side; do not trust extension or client duration. If environment cannot safely inspect duration, mark B05 unresolved rather than fabricate verification. No ffmpeg runtime dependency without a deployment test.
- Server issues short-lived upload authorization scoped to one allocated key; commit verifies object and metadata before accepting it. Upload failure retains Blob in current tab and retries same segment key, not a new free session. Reload before upload loses local audio with explicit notice; completed uploads are resumable.
- Signed private playback URLs expire60 seconds and are generated on each authorized request. Public-selected pitch delivery may use a server range-capable proxy when immediate access revocation is required; if signed URLs are used, explicitly accept up to60 seconds revocation latency and never claim downloaded copies can be revoked. Do not sign Q&A for investors.
- Generated question speech is private to session and cached by text+voice+model; no voice cloning. Store only what report playback requires.
- Recording consent version/time attached to session. Publish consent separately attached to selected audio action. Changing selection detaches old audio from public projection without deleting owner's report.

## Retention and privacy defaults (demo)

Private pitch/answer/TTS objects expire30 days after completion; selected public pitch retained until deselected, startup unpublished, subscription expiry or account removal, then deleted within24 hours by a maintenance task. Reports/transcripts90 days; operational messages90 days after last conversation activity; privacy-cleaned business events180 days. Abandoned uncommitted uploads24 hours. Minimal receipt/usage identifiers needed for idempotency and lifetime allowance persist until account removal; sandbox webhook raw payloads7 days. These are engineering defaults, not a legal retention opinion or permission for production collection.

Maintenance job daily deletes expired objects first, nulls audio references and marks playback unavailable; report scoring evidence remains until its own retention expiry. When report evidence expires/deletes, recompute public score and badge. Owner-requested deletion is an operator-run documented process for the invitation-only demo: unpublish/revoke access immediately, purge owned objects/reports/profile, anonymize events and remove auth account; retain other participant's minimal conversation only according to approved launch policy (B07). Do not implement self-service deletion that silently leaves public audio. Before public signup this process, disclosures and retention must be reviewed.

Use HTTPS; server secrets in deployment secret store; same-origin mutations with CSRF/Origin protections and secure cookies; request body limits; rate limiting; parameterized SQL; plain-text rendering; no server fetching user URLs; no raw provider payloads in client exceptions or logs. Scrub auth headers, contact details, audio and transcripts from WatchUp/PostHog. Backups do not count as a tested restore: include one seeded restore rehearsal before a real launch.
