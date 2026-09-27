# Search, Discovery & Request Intro Flow

> Historical brief. [Domain contract](spec/02-domain-and-scoring.md) and [scope](spec/01-scope-and-rules.md) now specify currencies, filters, pagination, view limits, demo investor entitlement, intro/message lifecycle and permissions. Saved-search previews must be labeled as demonstrations, not real alerts.

## Search filters (investor-facing)

Directly sourced from the founder/investor profile fields:
- Sector
- Stage (`idea` / `pre-seed` / `seed` / `growth`)
- Geography/region
- Funding ask range (min-max)
- **Pitch-Readiness Score threshold** (e.g., "only show 70+") — this is the filter that makes the quality-gating from `03-founder-profile.md` actually pay off; no generic idea board can offer this
- Free-text keyword search over the problem/solution text

## Free vs. Pro filter access

| | Free | Pro |
|---|---|---|
| Filters | Sector + stage only | Full filter set, including score threshold |
| Profile views | Capped per month *(suggested, exact number not finalized)* | Unlimited |
| Saved searches / alerts | No | Yes — notified when a new profile matches a saved filter combo |
| Contact | Limited | Direct-contact credits |

## Search result list view

Keep lightweight: idea name, one-line tagline, sector, stage, ask amount, Pitch-Readiness Score badge, "Verified" badge (if the simulator threshold was cleared). **No contact info shown here.**

## Full profile view

Problem, solution, market size, traction, team, ask, business model, pitch recording (audio, from a Pro-tier simulator session — see `03-founder-profile.md`). Still no direct contact info (email/phone) shown anywhere on the profile.

## Request Intro flow — final design

Contact is never shown directly; it's always routed through in-app messaging, which raises (without eliminating) the risk of founders/investors moving the conversation off-platform ("leakage" — see note at bottom).

1. **Subscribed investor** clicks "Request Intro" on a founder's profile → gets in-app messaging access with that founder.
2. **Unsubscribed investor** clicks "Request Intro" → prompted to subscribe first, before they can message.
3. **Founder side — important:** regardless of the founder's own subscription tier, they must always be able to **see and reply** to an inbound investor message **for free**. Do **not** gate a founder's ability to respond behind a founder subscription.

   *Why this matters:* gating both sides multiplies friction on the core connection action. A subscribed (paying) investor who requests an intro and hits silence — because the founder is free-tier and can't respond without also paying — is a bad experience for the side actually generating revenue, and risks making the marketplace look "dead" early on, when most founders will still be free-tier. An inbound investor request is exactly the moment a founder is most motivated to upgrade anyway (unlimited sims, verified badge, priority placement, analytics) — use it as an upsell trigger, not a wall.

## Leakage / success-fee context (not built — informational only)

Founders and investors moving a deal off-platform once they're in contact ("leakage" or "disintermediation") can't be fully prevented technically — once two people know each other, nothing stops them from switching to email/WhatsApp. The standard industry mitigation is legal, not technical: a **"protection window" clause** in the Terms of Service (the recruiting/real-estate model), stating that a deal closed with a platform-introduced pair within some period (e.g., 12-24 months) still owes the platform its fee. Since the success fee here is optional (see `02-monetization.md`), this enforcement mechanism isn't needed and isn't being built — noted here only for context if it comes up in judge Q&A.

## Hackathon build scope

- **Search/filtering:** basic database filtering (`sector = X AND stage = Y AND score >= Z`) is fully sufficient for a demo with a few dozen seeded profiles. No real search engine needed.
- **Saved searches / alerts:** **mock this** rather than building it for real. Show the UI for saving a search, and a fake "1 new match" notification. Real implementation needs a notification system (email or cron job checking for matches) that's more plumbing than payoff for a demo — judges see the feature; the build saves a day.

## Deferred design (see `08-backlog.md`)

A "teaser/blur" middle-ground version of the Request Intro flow was discussed — free-tier founders see that a message exists (blurred preview) but can still open and reply for free — as a way to add upgrade pressure without blocking replies outright. **Not building this for the hackathon**; the simpler always-free-to-reply design above is what ships.
