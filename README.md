# Peekytoe — build specification

Specification baseline: **26 September 2026**. Target: **hackathon demonstration by 4 October 2026**, confirmed by the owner during this review. No application has been implemented or integration tested by this specification pass.

Peekytoe combines an investor discovery marketplace with an audio pitch practice simulator. The connection between them is a readiness score: profile quality contributes 90 points and eligible Pro practice contributes 10. Investors initiate introductions; founders can always reply free.

## Start here

1. [Assessment and decision register](spec/00-assessment-and-decisions.md) — what was missing, what is confirmed, what is proposed, and what still blocks release.
2. [Scope, roles, and entitlements](spec/01-scope-and-rules.md) — exactly what is real, demonstrated, or deferred.
3. [Fields, journeys, and scoring](spec/02-domain-and-scoring.md) — validation, publication, deterministic calculations, and badge rules.
4. [Screens and interaction states](spec/03-screens-and-ux.md) — routes, controls, errors, accessibility, and design authority.
5. [Data and permissions](spec/04-data-and-security.md) — entities, invariants, access control, media, and retention.
6. [Application API contracts](spec/05-api-contracts.md) — requests, responses, concurrency, retries, and failures.
7. [Simulator and AI contracts](spec/06-simulator-and-ai.md) — recording lifecycle, three-call design, output validation, and evidence rules.
8. [Integrations, billing, and analytics](spec/07-integrations-and-operations.md) — verified documentation, integration gates, and operational requirements.
9. [Acceptance and delivery plan](spec/08-acceptance-and-delivery.md) — traceable tests, demo fixtures, sequencing, and release gates.
10. [Visual assets and WebGPU direction](spec/09-visual-assets-and-webgpu.md) — the landing hero's Pitch Signal, simulator rendering rules, fallbacks, provenance, and optional owner assets.

The [machine-readable demo defaults](spec/demo-defaults.json) mirror the rules and include the owner's selected base prices: Founder Pro NGN5,000/month (USD3/month option) and Investor Pro USD29/month. Bachs demo checkout uses USD3/month; investor billing is a labeled preview.

## Authority and change control

The original `00-overview.md` through `08-backlog.md`, `PRODUCT.md`, and the two screen CSVs are planning evidence. Their bodies are preserved. The specification above resolves their contradictions for the **proposed demo baseline**; it does not turn an unanswered commercial or vendor question into an approved fact.

- **C — confirmed:** explicitly present in the original files. Preserve unless the owner changes it.
- **D — demo default:** a concrete recommendation introduced in this review. Build against it for the demo unless the owner corrects it; do not advertise it as approved production policy.
- **B — blocked fact:** requires owner input, vendor documentation, credentials, or a real integration test. Build the internal interface and explicit unavailable state, but do not fabricate the integration.
- New engineering details in `spec/` are D unless expressly marked C or B. MUST/SHALL describe the proposed baseline, not historical owner approval.
- Precedence: current explicit owner instruction → recorded C decisions → this proposed baseline → historical notes → illustrative HTML. Resolve contradictions by updating the decision register and affected contracts together.
- A future builder reads all specification files before implementation. If a required behavior is missing, record the gap and ask; do not quietly invent policy, vendor endpoints, testimonials, credentials, scores, or payment success.

## Design reference

The incumbent identity is [Quiet Editorial Marketplace](stitch_brand_design_system_generator/DESIGN.md). [The exported screenshot](stitch_brand_design_system_generator/screen.png) and [HTML](stitch_brand_design_system_generator/code.html) are references, not a working application or authoritative product copy. Known conflicts and token choices are resolved in the screen specification. No redesign is requested.

## Build readiness

The product and engineering behavior now have a reviewable specification. Implementation can begin on the domain, UI, database, and provider adapters. Official documentation is now located for all three compulsory vendors. **A verified end-to-end demo still requires account setup and integration evidence in B02–B06. Public launch is separately blocked by B07.** No document can honestly guarantee zero uncertainty; this pack makes unresolved uncertainty explicit and gives the builder a defined stop condition.
