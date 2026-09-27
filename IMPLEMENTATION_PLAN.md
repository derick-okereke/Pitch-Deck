# Pitch Deck implementation plan

Target: a truthful, reviewable hackathon demo by 4 October 2026.

## Phase 1 — Visual foundation and investor path

Build the shared shell, tokens, typography, navigation, responsive behavior, and accessible interaction primitives. Deliver three connected routes:

- `/` — landing page with the code-native Pitch Signal hero, founder/investor actions, simulator explanation, and honest illustrative previews.
- `/discover` — investor discovery with useful filters, result states, locked Pro controls, and clearly labelled synthetic fixtures.
- `/startups/korah-health` — startup detail with score explanation, structured evidence, funding ask, and an introduction action.

Exit gate: desktop and mobile visual review; keyboard and reduced-motion behavior; Impeccable mechanical detector; lint and production build.

## Phase 2 — Founder profile and review loop

Build founder dashboard, profile editor, preview, review processing/result states, deterministic score explanations, and draft/published revision behavior.

Exit gate: a founder can save, submit, understand review evidence, and inspect the exact investor-facing projection without exposing private fields.

## Phase 3 — AI pitch simulator

Build setup, microphone readiness, pitch capture, a two-question Q&A from two distinct members of the three-person panel, processing, and report surfaces. Add the contained Three.js WebGPU/TSL boardroom as a progressive enhancement with static fallbacks and device-loss recovery.

Exit gate: session controls remain fully usable without WebGPU; reduced motion and failure states preserve meaning; one end-to-end provider rehearsal succeeds.

## Phase 4 — Authentication, marketplace data, and messaging

Connect Supabase authentication, onboarding, migrations, RLS, discovery APIs, introduction requests, inbox, and free founder replies.

Exit gate: cross-account access tests pass and a paying investor can reach a free founder without revealing contact information.

## Phase 5 — Billing and compulsory integrations

Integrate Bachs sandbox payments, pxxl deployment, WatchUp monitoring, analytics, and operational evidence.

Exit gate: verified webhook state grants the correct entitlement; deployment and monitoring work on the target HTTPS environment.

## Phase 6 — Resilience and demo freeze

Complete priority acceptance cases, accessibility and device checks, fixture seeding, provider failure recovery, rehearsal evidence, and the prerecorded contingency.

Exit gate: no failing P0 acceptance case, no misleading placeholder integration, and the live six-minute path has been rehearsed five times.

## UI decision guardrails

- `stitch_brand_design_system_generator/DESIGN.md` is the visual authority.
- `spec/03-screens-and-ux.md` owns page structure and states.
- `spec/09-visual-assets-and-webgpu.md` owns the Pitch Signal and boardroom direction.
- Every UI phase runs the Impeccable context command before work and its detector after the changed UI is complete.
- Synthetic startups are always marked `Illustrative demo`; no testimonials, partner logos, user counts, or outcome claims are invented.
- Cobalt means interaction, amber means earned readiness, and motion explains state rather than decorating empty space.

