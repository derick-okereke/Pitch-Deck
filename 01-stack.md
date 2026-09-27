# Stack & Infrastructure

> Historical planning brief. Use [the build specification](README.md) and [integration evidence](spec/07-integrations-and-operations.md) for implementation. Provider SDK/model/quota statements below are historical assumptions, not verified current integrations.

## Core decision: TypeScript/Next.js end-to-end

Not a split frontend (JS) + backend (Python) architecture. Reasoning: the frontend must be JavaScript regardless (browser). The core technical challenge — capturing a live 3-5 minute audio stream, sending it to Groq, streaming back LLM responses and ElevenLabs voice — is an I/O-heavy, concurrency-heavy workload, which is what Node's event loop is built for. Every third-party service used here (Groq, ElevenLabs, and the compulsory tools below) has either a first-class JS/TS SDK or a plain REST API callable with `fetch`. A separate Python backend would mean two codebases with no real benefit, since nothing here requires custom ML/audio processing — everything is a call to a hosted API.

## Layer-by-layer

| Layer | Choice | Notes |
|---|---|---|
| Frontend + backend | **Next.js (React, TypeScript)** | API routes double as the backend — one codebase |
| Database + auth | **Supabase** | Postgres under the hood, fits the relational data (profiles, scores, tiers, messages) well. Built-in auth. Realtime subscriptions are a natural fit for in-app messaging. |
| File/media storage | **Supabase Storage** | Same account as the DB. Free tier is modest (~1GB) — fine for demo volume, note if pitch recordings pile up. |
| LLM calls | **Groq** (Llama 3.x models) | Used for: persona generation, Q&A follow-up, profile/pitch scoring. Same provider as STT below — one API key, less integration overhead under time pressure. |
| Speech-to-text | **Groq Whisper** (`whisper-large-v3-turbo`) | Chosen over the browser's native `SpeechRecognition` because native STT drops out on pauses and isn't built for a continuous 3-5 minute monologue. Fast, accurate, cross-browser. |
| Text-to-speech | **ElevenLabs** (free tier) | Chosen for realism — this is the one place voice quality matters most for the "feels like a real boardroom" goal. Assign a distinct voice ID per AI investor persona. Free tier's monthly character quota is sufficient for demo-scale usage. |
| Deployment | **pxxl** *(compulsory)* | Nigerian-built cloud deployment platform, positioned as an African alternative to Vercel. Supports Next.js/React frontend and Node.js/Python/Go/PHP backend. **Caution:** small, young platform — deploy early in the build, not the night before, to catch any platform quirks. |
| Monitoring / error tracking | **WatchUp** *(compulsory)* | Sentry-style error tracking/observability. Confirmed Python SDK; a JS/Node SDK was not confirmed at planning time — check their docs directly early in the build, since this is compulsory. |
| Payments | **Bachs** *(compulsory)* | African payments/billing platform (hosted checkout, subscriptions, refunds, payouts). No official JS/TS SDK at planning time (listed as "coming soon") — call the REST API directly via `fetch` with `Authorization: Bearer sk_sandbox_...` / `sk_live_...`. See `02-monetization.md` for the specific checkout flow to build. |
| Product/interaction analytics | **PostHog** | Free tier: 1,000,000 events/month + 5,000 session recordings/month, forever free (not a trial). See `07-analytics.md` for full rationale and scope. |
| Hosting for payments (no processor beyond Bachs needed) | — | Since Bachs is compulsory and covers payments, no separate payment processor is needed. |

## Why not other options (for context, not required reading)

- Browser-native `SpeechRecognition` / `speechSynthesis`: viable zero-setup fallbacks if Groq/ElevenLabs integration time runs short, but noticeably worse for the demo's realism goal. Only fall back to these if setup time becomes the bottleneck.
- A Python/FastAPI backend: would be the stronger choice only if doing custom ML/audio processing (e.g., local Whisper, model fine-tuning) — not applicable here, since everything is a hosted API call.
