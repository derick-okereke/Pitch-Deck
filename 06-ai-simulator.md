# AI Pitch Simulator — "Learn to Pitch Properly"

> Historical brief. [Simulator/AI contract](spec/06-simulator-and-ai.md) resolves the three-call inconsistency to one Q&A question and defines schemas, evidence, recording states and recovery. Metrics are calculated after file transcription, not promised live. [Canonical scoring](spec/02-domain-and-scoring.md) supplies the single set of weighted axes.

## Goal

A simulated boardroom pitch environment that feels like a founder pitching to real investors — this is the platform's second core pillar alongside the marketplace, and should get equal demo weight.

## Flow, end to end

1. Learner starts the simulation → greeted by 3 AI "investor" personas, who give the go-ahead to begin.
2. A voice interface opens → learner pitches live for roughly **3-5 minutes**, captured via the browser mic (`getUserMedia` — no native app needed, this is part of why the platform is web-only, see `00-overview.md`).
3. The pitch audio is sent to **Groq Whisper** (`whisper-large-v3-turbo`) for transcription.
4. **Q&A round:** 1-2 of the 3 personas ask a live follow-up question, generated from the transcript and voiced via ElevenLabs. (Real investor pitches always include being questioned afterward — this is deliberately included because it's often the hardest part for founders to practice, and it's a strong demo moment.)
5. Learner responds (voice, transcribed the same way as step 3).
6. **Final feedback:** structured, per-category scores, **pacing/delivery metrics** (see below), and a **detailed** note from each persona — not a short summary. See "Feedback depth" below.

## LLM calls — exactly 3 per session, by design

Keeping this to a fixed 3 calls bounds both API cost and build complexity.

### Call 1 — Persona generation (at session start)
- Input: founder's declared industry + their one-line pitch/tagline
- Output: strict JSON, exactly 3 personas, each with:
  - Full name
  - Professional title (e.g., "Partner at a seed-stage fund," "Angel investor and former operator")
  - One-sentence `focus` — what this persona probes for
  - A `voice_style` tag (e.g., "warm but rigorous," "blunt, fast-paced")
- **Explicit instruction to the model:** do not use real, famous, or publicly identifiable people. Personas must be invented.
- Map `voice_style` to a small **pre-picked pool of 4-5 ElevenLabs voices**, choosing the nearest match programmatically — don't try to generate a unique voice per session; much less to manage under time pressure.

### Call 2 — Q&A follow-up (after the pitch transcript comes back)
- Input: the pitch transcript + one persona's name/title/focus
- Output: exactly one probing follow-up question, written in that persona's voice/style
- For the demo, 1-2 personas asking a question each is sufficient — not all 3 need to grill the founder.

### Call 3 — Final feedback (after the Q&A response)
- Input: the full transcript (pitch + Q&A), plus the pacing/filler-word metrics computed below (pass them in so the model can reference specifics, e.g. "your pace picked up noticeably when discussing the ask")
- Scored against the **same rubric axes** used for profile scoring (see `03-founder-profile.md`): clarity, market understanding, ask clarity, defensibility, delivery/confidence
- Output: structured JSON — a score per axis, plus a **detailed** written note per persona (see "Feedback depth" below — this is not a short summary, it's the core educational payload of the whole simulator)

## Feedback depth — this is the priority, not a nice-to-have

The simulator's purpose is to educate, not just score. Each persona's feedback note must be substantial enough to actually teach something, not a one-liner. For each persona, the note should cover:
- **What was done well** — specific, tied to something the founder actually said (not generic praise)
- **What was done poorly** — specific, with the actual moment or phrasing that fell short
- **How to improve** — concrete, actionable next steps, not vague encouragement
- **Suggested materials/resources** — point the founder toward something to go learn from (an article, a framework, a concept to research) relevant to their specific weak point

Prompt the model explicitly for this structure per persona (e.g., four labeled fields in the JSON: `what_worked`, `what_didnt`, `how_to_improve`, `resources`) rather than a single free-text blob — this keeps the output consistently detailed across sessions and makes it easy to render clearly in the UI (e.g., as expandable sections per persona) rather than a wall of text.

## Live pacing/filler-word tracking — no extra LLM call needed

Derive this directly from the Whisper transcript and its word-level timestamps during step 3 (pitch) and step 5 (Q&A response) — this is essentially free, since the data is already flowing through the transcription pipeline:
- **Words per minute** — overall, and optionally broken down by segment (e.g., did pacing spike or drop during the ask)
- **Filler word count** — simple keyword count against a small fixed list ("um," "uh," "like," "you know," etc.) against transcript timestamps
- Surface this alongside the score breakdown in the final feedback screen (e.g., "142 words/min, 6 filler words") — and optionally feed it into Call 3 as context so a persona's note can reference it directly, rather than presenting it as a disconnected stat.

This deepens the "AI coach" feel of the simulator and reinforces that it's teaching something concrete, not just scoring at the end.

## Free vs. Pro tier behavior

- **Free:** 3 sessions total, **lifetime** (not renewing monthly). Scores are for learning only — they never count toward the Pitch-Readiness Score or Verified badge. Show a clear note at session start ("this won't count toward your score") as an upgrade nudge.
- **Pro:** unlimited sessions. Scores **do** count toward the Pitch-Readiness Score and Verified badge. After a scored session, the founder can choose to set that session's audio as their public profile pitch recording (see `03-founder-profile.md`) — must be an explicit choice, never automatic.

## Voice stack

- **STT:** Groq Whisper — chosen over browser-native `SpeechRecognition` because native STT tends to drop out on pauses and isn't built for a continuous multi-minute monologue.
- **TTS:** ElevenLabs (free tier) — chosen specifically for realism, since voice quality is central to the "feels like a real boardroom" goal. Free tier's monthly character quota is sufficient for hackathon-scale demo usage.
