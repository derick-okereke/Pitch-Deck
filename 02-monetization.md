# Monetization & Subscriptions

> Historical commercial notes. Owner now selected base prices: Founder Pro NGN5,000/month (USD3/month reference option), Investor Pro USD29/month. [Scope and entitlements](spec/01-scope-and-rules.md) define the demo boundary; [billing contract](spec/07-integrations-and-operations.md) uses USD3 sandbox recurring checkout because Bachs currently documents USD-card-only subscriptions. Original aspirations below are not promises of implemented Pro features.

## Model

Standard two-sided marketplace approach: keep the supply side (founders) cheap/free to maximize the number of profiles on the platform; monetize the demand side (investors, who have capital to spend on access/tooling) more directly.

## Founder tiers

### Free
- 1 active idea profile *(suggested cap, not finalized)*
- **3 pitch simulator sessions total — lifetime, not renewing monthly.**
- Scores from these free sessions are for **learning purposes only** — they do **not** count toward the Verified Pitch-Ready badge or the Pitch-Readiness Score. Show a clear in-UI note at session start ("this won't count toward your score") as a natural, non-pushy upgrade nudge.
- Standard (non-boosted) search visibility

### Pro *(suggested price: ~₦5,000-8,000/mo, ~$3-5 — not finalized)*
- **Unlimited simulator sessions**, and these scores **do** count toward the Pitch-Readiness Score and the Verified badge
- Profile analytics (who viewed the profile, from where)
- Priority / boosted placement in search results
- Exportable, polished pitch deck (PDF)
- "Verified Pitch-Ready" badge — this must be **earned** by clearing a score threshold in the simulator (see `06-ai-simulator.md`), not simply unlocked by paying. Payment alone should not grant the badge.
- **Structural note:** because pitch-delivery score only comes from Pro-tier sessions, a free-tier founder caps out at 90/100 max on the Pitch-Readiness Score (see `03-founder-profile.md` for the full rubric). This is intentional, not a bug — it's part of the subscription funnel.

## Investor tiers

### Free
- Browse a capped number of profiles/month *(suggested, exact number not finalized)*
- Basic filters only: sector + stage (no score-threshold filter)

### Pro *(suggested price: ~$29-49/mo — not finalized)*
- Full search/filter set: sector, stage, geography, funding ask range, **Pitch-Readiness Score threshold**
- Saved searches + alerts (notified when a new profile matches a saved filter combo)
- Direct-contact credits
- Early access to newly listed high-scoring pitches

## Success fee

- **Optional for the founder to pay, at their discretion, once a deal is completed.** Not enforced, no obligation.
- Treat this honestly as closer to a voluntary tip than a reliable revenue line — very few people will pay a fee with no obligation attached. It's an aspirational pitch-deck bullet (shows judges revenue-model thinking beyond subscriptions), not something to build or rely on financially.
- Because it's optional, there's no need for the industry-standard "protection window" contractual clause that would otherwise be required to prevent deals closing outside the platform — that enforcement problem is deliberately sidestepped by making payment voluntary.
- **Not built for the hackathon.** Slide/pitch-deck content only.

## What to actually build vs. mock, for the hackathon

- **Mock all tier-gating UI** (locked "Pro" badges, upgrade prompts) for everything above **except** the one flow below.
- **Build one real payment flow**, since Bachs is a compulsory tool: the **founder Pro upgrade**.
  1. In the Bachs dashboard (sandbox mode), create one product/price for "Founder Pro" — a simple recurring subscription price.
  2. "Upgrade" button → server-side Next.js API route calls Bachs's checkout-session endpoint (never expose the secret key client-side) with the founder's info + product, plus success/cancel redirect URLs.
  3. Redirect the founder to the `checkout_url` Bachs returns — a hosted checkout page, no custom payment form needed.
  4. One webhook endpoint (another API route) that Bachs calls on successful payment. On receipt, flip that founder's `is_pro` flag in Supabase. Verify the webhook signature per Bachs's docs before trusting the payload.
  5. Skip refunds, payouts, and multi-currency entirely — none of that serves the demo.
- Investor-side subscription can stay fully mocked (UI only) for the hackathon, since only one real payment path is needed to demonstrate Bachs integration.
