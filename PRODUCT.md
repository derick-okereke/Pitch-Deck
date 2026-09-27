<!--
  Pre-filled from the project's own planning docs (00-overview.md through
  08-backlog.md) and confirmed project history — not from an Impeccable
  interview. Every section below is a directly sourced fact except
  ## Positioning and ## Product Principles, which are synthesized from
  those facts (the schema expects Product Principles to be derived, not
  quoted) — worth a quick sanity-check on those two specifically.

  Drop this at PROJECT_ROOT/PRODUCT.md before running /impeccable init.
  Per Impeccable's own init flow: when PRODUCT.md already exists, it
  asks what's stale or missing rather than re-running the interview —
  so a confirmed field here should not get reopened without a reason.
-->

# Product

> Durable product context from the original notes. Start implementation with [README.md](README.md) and the versioned `spec/` baseline, whose decision register distinguishes confirmed intent from proposed rules. The design reference is [stitch_brand_design_system_generator/DESIGN.md](stitch_brand_design_system_generator/DESIGN.md), not a root-level file. Historical thresholds, benefit lists and verification language below are resolved explicitly in the specification.

<!-- impeccable:product-schema 1 -->

## Platform

web

<!-- Stack question: framework/stack, when not already fixed by an existing codebase -->
## Stack

Next.js (React, TypeScript) end-to-end — one codebase, API routes double as the backend. Supabase (Postgres, auth, storage). Groq for LLM calls (persona generation, Q&A, scoring) and Whisper STT. ElevenLabs for TTS. Tailwind CSS, themed via the exported Stitch design system (see DESIGN.md). three.js with the WebGPU renderer and TSL, scoped to one contained scene (the AI Pitch Simulator's boardroom) rather than used app-wide. PostHog for interaction analytics (free tier). Three tools are compulsory for the hackathon regardless of the rest of the stack: pxxl (deployment), WatchUp (monitoring/error tracking), Bachs (payments). This was a direct user decision, not delegated.

<!-- Interview question: who the primary user is, their situation, and the job they're doing -->
## Users

Two primary audiences, both weighted equally in the product (and in the live demo):

1. **Founders / idea owners** — early-stage, primarily Nigerian/African context, raising at `idea` / `pre-seed` / `seed` / `growth` stage. Job to be done: build a profile that reads as credible to an investor, practice pitching under realistic pressure, get specific feedback, and get discovered.
2. **Investors** — angel, VC firm, corporate venture, or accelerator. Job to be done: filter and discover founders by sector, stage, geography, funding ask, and a verified readiness signal (not just a raw idea board), then request a warm introduction without either side exposing direct contact info up front.

<!-- Interview question: what the product makes possible, and its distinct mechanism or position -->
## Product Purpose

Pitch Deck is a two-sided marketplace connecting founders and investors, paired with an AI-powered "Learn to Pitch Properly" practice simulator. The two halves are designed to reinforce each other: completing simulator sessions earns a founder a Pitch-Readiness Score and a Verified Pitch-Ready badge, which investors can filter by. Success looks like: founders improve measurably through practice, investors get a higher-signal discovery surface than a plain idea directory, and pairs reach a real introduction through the platform.

## Positioning

*(Synthesized — confirm this reads right.)* The Pitch-Readiness Score and Verified badge are earned, not bought: they come from an LLM-scored rubric applied to profile content, plus (for the delivery portion) a scored Pro-tier simulator session — payment alone never grants the badge. A plain idea-board competitor has no equivalent mechanism, because it has nothing that forces or measures founder preparation before a profile goes live.

<!-- Interview question: durable constraints, assets, evidence, or facts future work must preserve -->
## Operating Context

- Founder flow: save a low-friction draft → fill required fields (problem, solution, team, ask) → submit for LLM scoring against a fixed rubric → score ≥ 50/100 publishes the profile; below that, it stays in draft with per-category flags, framed as "draft vs. published," not punitive.
- Simulator flow: 3 AI investor personas (invented, never real/famous people) → learner pitches live for ~3–5 min via browser mic → Groq Whisper transcription → exactly 2 distinct personas each ask one live follow-up question → the learner records one answer per question → detailed structured feedback from all 3 personas (what worked, what didn't, how to improve, resources) plus pacing/filler-word metrics.
- Investor flow: search/filter (sector, stage, geography, ask range, readiness-score threshold) → full profile view (still no direct contact info) → Request Intro → in-app messaging only.
- Tooltip/glossary mechanism required on both profile forms for finance/VC jargon (TAM/SAM/SOM, MRR/ARR, runway, burn rate, valuation, equity, SAFE, check size, stage) — inexperienced founders and individual/angel investors are both expected users, not just VC professionals.
- Built for a hackathon with an October 4, 2026 deadline; the marketplace and the simulator must carry equal weight in the live demo, neither is a side feature.
- Background analytics (Supabase event tables + PostHog) run silently from day 1 but are explicitly not part of the demo itself.

<!-- Interview question: durable constraints, assets, evidence, or facts future work must preserve -->
## Capabilities and Constraints

- **Founder Free:** 1 active idea profile (suggested cap, not finalized); 3 pitch-simulator sessions total, lifetime (not renewing monthly); free-session scores are learning-only and never count toward the Pitch-Readiness Score or Verified badge.
- **Founder Pro** (~₦5,000–8,000/mo, not finalized): unlimited simulator sessions whose scores do count; profile view analytics; priority search placement; exportable pitch-deck PDF; Verified badge (earned via score threshold, never unlocked by payment alone). Because the "pitch delivery" score category only comes from Pro-tier sessions, a free-tier founder caps at 90/100 max on the Pitch-Readiness Score — intentional funnel design, not a bug.
- **Investor Free:** capped profile views/month (suggested, not finalized); basic filters only (sector + stage).
- **Investor Pro** (~$29–49/mo, not finalized): full filter set including the readiness-score threshold; saved searches with alerts; direct-contact credits; early access to newly listed high-scoring pitches.
- Direct contact info (email/phone) is never shown anywhere in the product — always routed through in-app messaging.
- Regardless of the founder's own tier, they must always be able to see and reply to an inbound investor message for free — never gate the response side, since that would leave a paying investor's outreach met with silence.
- Success fee (post-deal, founder-paid) is optional/voluntary by design, not enforced, and not built for the hackathon — pitch-deck slide content only, not a live feature.
- Explicitly declined, not deferred: an AI-drafted founder profile from a rough one-liner. This cuts against the product's core purpose of founders learning to communicate their own idea, so any future feature that lets an LLM write a founder's core pitch content on their behalf should be treated with the same caution.
- Undecided and explicitly marked as such upstream: exact free-tier profile-view cap, exact subscription prices, exact free-tier idea-profile cap.

## Brand Commitments

- Product name: **Pitch Deck**.
- Voice: composed, disciplined, "authoritatively calm" — deliberately rejects flashy AI-marketing visual/verbal tropes (this is a confirmed brand commitment, not just a DESIGN.md style note).
- A visual identity is already committed via an exported Stitch design system — see DESIGN.md for the actual palette, type, and component specs. This file intentionally doesn't restate those values; DESIGN.md is their record, not this one.
- AI investor personas in the simulator must always be invented — never a real, famous, or publicly identifiable person.

<!-- Interview question: durable constraints, assets, evidence, or facts future work must preserve -->
## Evidence on Hand

- Marketing/landing-page visual reference already exists: DESIGN.md (design system), code.html (generated markup), and screen.png (rendered screenshot), all from a Google Stitch export.
- No real founder or investor testimonials, case studies, press mentions, or seeded production data exist yet. The "Kora Health" result card in the Stitch export is placeholder demo content, not a real customer — future work must not present it, or invent similar examples, as real.
- A shared visual direction is now recorded in `spec/09-visual-assets-and-webgpu.md`: a lightweight Pitch Signal visual in the hero and a richer WebGPU/TSL particle boardroom in the simulator. The hero shows pitch → three investor focuses → illustrative readiness; the simulator uses abstract point-connected personas and a speaking-state pulse. It extends the committed Quiet Editorial Marketplace world rather than replacing it.

## Product Principles

*(Synthesized from the confirmed facts above.)*
1. Quality-gate the supply side — a profile must clear a scored threshold before it's searchable; no shortcut (AI-drafted content, payment-bought badges) is allowed to bypass that gate.
2. Never make the paying side wait on the free side — a founder must always be able to respond to an investor for free, regardless of founder tier.
3. Contact stays in-platform — direct contact info is never exposed, by design, even though it doesn't fully solve off-platform "leakage."
4. The simulator's job is to teach, not just score — feedback must be specific and actionable per persona, not a short summary.
5. Analytics are a silent, long-term investment, not a demo feature — structured from day 1, invisible in the pitch.

## Accessibility & Inclusion

No formal accessibility standard (e.g. a WCAG level) has been set yet. The one confirmed, product-specific requirement: less experienced founders and individual/angel investors who aren't fluent in VC/financial vocabulary must not be made to feel excluded — hence the required tooltip/glossary mechanism on both profile forms (see Operating Context).
