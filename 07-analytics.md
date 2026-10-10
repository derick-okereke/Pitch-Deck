# Analytics & Data Architecture

> Historical brief. [Integration/analytics contract](spec/07-integrations-and-operations.md) defines event schemas, best-effort delivery and sensitive-data exclusions. Private-route replay/autocapture is disabled in the proposed demo baseline. Old provider free-tier numbers below must not be treated as guarantees.

## Goal

Collect structured, long-term data from day 1 so that after real usage accumulates (potentially years of activity post-hackathon), the platform can answer questions like: which sectors/ideas attract the most investor interest, which get funded, where founders systematically under-focus in their profiles. This runs **silently in the background** — it is explicitly not part of the hackathon demo itself.

Two separate systems, tracking two different kinds of data. Keep them distinct.

## System 1 — Business/domain analytics (Supabase Postgres, append-only event tables)

**Core principle: never overwrite, always append.** These are separate tables from the operational tables (profiles, users) that power the live app — not columns bolted onto existing rows.

| Table | Logs | Eventually answers |
|---|---|---|
| `profile_score_history` | Every scoring run — per-category scores, stage, sector, timestamp | Which rubric categories founders consistently score lowest on, by sector/stage |
| `search_events` | Every investor search — filters used, result count, timestamp | Which sectors/stages/geographies investors are actually looking for, over time |
| `profile_view_events` | Viewer, founder, timestamp, source (search / alert / direct) | What kind of profile gets looked at most |
| `intro_request_events` | Investor, founder, timestamp, founder_subscribed, responded (bool), response_time | Response rates by sector/stage — a proxy for "what attracts real investor follow-through," since actual deal outcomes aren't tracked (deals close off-platform) |
| `simulator_session_events` | Founder, scores, persona_domain, tier, completed (bool), timestamp | Which pitch elements founders struggle with most in practice |

**Implementation notes:**
- Use a `jsonb` properties column on each table for flexibility — avoids frequent schema migrations as new metrics get added.
- Every event table needs an **indexed `created_at`/timestamp column** from day one — this is what any future export/pipeline job will page through, and adding it retroactively after millions of rows exist is painful.
- Analytics writes must be **async/fire-and-forget** relative to the primary user action (profile submission, search, etc.) — never let a slow or failed analytics insert block or break the user-facing action.

## System 2 — Interaction/behavioral analytics (PostHog)

Use **PostHog** rather than building click/heatmap tracking from scratch. Free tier: **1,000,000 events/month + 5,000 session recordings/month, forever free** (not a trial).

- One-line integration (`posthog.init()`), auto-captures clicks, page views, and scroll behavior — no manual per-button instrumentation needed.
- **Heatmaps feature** gives exactly the click/interaction "dot plot" needed to understand usage patterns, out of the box.
- Also includes session replay (watch anonymized sessions later) and funnels (see where users drop off in profile creation or the simulator flow) — both useful for post-launch iteration.
- Because this is a separate hosted service, it **never touches the production Supabase database** — zero contention risk with live traffic, by construction.

## Three distinct systems — keep boundaries clear

- **PostHog** → how people use the interface (clicks, funnels, drop-off, session replay)
- **Supabase event tables** → what happened in the business (scores, searches, intros) — needs to be relational so it can be joined against the app's own schema
- **WatchUp** *(compulsory tool, see `01-stack.md`)* → request performance, structured logs, scrubbed errors, and owner-requested consented page/product analytics. See [current observability setup](docs/phase5-observability.md); expanded on October 10, 2026.

## Scaling plan for later — design for it now, don't build it now

At small scale (early users, e.g. ~10 users), Postgres handles the load from the event tables above without any issue — building a separation pipeline now would be solving a problem that doesn't exist yet, at the cost of hackathon time. The four implementation notes above (separate tables, append-only, indexed timestamp, jsonb) are what keep this option open without any extra build work now.

**Step 1 (first real scale):** Supabase **Read Replicas** — a GA feature (Pro plan and above) that provides a read-only, synced copy of the database specifically for isolating heavy analytical reads from production traffic. Point analytics queries at the replica instead of the primary. No custom pipeline needed — just an infrastructure/config change when the time comes.

**Step 2 (larger scale):** a scheduled job exports new rows from the event tables (using the timestamp cursor) into cheap object storage as flat files (e.g., Parquet), queryable with something like DuckDB. No server to run or maintain, minimal ongoing cost.

Only at substantial scale would a full dedicated analytics database/warehouse be worth the added cost and complexity — and by then, real usage/revenue would justify building it.

## Privacy note

As this data accumulates over years across real founders and investors, favor **aggregating before analyzing** (e.g., "which sectors get funded most" doesn't need individual identities attached) and maintain a privacy notice. Not something to build now — worth keeping in mind as the dataset grows.
