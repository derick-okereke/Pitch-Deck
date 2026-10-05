# Backlog — Build Later

> Preserved scope exclusions. See [current demo scope](spec/01-scope-and-rules.md) for the additional boundary between functioning features and explicitly labeled previews. The declined AI-drafted-profile feature below remains prohibited.

Everything here was discussed and deliberately deferred. Do **not** build these for the hackathon; they're recorded so the direction isn't lost.

## Considered and explicitly declined (do not build, ever — not just "later")

**AI-drafted founder profile from a rough one-liner.** The idea: a founder types a messy one-line description and an LLM drafts starter values for problem, solution, sector, and stage. This was proposed and **rejected** — not deferred. Reasoning: Peekytoe's core purpose is founders learning to communicate their own idea; an AI-drafting feature would make it easy for some founders to be lazy about that, working against the product's actual mission. Do not build this, and be cautious about any future feature that lets an LLM write a founder's core pitch content on their behalf — it cuts against the same principle.

## Post-intro relationship tooling

Hosting the data room, tracking deal progress, handling diligence documents, e-signatures — things a founder/investor pair would want to keep using *after* the initial introduction. This is the strongest long-term answer to the "leakage" problem discussed in `05-search-discovery.md` (make staying on the platform valuable beyond the one-time intro, not just possible) — but it's a substantial build, well beyond hackathon scope.

## Teaser/blur Request Intro design

A stronger middle-ground version of the Request Intro flow: a free-tier founder can see that an investor message exists (blurred/teased preview) but the full content stays free to open and reply to — similar to how LinkedIn InMail or dating apps handle "someone's interested" previews. This would add upgrade pressure on the founder side without fully blocking replies. **Not built for the hackathon** — the current shipped design (see `05-search-discovery.md`) has founders always able to fully open and reply for free, regardless of tier, which is simpler and avoids the "dead marketplace" risk.

## Success fee enforcement

A contractual "protection window" clause (the recruiting/real-estate industry model) to prevent deals closing outside the platform without paying the success fee. Not needed for now, since the success fee is optional/voluntary by design (see `02-monetization.md`) — there's nothing to enforce.

## Full investor verification

Real KYC / proof-of-funds / accreditation checks. Replaced for the hackathon by a lightweight email-domain check (see `04-investor-profile.md`).

## Additional founder profile content

- Pitch-deck PDF upload
- Logo / profile photo upload

## Native mobile app

Decided against for now — the platform is web-only (responsive). Revisit only if there's a specific reason a native app becomes necessary post-launch.

## True video pitch capture

The current pitch recording feature (see `03-founder-profile.md`) is **audio only**, captured through the simulator's mic input. Actual video capture (webcam) would require a separate recording pipeline and storage strategy — a distinct future scope, not part of the current design.

## AI "explain this in plain terms" button

Mentioned as a stretch goal in `03-founder-profile.md` — an on-demand plain-English summary of a technical/jargon-heavy founder profile, for investors unfamiliar with that sector, reusing the existing LLM integration. Only build if core flows are complete with time to spare.
