# Peekytoe — Project Overview

> Historical planning brief. For the proposed implementation baseline, resolved contradictions, confirmed October 4 demo target, and outstanding decisions, start with [README.md](README.md). The dated delivery plan in `spec/08-acceptance-and-delivery.md` replaces the relative eleven-day plan below. Original notes are preserved as evidence.

## What this is

Peekytoe is a two-sided marketplace connecting startups/idea owners ("founders") with investors, combined with an AI-powered "Learn to Pitch Properly" practice simulator. The two halves are designed to reinforce each other: founders who complete simulator sessions earn a **Pitch-Readiness Score** and a **Verified Pitch-Ready** badge that investors can filter by, which is the platform's core differentiator versus a plain idea directory.

Built for a hackathon. Deadline: **October 4, 2026**. Demo should give the marketplace and the simulator roughly equal weight — neither is a throwaway side feature.

## Platform decision

**Web app, not native mobile.** Responsive, works in-browser on any device. Rationale: avoids app-store review delays, avoids maintaining a second toolkit (React Native/Flutter), and the browser's `getUserMedia` API handles the simulator's live mic capture without any native code.

## Compulsory hackathon tools

The hackathon organizers require these three, regardless of the rest of the stack:
- **pxxl** — deployment (African/Nigerian alternative to Vercel)
- **WatchUp** — monitoring/observability (Sentry-style error tracking)
- **Bachs** — payments (African payments/billing platform)

Details and integration notes for each are in `01-stack.md`.

## File index

| File | Covers |
|---|---|
| `01-stack.md` | Full technical stack, and why each piece was chosen |
| `02-monetization.md` | Subscription tiers, pricing, success fee, simulation limits |
| `03-founder-profile.md` | Founder profile fields, quality gating, scoring rubric, pitch recording |
| `04-investor-profile.md` | Investor profile fields, verification approach |
| `05-search-discovery.md` | Search/filter experience, Request Intro flow |
| `06-ai-simulator.md` | Full simulator flow, persona generation, LLM call design |
| `07-analytics.md` | Data/analytics architecture — business events + interaction tracking |
| `08-backlog.md` | Deliberately deferred features — do not build for the hackathon |

## Suggested build sequence (11-day window)

1. **Days 1-2 — skeleton:** basic profile creation form (founder + investor) + a simple searchable list. Doesn't need to be polished yet.
2. **Days 2-4 — simulator core:** persona generation → lobby/intro screen → Groq STT capturing the pitch.
3. **Days 4-6 — the differentiator:** Q&A round + structured feedback rubric + ElevenLabs voices per persona. This is the demo centerpiece — give it the most time.
4. **Days 6-8 — the loop:** Pitch-Readiness Score written back to the founder profile, investor-side score-threshold filter. This is what makes the two halves feel like one product.
5. **Days 8-10 — polish + Bachs checkout:** wire the one real payment flow (see `02-monetization.md`), tighten UI, rehearse the demo script.
6. **Day 11 — buffer.**

## A note on certainty

Most of what's in these files reflects specific decisions made during planning. A few numbers (subscription prices, free-tier caps like "profiles viewed per month") were proposed as reasonable starting points and haven't been pressure-tested — those are flagged inline as **suggested, not final** wherever they appear. Everything else should be treated as decided.
