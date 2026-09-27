# Scope, roles, and entitlement rules

Status conventions and authority are in [README](../README.md). This is a concrete proposed hackathon baseline, not permission to launch publicly.

## Outcome and demo proof

A founder can write their own profile, receive actionable review, publish a sufficient revision, practise a live audio pitch, answer an AI investor question, and see detailed feedback. An eligible Pro result improves that same published profile's delivery contribution. An investor filters by readiness, opens the profile, requests an intro, and receives a free founder reply. A real Bachs sandbox checkout activates Founder Pro through verified server reconciliation. Both halves persist across refresh and separate signed-in browser sessions.

## Scope matrix

| Capability | Demo implementation | Release evidence |
|---|---|---|
| Signup, verification, reset, role onboarding | Real Supabase auth; invite-only demo policy | Independent founder and investor accounts |
| Founder draft/review/publication | Real DB + Groq review; stage-adaptive form | Failed review remains draft; successful revision searchable |
| Discovery/detail | Real database filters, pagination, score and badge | Controlled fixtures prove all predicates |
| Intro/messages | Real persistence and participant-only realtime | Investor request -> free founder reply in another session |
| Simulator | Real mic, upload, STT, three LLM calls, TTS question, report | Completed session and recovery tests |
| Readiness loop | Real server calculation, revision linkage and entitlement | Before/after investor search on same startup |
| Public recording | Real opt-in to eligible pitch segment only | Q&A and private reports never exposed |
| Founder Pro billing | Real sandbox hosted checkout/webhook/reconciliation | Verified payment changes entitlement; redirect alone does not |
| Investor Pro | Server-seeded demo entitlement, visible 'Demo Pro' label | No payment claim and no browser-controlled tier |
| Saved searches/alerts | Clearly labeled preview; save locally in component state only | Toast 'Demo preview — no alerts will be sent'; no fake match from real data |
| Other Pro benefits | 'Planned' informational copy only | No inert controls presented as working features |
| WatchUp / pxxl | Real integrations required, evidence pending | Hosted URL + scrubbed captured error |
| Domain analytics | Append events without blocking successful user action | Events queryable in developer check; not a demo slide/dashboard |
| PostHog | Minimal consented page/event instrumentation | No sensitive form/audio/message capture |

## Roles and access

- Anonymous: landing, auth, truthful demo/privacy information. Cannot query profiles, audio, transcripts, messages, or score histories.
- Verified founder with onboarding complete: owns one startup, edits/reviews/publishes, runs eligible sessions, chooses own public audio, reads/replies to conversations involving that startup, visits billing.
- Verified investor with onboarding complete: search/read published startup projections, manage own investor profile, initiate intros only with effective investor Pro, read/reply to existing participant conversations even after demo entitlement expires.
- Incomplete/unchecked account: auth recovery and onboarding only; redirect to missing step with original safe internal destination preserved.
- Operator: server-side scripts/dashboard only, never a public role selector or client-writable admin field. Seed test data, grant demo investor entitlement, hide abusive content, run reconciliation/purge. No admin web product in this scope.
- One immutable role per account; no role switching, founder teams, or multiple ideas. UI explains this before choice. No founder-initiated cold outreach or investor directory in demo.

## Entitlement matrix

Owner-selected prices: Founder Pro NGN 5,000/month with USD 3/month reference option; Investor Pro USD 29/month. These are separately selected price points, not a calculated exchange rate. For this demo the actual Bachs recurring checkout is USD 3/month; label it clearly beside the button. Investor Pro shows USD 29/month as a planned plan price with 'Demo preview — subscriptions unavailable' and no checkout. Do not promise naira recurring checkout until provider support is verified.

| Action | Founder Free | Founder Pro | Investor Free | Investor Demo Pro |
|---|---|---|---|---|
| Own draft/review/publish | Yes | Yes | No | No |
| Lifetime practice | 3 completed | No monthly session cap, concurrency/rate protection applies | No | No |
| Delivery points/badge/public audio | No | Earned, current revision only | N/A | N/A |
| Read/reply to participant messages | Yes | Yes | Yes, if already participant | Yes |
| Sector/stage/keyword discovery | No | No | Yes | Yes |
| Country/ask/score/verified filters | No | No | Locked | Yes |
| Detail views | Own preview | Own preview | 20 distinct startup IDs/month | Unlimited |
| Initiate new intro | No | No | Upgrade preview | Yes |

The keyword box is shared in both investor tiers (D clarification). Free onboarding preferences may include geography/check size, but these cannot silently apply locked filters. Explicitly label un-applied Pro preferences. Effective entitlement is calculated on the server at every protected action; client state is display-only.

Founder Pro active = a reconciled sandbox subscription with paid-through time later than server UTC now, not revoked. A scheduled cancellation remains active through paid-through time. Past-due without an already-paid interval has no grace period in this baseline. Provider-specific statuses are translated only after B02. Prior private reports remain readable after expiry. Upgrading does not retroactively qualify free sessions. A session snapshots its starting entitlement; a Pro session begun before expiry can finish as Pro, but its public contribution requires active Pro at read time. Show expiry behavior on the offer and public-recording confirmation.

## Cost and misuse controls

Unlimited means no advertised per-month Pro practice allowance, not unlimited concurrent provider calls. One nonterminal session per founder; 3 session starts/10 minutes/account, 5 review requests/hour/account, 10 intro attempts/day/investor, 30 messages/minute/account. Server-enforced configurable D limits; 429 includes retry time. A provider capacity outage yields 'Practice is temporarily unavailable', never fake feedback. A paid production offer requires a capacity/budget policy in B07. A demo-wide provider budget is configured before enabling real AI; if exhausted disable new starts while preserving existing reports.

## Explicit exclusions

No AI-written founder answers, investor identity/funds verification, deal execution, investment advice engine, matching recommendations, automatic FX, file attachments in messages, webcam/video, profile logos/photos, PDF export/upload, real saved-search alerts, billing for investors, success fees, read-replica pipelines, legal protection windows, external notification delivery, or standalone mobile app. Do not add OAuth, organisation management, recurring background email, or admin screens without a scope change.

The domain signal assesses communication/readiness based on submitted material; it does not establish truth of business claims, guarantee funding, or certify investment suitability. Put that explanation in score help, not an intrusive warning on every screen.
