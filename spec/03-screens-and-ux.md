# Screen and interaction contract

This inventory replaces the ambiguous CSV mapping for implementation. It preserves all 17 major surfaces and includes the 28 smaller states within them. A route may render several states; a 'screen count' is not a requirement for separate pages.

## Visual authority and composition

Preserve the existing [design reference](../stitch_brand_design_system_generator/DESIGN.md) and [screenshot](../stitch_brand_design_system_generator/screen.png), with the following explicit D resolutions where they disagree. This is specification, not a UI rebuild.

- Use Instrument Sans, canvas `#EDEDED`, white panels, text `#111111`, secondary `#6B7280`, action blue `#1D4ED8`, hover `#1E40AF`, readiness accent `#EF8328`, border `#E2E2E2`, dark room `#111111`. The owner selected Instrument Sans after comparing its rendered letterforms, specifically its angled lowercase `t`. This explicit choice overrides the generic Impeccable font warning. These named semantic values take precedence over the export's competing generic `primary` aliases.
- Follow the owner-approved 26 September structural revision in `DESIGN.md`: major sections, cards, filter bars and buttons use sharp corners. Score rings, avatar dots, state nodes and small status tags retain purposeful rounding.
- Major page surfaces span the viewport with readable inner measures and gutters of at least40px at >=768px and16px below. At <768px columns stack; at >=1024px editor and report may use a sidebar. A contained infographic may scroll horizontally when preserving its diagram is clearer than shrinking it, but the page itself must never overflow. 320px viewport and 200% zoom remain usable.
- Landing is Persuade: dual-role headline/CTAs, honest capabilities, four-step explanation, simulator preview, discovery preview, final dual CTA. No invented user counts or partner logos. Authentication/app surfaces are Operate: task heading, next action, status, primary working area. Reports are Read: summary, evidence, actions, transcript.
- Calm composed language, concrete examples, no fabricated endorsement or certainty. 'Verified' always explains what was assessed. Free learners see improvement guidance, not rejection language.

## Route matrix

| ID / route | Actor and primary action | Required structure and states |
|---|---|---|
| S01 `/` | Everyone -> choose founder/investor | Brand header; equally prominent 'Practise my pitch' and 'Discover startups'; code-authored Pitch Signal hero visual showing pitch → three persona focuses → illustrative readiness; demo-labeled previews; auth links; readable mobile navigation. CTAs route through auth/onboarding, not to fake live UI. Follow `09-visual-assets-and-webgpu.md` |
| S02 `/auth/sign-in`, `/auth/sign-up` | Anonymous -> authenticate | Email/password; sign-in vs signup; invalid credentials, submitting, network failure; invited-email error; no role chosen implicitly by URL |
| S03 `/onboarding` | Verified incomplete user -> select role and complete profile | Two role cards, irreversible-choice explanation, founder five-field or short investor form; progress/resume; verified email wait state |
| S04 `/founder` | Founder -> continue next useful step | Draft/published status; score with 90+10 explanation; free remaining; Start practice; latest report; inbox unread count; upgrade status. Empty first-run has one 'Create profile' action |
| S05 `/founder/profile/edit` | Founder -> save/submit own writing | Sections Basics, Problem/Solution, Market/Traction, Team, Business/Competition, Ask; progressive navigation, inline examples/glossary, required markers; Save draft and Submit; stage variants; dirty leave confirmation, validation summary, save conflict/failure |
| S06 `/founder/reviews/:id` | Owner -> understand review | Processing, failed/retry, needs-improvement, passed/published, earlier-draft reviewed; category table, evidence/flags and Edit section links; content score and gate explanation; new publication success announcement |
| S07 `/founder/profile/preview` | Owner -> inspect investor projection | Explicit Preview banner; draft preview marked unreviewed or reviewed; published/draft selector; never renders private report/contact fields; remove/set pitch recording actions link to eligible session |
| S08 `/investor/profile` | Investor -> edit preferences | Required short profile + collapsed optional fields, save state, exact email-domain signal help; no KYC badge or photo uploader |
| S09 `/discover` | Investor -> find suitable founder | Keyword, sector/stage, Pro filters, result count/cards/pagination; filter chips; mobile drawer Apply/Clear; loading skeleton, empty marketplace, no matches/reset, failure/retry; locked filters and saved-search preview explicitly labeled |
| S10 `/startups/:id` | Investor -> assess and request intro | Name/tagline/sector/stage/country, score breakdown/help, problem/solution, market sources, traction, team, model/competition, ask, optional audio; Intro CTA; not listed404, cap reached, already conversation, blocked, stale publication states |
| S11 `/inbox`, `/inbox/:id` | Participant -> read/reply | Conversation list, identity/status, chronological messages, composer; empty inbox, unread, sending/sent/failed/retry, offline/reconnecting; block action confirmation. Mobile list and detail separate; free founder never sees a reply paywall |
| S12 `/simulator/new` | Founder -> prepare session | Startup snapshot/status; goal '3-minute pitch, up to5'; free/Pro impact before start; remaining sessions; mic permission/check; recording consent; device and voice readiness; generated three-person panel; limit reached, generation failure |
| S13 `/simulator/:id` pitch state | Owner -> deliver pitch | Three fictional personas; persistent recording indicator, elapsed/max timer, mic level, End pitch, Cancel; optional scene; microphone unavailable/disconnected, interruption, upload progress, retry. No live transcript, WPM or filler count |
| S14 same route, Q&A state | Owner -> hear/read question and answer | Speaker highlighted and named; exact question text; Play/Replay/Stop audio; 'Record answer' enabled after audio stops; answer timer/End answer; transcribing/feedback processing; TTS failure offers text-only question |
| S15 `/simulator/:id/report` | Owner -> learn and improve | Practice-only/eligible status; whole session score separate from public score; weighted axes, transcript-derived WPM/fillers, three detailed persona sections, next actions, full transcript; score update status; eligible audio choose confirmation; historical revision label |
| S16 `/billing` | Founder -> understand/upgrade | Actual built benefits vs Planned; sandbox price/currency/period; quota and expiry effects; 'Sandbox checkout'; active/subscription pending/unavailable states; no badge purchase promise |
| S17 `/billing/return` | Founder -> confirm status | Pending verification with polling; active confirmation; cancelled/failed/expired states; return to dashboard; refresh/reconcile. A success query parameter alone never displays confirmed Pro |

Supporting auth routes: `/auth/verify`, `/auth/forgot-password`, `/auth/reset-password` with invalid/expired-link recovery and resend cooldown60 seconds. `/privacy` and `/terms` show reviewed demo notices before collecting any outside participant data; if unavailable, demo stays invitation-only to prepared test accounts. Footer Contact cannot point to invented email; omit until owner supplies an address. Auth callback consumes verified provider state and navigates only to allowlisted routes.

## Interaction details shared across screens

- Every network operation has idle/loading/success/recoverable-error states. Disable duplicate submission while pending; retain entered text. Destructive or publication actions state what changes and require an explicit action, not a toast that silently executes.
- Toasts supplement persistent state. Critical errors remain near the relevant control until resolved. Error copy says what failed, whether data is saved, and the next action; include a copyable request ID for support, never raw provider errors.
- Skeletons preserve layout. Buttons maintain a stable label/width while loading. Long names wrap; no clipped essential field or horizontal score table on mobile.
- Profile submit, recording start/end and subscription impact are announced accessibly. Recording stop stays visible without scrolling. Permission denied includes browser settings help; no repeated automatic permission loop.
- Mic capture requires explicit Start and consent. Playback requires a user gesture; do not rely on autoplay. Audio cannot play while capturing an answer. Navigate away: warn if recording/unsaved upload, Cancel leaves session safely; close media tracks in cleanup.
- Question text and report text are available independently of sound/canvas. There is no typed-answer path earning delivery points in this baseline; users without usable microphone can still review/edit profiles and read reports. Accessible alternatives for a public launch remain in B07.
- Copy free banner: 'Practice session {n} of 3. You will receive feedback, but this session will not change your public score or earn a badge.' Pro banner: 'This session can contribute to your published profile if it meets the scoring requirements.' If draft only: 'Publish this exact profile version to make a matching Pro session eligible.'
- Publishing audio confirmation identifies recording date/duration and audience: 'Signed-in investors will be able to hear this pitch. Your Q&A and feedback stay private.' Remove action revokes future access immediately; already downloaded audio cannot be recalled.
- Intro modal shows recipient/startup, investor note, Send request. Existing thread uses 'Open conversation'. Subscription preview for free investor says 'Investor Pro is a demo preview; billing is not available.'

## Simulator boardroom specification

Maintain three distinct invented personas with stable left/centre/right placement. Proposed composition: dark contained scene, three abstract point-connected seat silhouettes and a gentle blue pulse only on the speaking persona. No real-person portraits, neon background, ambient scene audio, camera interaction, or animation implying AI is hearing the microphone continuously. Main action controls and question are DOM elements outside canvas. State data drives active speaker, never a separate scene timer.

The landing page uses the related lightweight Pitch Signal system described in `09-visual-assets-and-webgpu.md`. It must not initialize a decorative WebGPU renderer; reserve WebGPU/TSL for the simulator's contained experiential scene.

Lazy-load three.js WebGPURenderer/TSL only on simulator route. Feature-detect renderer setup; supported WebGL fallback where library supports it; static accessible persona cards after any renderer failure, reduced-motion request, or user 'Reduce effects'. A 3D failure never blocks mic, transcription or scoring. Proposed cap: <=10,000 particles total, pixel ratio<=1.5, pause rendering in hidden tabs, target>=30fps on demo device. No need to implement multiple art directions. Owner may refine this visual concept before UI build; the interaction/state contract does not depend on it.

## Accessibility and browser acceptance

D target: WCAG2.2 AA for implemented surfaces, verified by keyboard + contrast + automated checks (target, not a certification). Visible focus; semantic headings/form labels; error associations; dialog focus trap/return; aria-live polite processing messages; no colour-only scores/status; minimum44px primary touch targets; reduced motion support. Orange is an accent with dark text; muted grey cannot be essential small text if contrast fails. Help works by focus/click, not hover alone. Play/pause and all controls usable with keyboard, captions/question text always available.

Test latest stable Chrome/Edge desktop and Safari on iOS at build time and record exact versions; basic forms/search/messages also tested in Firefox. Mic on HTTPS only. Feature-detect media APIs and MIME types; unsupported browser shows explicit supported-device guidance and preserves draft. Check widths320/390/768/1440 and200% zoom, not just screenshot width1600.

## Copy corrections required at implementation

| Export phrase/implication | Required behavior/copy |
|---|---|
| 'pitch video' | 'selected audio pitch' |
| 'Real-time alerts', live WPM/filler diagnosis | 'Feedback after your pitch'; during capture only timer/level/recording |
| Founder 'request warm intros and message investors directly' | 'Investors can request an introduction; you can reply for free' |
| 'Once you are verified' as contact prerequisite | Published profiles can receive intros; badge is not required |
| Kora Health and sample78 look real | 'Illustrative demo profile'; never a customer claim |
| Earn score just by simulator use | Explain90 profile points +10 eligible Pro delivery points |
| Free trial/no card ambiguity | Three lifetime practice sessions; sandbox billing clearly identified |

Do not edit the reference export to erase evidence of these mismatches; implement the corrected copy in the application and check it at acceptance.
