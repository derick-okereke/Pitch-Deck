# Investor Profile Creation

> Historical brief. See [domain contract](spec/02-domain-and-scoring.md) for fields and the proposed correction from "Verified Firm" to "Firm email matched — not identity or funds verification". Account authentication and profile onboarding are separate steps in the build specification.

## Design principle

Opposite of the founder form: keep this **short and low-friction**. Investors are the platform's paying customers, and every extra required field before they can start browsing costs signups. Capture just enough to power search/matching and basic trust; leave everything else optional.

## Required fields (gates account creation)

| Field | Why it's required |
|---|---|
| Full name | Basic identity |
| Investor type | Angel / VC firm / corporate venture / accelerator — changes what "credible" looks like on the rest of the profile |
| Primary sector(s) of interest | Multi-select. Core search filter and what saved-search alerts match against |
| Stage preference | `idea` / `pre-seed` / `seed` / `growth` — must use the **exact same vocabulary** as the founder profile's stage field so filtering lines up on both sides |
| Geography focus | Country/region — matters given the Nigerian/African founder base |
| Typical check size range | Min-max. Lets a founder instantly see whether an investor's checks even match their ask, before either side wastes time messaging |

## Optional fields (fill out the profile, don't block signup)

- Firm/fund name
- Professional title
- LinkedIn URL — a soft trust signal only, not verified by the platform (see below)
- Short bio (2-3 sentences)
- Profile photo
- Investment type preference (equity / SAFE / debt / grant) — nice-to-have, **skip for the hackathon demo**

## Verification — kept intentionally cheap

Full investor verification (proof of funds, accreditation/KYC checks) is out of scope for the hackathon timeline and isn't what a demo needs to prove. Two lightweight signals instead:

- **Email-domain check** — if the signup email matches a recognizable fund domain, auto-flag the profile as **"Verified Firm."** Otherwise, default to **"Pending Verification."** Trivial to build (a domain string check), and it visibly demonstrates the concept without any real KYC pipeline.
- **LinkedIn link** — displayed on the profile as a soft signal for founders to do their own due diligence. Not verified by the platform. Zero build cost.

## In-app help for jargon

Same tooltip mechanism as the founder form (see `03-founder-profile.md`) — apply it here too, particularly around terms like "check size," "stage," and investment-type terminology, since less experienced individual/angel investors may not be fluent in standard VC vocabulary either.

## Where these fields plug in

Sector, stage, geography, and check-size range aren't just profile decoration — they directly populate the search filters and saved-search alerts described in `05-search-discovery.md`. One form, doing double duty.
