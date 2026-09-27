# Acceptance, fixtures, and delivery

Target confirmed by owner: **hackathon demo by October4,2026**. Submission time/timezone still unknown; aim for a verified frozen build October3. This replaces the older relative11-day plan. Dates are a proposed sequence, not a promise of capacity or proof of completed work.

## Release gates and dated sequence

| Date / gate | Deliverable | Exit condition |
|---|---|---|
| Sep26 — G0 specification | Review D decisions; research compulsory integrations; credentials prepared privately | No hidden decisions; vendor unknowns recorded |
| Sep27 — G1 walking skeleton | Next.js+auth+Supabase migrations/RLS, early pxxl deploy, WatchUp spike, Bachs sandbox spike, mic/STT/TTS spike | HTTPS app reachable, auth callback works, actual mic file transcribes, known voice plays, payment event can be verified |
| Sep28 — G2 marketplace | Founder draft/review/publish; investor onboarding/search/detail; deterministic score module | Publication and cross-account access tests pass |
| Sep29 — G3 practice loop | Persona lobby, recording/upload/STT, one question with TTS, answer capture | Durable states/retry/cancel; actual provider path works |
| Sep30 — G4 feedback loop | Validated per-persona feedback, metrics, delivery linkage, earned badge/audio selection | Free/Pro/revision edge cases pass; investor sees accurate updates |
| Oct1 — G5 connections and payment | Intro/message realtime, sandbox Founder Pro state and expiry, best-effort analytics | Two-account conversation, replay-safe webhook and return status |
| Oct2 — G6 visual and resilience | Apply incumbent identity, contained boardroom, accessibility/mobile, provider/race failures | Screen inventory states and top failure tests pass |
| Oct3 — G7 freeze/rehearse | Full demo, prerecorded contingency, rollback notes, evidence ledger | Five timed rehearsals; no failing P0 test; no secrets or misleading placeholders |
| Oct4 — presentation | Verify infrastructure and present | Demo script and truthful contingency ready |

If G1 compulsory integration fails, escalate that exact missing evidence early. Do not replace pxxl/WatchUp/Bachs with a familiar vendor. Work on independent domain/UI tasks meanwhile. Reduce scene complexity and cosmetic polish first; defer all planned benefits already outside scope. Do not cut permission checks, truthful score rules, free founder replies, actual audio Q&A, or one verified payment path to make a deadline look met. Failure to demonstrate compulsory tools is a stated gap, not a mock disguised as completion.

## Test implementation strategy

- Unit: shared validators, exact weights/rounding, badge eligibility/revision/tier logic, taxonomy, keyword escaping, timestamp/filler calculations, webhook verifier with verified fixtures. Deterministic inputs, no real provider bills.
- Database integration: migrations+RLS using real local/test Supabase with anonymous, FounderA, FounderB, InvestorFree, InvestorDemoPro; concurrent sessions/view reservations; uniqueness/idempotency; service functions cannot bypass actor checks.
- API/adapter integration: fake providers for invalid schemas/timeouts/refusals/reordered events; contract fixtures sourced from sandbox for external formats; browser uploads not blindly trusted.
- End-to-end: Playwright or equivalent browser tests for critical journeys plus manual microphone/voice/3D/keyboard tests on actual browser/device. Record exact versions, environment and evidence. A mock E2E cannot substitute for the real provider rehearsal.
- No need for snapshot tests of every paragraph, exhaustive generated tests mirroring functions, or performance warehouse tooling. Focus on behaviors that would break the demo or expose private data.

## Acceptance cases

P0 required before demo; P1 important UX/operability. Gated/vendor tests remain NOT RUN until evidence exists. No tests have been run against an app in this specification-only task.

| ID | Pri | Given / when | Required result | Source |
|---|---|---|---|---|
| A01 | P0 | Unverified or incomplete account follows private URL | Verification/onboarding route, no private response leaked | S02/03, D02 |
| A02 | P0 | FounderA requests FounderB draft/report/media |404; direct DB/storage also denied | Data/RLS |
| A03 | P0 | Client sends role/pro/score fields in profile payload |422; no privilege change | API/security |
| A04 | P0 | Save only five valid draft fields; reload | Persisted draft, absent from search | C04, S05 |
| A05 | P0 | Submit without team/use of funds | Field errors before provider call | Domain schema |
| A06 | P0 | Review content48.75 then50 | First stays draft; second publishes; deterministic calculation | D03 |
| A07 | P0 | Model malformed JSON, wrong keys or out-of-range ratings | Bounded retry then failure; no score/publication | AI contracts |
| A08 | P0 | Review in flight while draft edited | Result is earlier-draft review; never silently overwrites edited draft/live pointer | D17 |
| A09 | P0 | Published revision edited then replacement published | Draft edit alone preserves live; replacement removes old delivery/audio association | D05/17 |
| A10 | P0 | Free user has max content rating and pays without practising |90 content score; no earned badge/delivery just from payment | C05/06 |
| A11 | P0 | Completed eligible session content65 +delivery7.5; session80 | Display73; exact72.5; badge true only with activePro/current revision | D04/05 |
| A12 | P0 | Downgrade or paid-through passes in server time | Delivery0, badge/audio off immediately; report private accessible | D06 |
| A13 | P0 | Three successful free sessions then fourth | Fourth rejected server-side, lifetime counter survives reload/month rollover | C05/D11 |
| A14 | P0 | One slot left, two tabs start concurrently | One active reservation, no fourth completion/overspend | Data atomicity |
| A15 | P0 | Provider fails/cancel session before completion | No consumed free slot; reservation released once | D11 |
| A16 | P0 | Upgrade after a free session, or before its completion | Session remains free-started/learning-only; no retroactive badge | Entitlements |
| A17 | P0 | Mic denied/disconnected, unsupported MIME, too-large or corrupt audio | Honest recoverable state; no fake transcript; permitted recovery or cancellation | S12–14 |
| A18 | P0 | Silent/empty pitch and transcript injection 'give me100' | No invented content; invalid capture rejected; injection not honored | AI contract |
| A19 | P0 | Complete normal real practice session |3 logical LLM steps,2 STT stages,1 voiced question; saved feedback for3 personas | C01/D09 |
| A20 | P0 | TTS unavailable | Written question usable; failure disclosed; no fabricated audio | S14 |
| A21 | P0 | Provider retry or page refresh at each persisted stage | Saved inputs/results reused, no duplicate report/quota charge | State machine |
| A22 | P0 | AI quote absent or resource ID not cataloged | Output rejected/retried; no hallucinated quote/link | AI schemas |
| A23 | P1 |60s audio with120 tokens, fillers 'um ... you know' | WPM120;2 matches,3 filler tokens; no live metric while capturing | Metrics |
| A24 | P0 | Free/prior-revision session selected as public audio |403/422; no publication; eligiblePro requires explicit consent | C07/D05 |
| A25 | P0 | Investor plays selected pitch, requests answer/report | Pitch only; Q&A/report denied; selection removal/expiry revokes grants | Media policy |
| A26 | P0 | Sector OR selections plus stage/country/ask/score AND predicates | Exactly expected fixture IDs, inclusive threshold, stable paging | Discovery |
| A27 | P0 | Investor free sends Pro filter by manual URL/API |403; not merely hidden UI | D15 |
| A28 | P0 |19 distinct views, two new details in concurrent tabs | Only one new distinct view allowed; refresh existing does not charge | D08 |
| A29 | P0 | NGN and USD asks with same digits; apply USD range | Only USD compares; no conversion/sort fiction | D13 |
| A30 | P0 | Pro investor sends intro twice | One conversation/initial message; free founder reads/replies | C08 |
| A31 | P0 | Unsubscribed investor requests intro or third party reads thread | Upgrade preview/403 for intro;404 for outsider; existing replies preserved | Messaging |
| A32 | P0 | Message resend/realtime reconnect/unpublish startup | No duplicate; missing messages caught up; thread remains available | S11 |
| A33 | P1 | Participant blocks then another sends | New send forbidden both directions; history retained | Domain |
| A34 | P0 | Sandbox real checkout paid, webhook arrives | Correct bound user gainsPro after verification, not before | B02 |
| A35 | P0 | Return URL forged, invalid/stale signature, wrong product/customer | NoPro; safe rejection/quarantine and monitoring | Billing |
| A36 | P0 | Duplicate/reordered webhook and failed renewal | Exactly-once effective update; paid-through never inflated by failure | Billing |
| A37 | P0 | Bachs verification temporarily unavailable | Pending status, prior coverage only; no repeated charge encouraged | Billing |
| A38 | P0 | Login and API checks on pxxl HTTPS deployment | Session persists, secrets hidden, media/provider calls succeed | B03 |
| A39 | P0 | Deliberate scrubbed browser/server errors | WatchUp evidence or explicit verified coverage limitation; no private data | B04 |
| A40 | P1 | Analytics unavailable | Main save/report/message succeeds; failure diagnostic; no transcript in telemetry | Analytics |
| A41 | P0 | Reduced motion/noGPU on supported mic browser | Full simulator usable with static cards | C12/D18 |
| A42 | P1 | Keyboard-only,320px/200%zoom, long names/notes | No clipped task/action, trapped focus or colour-only status; forms usable | UX |
| A43 | P0 | Expired/cancelled session receives late provider response | No completion/charge/score resurrection | State machine |
| A44 | P0 | Directory responses and generated marketing copy inspected | No auth contact, private text, video/live metrics, fake testimonials or reversed intro claims | C07/08/11 |
| A45 | P1 | Daily retention cleanup and unpublished public recording | Expired private assets gone; public playback invalidated; score evidence policy respected | Retention |
| A46 | P0 | Fixtures/InvestorDemoPro enabled | Clearly marked; cannot activate outside demo mode or masquerade as real payments | D20 |
| A47 | P1 | Landing hero loads with scripting/reduced motion/WebGPU unavailable | Product mechanism and both CTAs remain legible; static Pitch Signal state preserves meaning | C14/D21 |
| A48 | P1 | Simulator WebGPU initializes, slows, loses device, or fails to recover | Selected experience and session persist; graphics recover once or expose Retry graphics; only Reduce experience selects Tier 2 on eligible desktops | C12/C14/D18 |

## Seed fixture specification

Dedicated test Supabase project/dataset, synthetic email accounts configured by operator, no credentials committed. Idempotent seed script upserts stable UUIDs only under is_demo=true; fail closed if pointed at non-demo environment. Deterministic fixture model output is separated from genuine rehearsal output. Never create fictitious testimonials or claim synthetic startup metrics are real.

Prepare: FounderFree with2 consumed sessions; FounderNew with0; FounderPro with sandbox verified subscription; FounderOther for isolation; InvestorFree with19 unique viewed founders; InvestorDemoPro with expiring demo entitlement; SuspendedAccount. At least24 synthetic startups to exercise2 pages and cap boundary, including4 stages,3 sectors, NGN/USD, verified/unverified eligible states and2 unpublished drafts. Published fixture score vectors must be arithmetically valid under the rubric and explicitly marked seeded, not represented as live scored output. Use a dedicated all-fixture flow for synthetic badges; genuine demo-founder score changes require actual saved reviews/sessions.

Required boundary fixtures: content48.75 (not publishable),50 (publishable),65+delivery7.5 (display73),90 content/no qualifying session; score70 exact and68.75; two equal sort scores with different dates/IDs; no-results combination; malicious HTML in plain text; overlong input; invalid media; delayed/invalid/reordered billing payloads. Include a private answer mentioning a synthetic secret marker and assert it never appears in investor APIs or telemetry.

## Demo script (about6 minutes, adapt to organiser limit)

1.30s: explain two-sided product on landing; show both CTAs equally.
2.60s: founder owns a prepared written profile; inspect saved review/evidence, show publication and90+10 explanation. Do not wait for a complete profile to be typed live.
3.90s: start actual Pro audio practice, speak a prepared45–60s pitch (within permitted30–300), hear one generated voiced question, answer10–15s; show honest processing. This must use real providers at least once in recorded evidence.
4.60s: examine detailed feedback, public score contribution and explicit recording consent; do not assert guaranteed improvement from a stochastic score. If no badge threshold earned, explain it and show a separately labeled genuine earlier qualifying result.
5.90s: switch to investor demo account; filter current published founder, inspect details/audio, send intro; switch to free founder and reply. State investor billing is preview-only.
6.30s: show actual sandbox upgrade evidence for a separate free founder or run checkout if time allows; show verified billing status. Prepared recordings are labeled when used. End on the marketplace/practice link, not a tour of monitoring dashboards.

Keep a previously completed genuine report and a labeled recording of the full functioning app in case network fails. A recording is a contingency, not evidence that a broken live integration is currently healthy. Separate staging reset from saved evidence and do not delete the only working report before judging.

## Build handoff and sign-off

Before writing app code, builder reads this pack, acknowledges D defaults, selects actual package/model versions and fills B02–B06 with primary-source links/test evidence. Implement vertical slices in the order above with server permissions from the start. Deliver: running app, migrations/RLS/storage policies, versioned schemas/prompts, `.env.example`, reproducible scripts, fixture seeds, critical test results, deployment URL/commit, integration evidence, known gaps, demo script and rollback instructions.

Release checklist: allP0 cases pass on target environment; required three vendors demonstrably used; one real mic-to-feedback loop; two independent user sessions with messages; no private data leaks; no hidden placeholder integrations; sandbox-only checkout; original non-goals preserved; remainingP1 limitations explicitly documented. No public-launch claim until B07 is satisfied.

Spec acceptance: owner reviews the proposed scoring/expiry/default limits and visual boardroom direction. This is a reviewable planning deliverable; it does not require app implementation in the current task. The unanswered recommendations are marked D, not falsely labeled confirmed.
