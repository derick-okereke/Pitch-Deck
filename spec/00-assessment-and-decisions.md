# Assessment and decision register

## Verdict

The original material is a good product brief, but insufficient as a build contract. It describes the value proposition, actors, stack, broad flows, monetization, and a coherent visual identity. It lacks the state, data, permissions, failure, and acceptance rules that otherwise force a builder to guess. There is no package manifest, application source, schema migration, test suite, or deployment evidence in the inspected project files; the only HTML is a Stitch concept export.

## Source review

| Source | Useful evidence | Gap or contradiction resolved here |
|---|---|---|
| `00-overview.md` | Dual product, deadline, compulsory vendors | Eleven-day plan no longer matches the Sep 26–Oct 4 calendar; replace with dated gates |
| `01-stack.md` | Next.js, Supabase, Groq, ElevenLabs | Broad SDK/model claims are not integration proof; no runtime, timeout, upload, or secret contract |
| `02-monetization.md` | Three lifetime free sessions; scored Pro; Bachs checkout | Mock all gating vs actual score/usage/payment rules; undecided prices and caps; paid offer includes unbuilt features |
| `03-founder-profile.md` | 90+10 rubric, draft/publish, consent for audio | Publication threshold tentative; no revision behavior, session selection, badge threshold, or missing-evidence rules |
| `04-investor-profile.md` | Short onboarding, aligned stages | Domain matching does not verify a firm; account creation confused with profile completion |
| `05-search-discovery.md` | Investor-led intros; free founder replies | No sort/pagination/currency rules; no duplicate intro, blocked user, message delivery, or view-cap definitions |
| `06-ai-simulator.md` | Three personas, deep coaching, audio Q&A | Three calls conflicts with one call per question; feedback axes differ from profile axes; no recovery or quota timing |
| `07-analytics.md` | Separate operational/business/interaction concerns | Append-only conflicts with mutable response fields; detached promises may be lost; replay can expose private text |
| `08-backlog.md` | Explicit non-goals | Must override plan-card aspirations and prevent accidental scope expansion |
| `PRODUCT.md` | Durable intent, three.js WebGPU/TSL commitment | References root DESIGN.md that does not exist; confirms stack absent from stack file; unconfirmed synthesis needs provenance |
| Both screen CSVs | 17 major surfaces, 28 small states | Some source filenames are wrong; no routes, permission gates, failure transitions, or acceptance criteria |
| Stitch `DESIGN.md`, `code.html`, `screen.png` | Incumbent palette, typography, editorial layout | Prose calls for rounded panels but screenshot is square; radii/token maps differ; HTML copy mentions video, live metrics, reversed intro direction |

Read all ten root Markdown documents, both CSV inventories, the exported design document, and inspected the HTML and screenshot. The newly installed `.agents/skills/impeccable` is tooling, not product requirements.

## Confirmed decisions

| ID | Decision |
|---|---|
| C01 | Responsive browser app; Next.js/TypeScript, Supabase DB/auth/storage, Groq LLM/STT, ElevenLabs TTS |
| C02 | pxxl deployment, WatchUp monitoring, Bachs payments are compulsory; no substitution without owner instruction |
| C03 | Marketplace and simulator get equal demo attention; deadline October 4, 2026 unless owner revises it |
| C04 | One profile rubric: clarity 20, market 15, traction 20, team 15, business model 10, competition 10, delivery 10 |
| C05 | Exactly three free lifetime practice sessions; free scores do not contribute to marketplace readiness or badge |
| C06 | Pro sessions may contribute; payment alone never awards readiness or verification; free-only maximum 90/100 |
| C07 | Audio only; publish a selected eligible recording only after explicit founder consent |
| C08 | Investors initiate intros; founders always read and reply without a founder subscription; no directory contact fields |
| C09 | Saved searches/alerts and investor billing are mocked for hackathon; one real Bachs sandbox Founder Pro path |
| C10 | No AI-drafted profile, native mobile, webcam, actual deal processing, success-fee collection, KYC, or data room |
| C11 | Preserve editorial identity; invented investor personas only; never fabricate customers, testimonials, or outcomes |
| C12 | Three.js WebGPU renderer with TSL is scoped to the simulator scene; preserve this implementation choice |
| C13 | Owner selected base pricing during this review: Founder Pro NGN 5,000/month (USD 3/month reference price); Investor Pro USD 29/month. These are selected price points, not an FX conversion. Demo checkout uses USD 3; investor billing stays preview-only. |
| C14 | Owner wants a stronger visual element in the landing hero and installed the project-local WebGPU/Three.js/TSL skill primarily for the AI simulator. The hero and simulator should be designed together through Impeccable. |

## Explicit demo defaults introduced by this review

These are recommendations, not claims about decisions already made. They are sufficient to implement a consistent demo. Owner changes must update dependent acceptance cases.

| ID | Default | Why / affected contract |
|---|---|---|
| D01 | One immutable role per account; one startup per founder in both tiers | Avoid org/team ownership and role-switching scope; separate demo accounts |
| D02 | Account signup first, role/profile completion second; verified email required for private app actions | Prevent incomplete investor form from blocking basic authentication recovery |
| D03 | Publish at content score >=50/90; displayed total is content + delivery out of 100 | Prevent an otherwise failing profile being rescued solely by delivery; gate is stable across subscription changes |
| D04 | Badge: published profile, active Pro, qualifying session overall >=75 and delivery >=7/10, combined readiness >=70 | Earned measurable readiness; explicit provisional thresholds |
| D05 | Use best delivery from qualifying sessions tied to exact current published revision; ties newest | Avoid unexplained score decline; no stale startup evidence reused |
| D06 | Subscription expiry removes delivery contribution, badge, and public recording access; private history remains | Implements current-tier free maximum; disclose at checkout |
| D07 | Use the owner's C13 prices: USD 3 Founder Pro sandbox checkout; display NGN 5,000 reference pricing and USD 29 Investor Pro preview | Bachs currently documents USD-card-only subscriptions; label actual checkout currency and unavailable investor checkout explicitly |
| D08 | Demo free investor limit 20 unique founder detail views per UTC calendar month; demo Pro from server fixture only | Makes cap testable; list cards and repeat views are free |
| D09 | One Q&A question per session, selected from three personas; no branching follow-up | Makes exactly three logical LLM calls coherent |
| D10 | Pitch 30–300 seconds; three minutes suggested; answer 5–90 seconds; English UI and transcription | Bounded accessible demo; no claimed multilingual coaching |
| D11 | Free slot reserved at session creation, charged once at successful completion; failures release reservation | Avoid penalizing provider/device failures; atomic concurrency control |
| D12 | Investor discovery behind verified login; 'public profile' means investor-visible, not indexed on the open web | Make privacy/access unambiguous |
| D13 | Ask/check amounts support NGN and USD with explicit currency; never convert or compare unlike currencies | Avoid invented exchange rates; billing currency is separately NGN |
| D14 | 'Firm email matched — not identity or funds verification' replaces 'Verified Firm'; no match = 'Unverified' | Do not imply a due-diligence pipeline exists; this intentionally corrects original copy |
| D15 | Real server enforcement for publication, privacy, founder tiers, quotas, and intro permissions; investor Pro provided by labeled demo fixtures | UI mocks cannot serve as security boundaries |
| D16 | No boosted ranking, view analytics UI, PDF export, alerts delivery, credits, or early access in demo | Original notes call all non-checkout tier benefits mocked; keep core flows feasible |
| D17 | Draft edit does not change live revision; re-review/publish replaces it and invalidates prior delivery association | Stable investor view; prevents scores attached to changed facts |
| D18 | Static persona cards work everywhere; contained particle boardroom is progressive enhancement with no functional dependency | Preserve committed 3D stack while keeping audio flow usable |
| D19 | Hide private contact fields from all directory APIs; private messages may voluntarily contain contact details | Technically realistic interpretation of in-platform introductions; no false anti-leakage promise |
| D20 | Demo invite-only with clearly marked synthetic profiles; analytics replay/autocapture off on private surfaces | Keep demonstrations separate from a public real-user launch |
| D21 | Use the shared Pitch Signal language: lightweight SVG/canvas/DOM in the hero; richer WebGPU/TSL particle boardroom in the simulator | Creates visual continuity without loading a second decorative GPU experience on the landing page |

## Facts a builder must not invent

| ID | Needed evidence and owner | Blocks | Allowed work meanwhile |
|---|---|---|---|
| B01 | Owner confirmed hackathon demo by October 4 in this review; exact submission time/timezone remains to be supplied | Final submission timing only | Freeze Oct 3 |
| B02 | Bachs account USD monthly product/price, signature verification and real sandbox event samples; builder records evidence | Verified upgrade demo | Internal billing adapter, pending/error UI, unit fixtures |
| B03 | pxxl account + Node runtime/port/build settings, request limits and authenticated HTTPS smoke test | Live application demo | Local app, deployment checklist; no fake hosting claims |
| B04 | Official Next.js SDK documentation now located from owner link and read in browser; builder must configure account keys and demonstrate scrubbed client/server events | Compulsory monitoring completion | Implement documented @watchupltd SDK adapter |
| B05 | Active Groq chat model ID/output mode, account quotas, tested STT media/timestamps; ElevenLabs model/three licensed voice IDs/quotas | Working AI/voice demo | Strict internal schemas and explicitly labeled fixtures |
| B06 | Supabase project, SMTP/verified test accounts, storage limits, RLS/realtime/storage tests | Multi-user demo | Migrations and local tests |
| B07 | Live currency/payment availability at selected C13 prices, real service capacity/cost policy, privacy/terms/retention/consent, abuse response owner, cancellation/deletion procedures | Any public launch or live payments | Hackathon demo only; no implied legal or commercial clearance |

As of this review no credentials were inspected, accounts modified, or vendor integrations run. Official documentation was located for pxxl and Bachs; the owner supplied WatchUp's direct Next.js documentation, which was successfully read in the browser after the web reader failed. All three compulsory vendors now have researched setup references; account-specific integration proof remains B02–B04. See the integration evidence ledger. The owner confirmed the October 4 hackathon deadline and C13 base prices; other D policies remain explicitly proposed.

## Change template

Record: decision ID, date, owner instruction or source, old behavior, new behavior, affected fields/routes/tests, migration implications. Do not silently edit only the UI when scoring or entitlement policy changes.
