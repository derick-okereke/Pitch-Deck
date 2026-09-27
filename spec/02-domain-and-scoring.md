# Fields, lifecycle, discovery, and scores

All limits below are proposed D implementation defaults. Use the same shared validators on client and server; server is authoritative. Trim surrounding whitespace, normalize line endings, count Unicode code points, reject control characters other than newline/tab. Store plain text, never HTML. Required means nonblank after trimming. Reject overlength with a field error; never silently truncate. UUID identifiers and UTC timestamps are server-owned.

## Authentication and onboarding

Use email/password Supabase authentication with email verification, sign-in, sign-out, password reset and generic recovery responses. Password input is 8–128 characters and requires at least one capital letter, one number, and one special character, with paste/password-manager support; match the supported Supabase policy at setup. Email max 254, validate through auth provider, never expose it in directory responses. Verify auth server-side; never trust a role in a cookie or request body. Role selection is a one-time transaction. Auth errors must not disclose whether an email is registered. Restrict return URLs to same-origin known routes. A successful confirmation link establishes the session and routes founders to `/founder` and investors to `/discover` without a second sign-in. Invite-only demo signup uses a server allowlist of approved test emails, not a bypass of email verification.

Founder onboarding requires display name 2–80 and the five startup draft fields below. Investor onboarding requires the investor field set. Profile requirements gate app onboarding, not creation of an auth account. An interrupted onboarding resumes its saved step.

## Shared taxonomy and money

- Stages, exactly: `idea`, `pre-seed`, `seed`, `growth`.
- Sectors, stable IDs: `agritech`, `climate-energy`, `commerce`, `education`, `fintech`, `healthtech`, `logistics`, `enterprise-software`, `consumer`, `other`. Human labels are mapped, not persisted as filter IDs. `other` adds a required 2–60 character explanation. No AI-generated categories.
- Geography: country ISO 3166-1 alpha-2 code from a checked-in country list; optional city 2–80 characters. Investor 'anywhere' = empty country preference array and a visible Anywhere label. Do not store 'Africa' as a country or infer nationality.
- Money: currency enum `NGN | USD`; nonnegative integer minor units internally, max 100,000,000,000,000 minor units. API represents money as decimal integer strings to avoid numeric transport ambiguity. Input max two decimals; ask must be >0, investor min may be zero; min<=max. No implicit conversion. Ranges compare only matching currency. Display `NGN 10,000,000` or `$100,000 USD`, not a currency-ambiguous number.

## Founder profile schema

| Field | Type and bound | Required when | Guidance |
|---|---|---|---|
| name | text 2–80 | Save draft | Startup/idea name, not legal incorporation proof |
| tagline | text 10–180, single line | Save draft | 'We help [customer] solve [problem] using [approach]' is an example, not auto-filled copy |
| sector / other_sector | Shared enum / conditional text | Save draft | One primary sector |
| stage | Shared enum | Save draft | Self-declared, never AI-updated |
| country / city | Shared country / optional city | Save draft | Primary operating location |
| problem | text 50–2,000 | Submit | Customer, pain, consequence; no invented statistics |
| solution | text 50–2,000 | Submit | What it does and why it addresses the problem |
| team | 1–5 entries: name 2–80, role 2–80, relevant_experience 20–400 | Submit | Solo founder is one valid entry |
| ask_amount / ask_currency | Money | Submit | Positive amount and explicit currency |
| use_of_funds | text 30–1,000 | Submit | Expenditure and milestones |
| market | object below | Optional, scored | Missing evidence can score zero |
| traction | stage object below | Optional, scored | Stage-adaptive evidence; no revenue required for idea |
| business_model | text 0–1,500 | Optional, scored | Who pays, for what, and pricing hypothesis |
| competition | text 0–1,500 | Optional, scored | Alternatives and differentiation, including doing nothing |

Market object: `currency`, optional `tam_minor`, `sam_minor`, `som_minor` (nonnegative money); `explanation` 0–1,500; `sources` 0–3 entries `{label:1–120,url:https URL<=2048}`. If any size value is present currency is required; when both are present enforce TAM>=SAM>=SOM. This validates arithmetic consistency, not factual truth. Never fetch submitted URLs from the backend in demo (SSRF risk). Render approved http(s) source links with external-link treatment; no email/phone contact fields.

Traction object: common `evidence_note` 0–1,500; all numeric inputs optional and >=0. Idea: `interview_count`, `waitlist_count`, `loi_count` integer <=1,000,000,000. Pre-seed: `active_user_count`, `pilot_count`, optional `monthly_revenue_minor` + currency. Seed/growth: optional `mrr_minor`, `arr_minor` + currency, `growth_pct` -100..10,000, `retention_pct` 0..100, `measurement_period` 0–80. MRR/ARR are independently reported with a period, not assumed equivalent. On stage change warn before clearing incompatible traction fields; preserve them in prior immutable revisions but omit from the new scored payload. No score for data that is absent from that payload.

Draft form may locally hold partial inputs before the first server save. Create is permitted only after five draft fields are valid. Subsequent partial edits can be saved provided those fields remain valid. Explicit Save Draft, save status, and dirty-navigation confirmation; no silent auto-submit or AI autocomplete. Validation groups point to their first error and preserve all input on failure.

## Investor profile schema

Required: full_name 2–80; investor_type `angel | vc-firm | corporate-venture | accelerator`; sectors 1–5 from shared taxonomy; stages 1–4 from shared stages; countries 0–10 with explicit Anywhere; check_min_minor/check_max_minor with one currency. Optional: firm_name 0–120, professional_title 0–100, bio 0–600, LinkedIn URL <=2048 restricted to HTTPS `linkedin.com` or `www.linkedin.com` profile/company paths. Profile photo is deferred; show initials.

Email-domain signal uses verified auth email only and an operator-controlled exact-domain allowlist. No substring matching (e.g. `fund.com.attacker.example` must not match); no blanket recognition of Gmail or arbitrary business domains. Empty allowlist is valid and all users are Unverified. A match shows 'Firm email matched' with tooltip 'Email domain matches our list. Identity, affiliation, and funds have not been verified.' LinkedIn is labeled self-reported. Founder sees investor name, type, thesis/preferences and optional professional profile inside an intro, never auth email.

## Publication and revisions

`startup` is stable identity; `profile_revision` is immutable content submitted for review. Working draft has monotonically increasing `draft_version` for optimistic concurrency.

1. Save draft -> increment version atomically. Stale version returns 409 with server version; user chooses reload or copy unsaved changes, never blind overwrite.
2. Submit valid draft -> create immutable revision + review job keyed to content hash/rubric version; return reviewing state. Subsequent edits remain a separate draft.
3. Valid profile review -> server computes content total. If >=50 and submission still matches current draft version, atomically publish that revision. If edits intervened, show 'Reviewed earlier draft' and require explicit Publish Reviewed Version; warn it differs from the current draft.
4. Below 50 -> needs_improvement with field-specific suggestions; prior published revision, if any, remains live. Provider failure -> review_failed with retry; it never becomes a zero score or a content rejection.
5. Explicit unpublish hides detail/search/audio immediately; existing conversations remain accessible. Republishing unchanged previously passed revision requires explicit action, not a fresh paid review.
6. Publishing a new revision detaches score contribution and audio selected on old revisions; show this before Submit. Prior reports remain private and explain 'Based on an earlier profile'. A draft edit alone has no public effect.

Missing required fields prevent review before provider cost. Blank optional fields are allowed, but score as missing. Publication is not verification of statements.

## Canonical scoring contract

Original axes and weights are preserved. `ask clarity` is feedback within clarity, and `defensibility` within competition; neither becomes a new weighted axis.

Every category gets integer rating 0..4 and evidence-backed rationale. Anchors: 0 absent/unusable; 1 vague assertion; 2 relevant specifics but material gaps; 3 coherent and specific with supporting submitted evidence/assumptions; 4 precise, internally consistent, well-supported reasoning with limits acknowledged. Evidence is user-supplied, not independently verified. AI must not award points for invented facts, financial wealth, accent, identity, or polished writing alone.

| Key | Weight | Category-specific assessment |
|---|---:|---|
| clarity | 20 | Specific customer/problem and a solution explaining mechanism; ask and use of funds coherent |
| market | 15 | Explicit size estimates, assumptions and reachable segment; numbers alone insufficient |
| traction | 20 | Evidence appropriate to declared stage; idea interviews/LOIs may earn full marks without revenue |
| team | 15 | Relevant experience linked to problem, role coverage and acknowledged gaps |
| business_model | 10 | Identified payer, value exchange and credible price/revenue hypothesis |
| competition | 10 | Named alternatives or status quo and reasoned differentiation |
| delivery | 10 | Spoken organisation, understandable explanations, focused answer; not inferred charisma/emotion |

Profile LLM review returns only the first six categories. `content_points = sum(weight * rating/4)`; range 0..90, exact quarter-point precision. Simulator feedback returns all seven using **only spoken pitch/answer evidence**; `session_points = sum(weight * rating/4)` range 0..100. Profile context informs questions but is not substituted for things never said. `delivery_points = 10 * delivery.rating/4`. Server calculates sums; ignore/reject model-supplied totals, never let it set flags/entitlements.

Public readiness = current published revision content_points + eligible best delivery_points (else 0). Display a whole number using round-half-up; evaluate every threshold on unrounded exact points. Store raw ratings, exact points, prompt/rubric/model versions, snapshot IDs, evidence, tier snapshot and timestamp. Unreviewed profile has score null and 'Not reviewed', never 0.

Qualifying contribution: completed Pro-started, non-fixture voice session whose snapshot revision equals current published revision; pitch >=30 sec, answer >=5 sec, valid nonempty transcripts, valid feedback, no terminal failure/deletion. Best delivery rating wins; ties newest completion time then ID. No requirement that the public recording be this same session.

Verified Pitch-Ready (D04) = active Pro AND published AND combined readiness>=70 AND at least one qualifying session with session_points>=75 and delivery_points>=7. Expiry/new revision/removal of qualifying evidence recomputes it. Selecting an audio recording alone never changes points or earns a badge. Public help shows score breakdown, rubric version, assessment date, basis, and 'AI-assessed pitch readiness; business claims are self-reported.'

Examples: all six profile ratings=4 ->90; free stays90 without badge. Content=65 and eligible delivery=7.5 ->72.5, display73. A qualifying session total80 with delivery7.5 makes that published active-Pro profile badge-eligible. Content48.75 does not publish;50 does. Never round before gating. Failed/malformed feedback yields no score update. Downgrade returns that 72.5 example to65, badge off, private report retained.

## Discovery and intro semantics

Search only published projections. Filters AND across dimensions, OR within multi-select sectors/stages/countries. Keyword is a trimmed 0–100 character case-insensitive literal substring over name, tagline, problem and solution; parameterized queries, escape wildcard characters. Minimum score integer0..100 inclusive; verified_only boolean; funding minimum/maximum inclusive with currency required if either bound is set. Missing bounds mean unbounded. Do not use check-size preference as a startup-ask match unless the investor explicitly applies that range; one cheque need not cover the entire round.

Default sort readiness descending, published_at descending, ID ascending; null scores excluded by publication invariant. No Pro boost in demo. Page size12, `page` integer1..100; return total count and page count; changing filters resets page1. Debounce text300ms and cancel/stale-ignore old requests. Query string preserves non-sensitive filters. No hidden default Pro filters on free accounts; server returns403 for unauthorized filter attempts.

Detail cap is atomic unique tuple `(investor_id,startup_id,UTC YYYY-MM)`. First successful authorized detail view consumes one; refresh, same profile, own preview, list cards, 404, and denied views consume none. One remaining slot accessed in two tabs must permit only one new unique profile. On limit, show upgrade preview and reset date; do not return detail data with a cosmetic blur.

Request Intro opens confirmation with mandatory plain-text note20–1,000 characters; creates conversation plus first message atomically. Unique `(investor_id,startup_id)` ensures duplicate clicks return existing conversation rather than duplicate outreach. Request permission is checked on server, includes current publication and investor entitlement. No separate founder acceptance workflow: it opens a conversation immediately. Founder may reply, ignore, or block; never has to pay or earn badge to reply. Block stops messages both directions and hides new content from blocked sender; preserves history for participants. Initial note is a message, not an extra asynchronous notification.

Message text1–2,000 characters; no attachments, markdown/HTML execution, or auto-link previews. Display line breaks safely. Client message UUID prevents duplicate retries; server sequence orders messages. Read cursor records the highest displayed server sequence, not merely a notification. Subscription expiry does not close existing conversations. Unpublished startup is 'No longer listed' in conversation header while messages remain. Unauthorized object reads return404 to avoid enumeration.

Glossary is a shared static object on both forms: TAM total addressable market; SAM portion your offer can serve; SOM realistic near-term share; MRR/ARR recurring monthly/annual revenue; burn net cash spent each month; runway months until cash runs out; valuation estimated company value; equity ownership stake; SAFE agreement for possible future equity; check size investor's typical contribution; LOI nonbinding expression of interest. Definitions are educational field help, not personalized legal/financial advice.
