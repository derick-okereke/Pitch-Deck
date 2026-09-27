# Founder Profile Creation

> Historical brief. [Domain and scoring contract](spec/02-domain-and-scoring.md) defines validation, proposed thresholds, revision behavior, score selection and publication. Preserve the weights below; follow the explicit decision register when wording conflicts.

## Design principle

This form is deliberately built to *slow founders down* enough that what reaches investors isn't sloppy — the opposite design goal from the investor profile form (see `04-investor-profile.md`), which is optimized for minimal friction. This form is what enforces quality via the scoring rubric below.

## Required to save a draft (low friction, not yet visible to investors)

- Startup/idea name
- One-line tagline — forcing a single sentence here is itself a clarity filter
- Sector
- Self-declared stage: `idea` / `pre-seed` / `seed` / `growth` — this field is load-bearing: it drives stage-adaptive traction scoring below, and it must use the exact same vocabulary as the investor profile's stage-preference field so filtering lines up on both sides
- Country/region

## Required to publish (gates going live / becoming searchable)

- **Problem statement**
- **Solution** — what's being built
- **Team** — repeatable block: name, role, one-line statement of why they're credible for this specific problem
- **The ask** — amount raising + what it's for

## Scored fields — Pitch-Readiness Score (weighted, out of 100)

| Category | Weight | What's being checked |
|---|---|---|
| Problem & solution clarity | 20 | Specific and concrete, not generic boilerplate |
| Market size | 15 | Has actual numbers — TAM/SAM/SOM — not just "huge market" |
| Traction | 20 | **Stage-adaptive**, see below |
| Team / founder-market fit | 15 | Why these founders, for this specific problem |
| Business model | 10 | How it actually makes money |
| Competitive awareness | 10 | Awareness of competitors and a stated edge/differentiation |
| Pitch delivery | 10 | Pulled directly from a **Pro-tier** simulator session score (see `06-ai-simulator.md`). Free-tier sessions never contribute here. |

**Traction field adapts to the declared stage** (do not penalize early founders for not having revenue):
- `idea` stage → prompt for waitlist size, customer interviews conducted, LOIs
- `pre-seed` → early users, pilot programs, any revenue
- `seed`+ → MRR/ARR, growth rate, retention

## Scoring mechanism

Do not hand-code validators for "is this specific enough" per field. Use **one LLM call** at submission time: pass the whole profile as structured input, score it against the rubric above, and return:
- A score per category
- Flags on vague sections (e.g., "Market size has no numbers — add a TAM estimate")
- The final weighted Pitch-Readiness Score

This is the same scoring mechanism reused for simulator feedback (see `06-ai-simulator.md`) — don't build two separate scoring systems.

## Submission flow

1. Founder saves a draft anytime — not visible to investors.
2. Hits "Submit for Review" → the LLM scoring call above runs.
3. Score ≥ 50/100 *(suggested threshold)* → profile goes live, searchable, shows the Pitch-Readiness Score badge.
4. Score < 50 → stays in draft, with the specific per-category flags shown inline so the founder knows exactly what to fix. This should read as "draft vs. published," not as a punitive block.

## Pitch recording (not a video feature)

- There is **no separate video upload/recording feature.** Instead, the audio recording from a **Pro-tier, scored simulator session** can become the founder's public-facing pitch recording.
- It is **audio only**, not video — the simulator captures voice through the mic, not webcam footage. Do not label this as a "video pitch" anywhere in the UI or copy.
- The founder must **explicitly choose** which scored session becomes their public recording via a "Set as profile recording" action after each scored session — never auto-publish their first attempt. They should be able to re-run the simulator and pick their best take.
- Only **Pro-tier, scored** sessions are eligible. Free-tier (learning-only) session recordings should not be publishable, consistent with those sessions being explicitly for practice.

## In-app help for jargon

- Inline tooltip component (ⓘ icon) next to financial/technical terms used in this form: TAM/SAM/SOM, MRR/ARR, runway, burn rate, valuation, equity, SAFE, etc. Backed by a static glossary object (term → one-sentence plain-language definition) — no backend or API call needed.
- Additionally, add inline help text **under** the relevant form fields with a concrete example answer (more effective for founders actively filling the field than a hover-only tooltip they might not click).
- **Stretch goal, not core scope:** an "explain this in plain terms" AI button on the published profile view, for investors unfamiliar with a founder's sector-specific jargon — reuses the existing LLM already in the stack. Only build this if the core flow is solid with days to spare; it adds an extra LLM call and its own edge cases (cost, latency, occasional bad summaries).

## Explicitly cut for the hackathon

- Separate pitch-deck PDF upload
- Logo / profile photo upload
