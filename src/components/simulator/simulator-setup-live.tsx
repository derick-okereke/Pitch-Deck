"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, AudioLines, Check, CircleAlert, Headphones, Mic2, ShieldCheck } from "lucide-react";
import { simulatorPersonas } from "@/data/simulator-demo";
import { useAudioCapture } from "@/hooks/use-audio-capture";

type ActiveSession = { id: string; state: string; state_version: number; expires_at: string };

export function SimulatorSetupLive({ activeSession, draftVersion, expiredSession, remainingFree, startupId, workspaceUnavailable }: {
  activeSession: ActiveSession | null;
  draftVersion: number;
  expiredSession: boolean;
  remainingFree: number;
  startupId: string | null;
  workspaceUnavailable: boolean;
}) {
  const router = useRouter();
  const mic = useAudioCapture();
  const [consent, setConsent] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const ready = mic.state === "ready" && consent && Boolean(startupId) && remainingFree > 0 && !workspaceUnavailable;
  const resumeSession = () => {
    if (!activeSession || mic.state !== "ready" || !consent) return;
    if (Date.parse(activeSession.expires_at) <= Date.now()) {
      setStartError("This session has expired. Reload setup to begin a new one.");
      router.refresh();
      return;
    }
    window.sessionStorage.setItem("pitch-deck-simulator-consent-at", String(Date.now()));
    mic.release();
    router.push(`/simulator/${activeSession.id}`);
  };
  const enterSession = async () => {
    if (!ready || !startupId) return;
    setStarting(true);
    setStartError(null);
    try {
      const response = await fetch("/api/v1/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ startup_id: startupId, draft_version: draftVersion, consent_version: "recording-consent-v1" }),
      });
      const payload = await response.json() as { data?: { session_id: string }; error?: { message: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "The session could not start.");
      window.sessionStorage.setItem("pitch-deck-simulator-consent-at", String(Date.now()));
      mic.release();
      router.push(`/simulator/${payload.data.session_id}`);
    } catch (error) {
      setStartError(error instanceof Error ? error.message : "The session could not start.");
      setStarting(false);
    }
  };

  return (
    <main className="simulator-page setup-page">
      <div className="simulator-page-heading">
        <Link className="back-link" href="/founder"><ArrowLeft size={15} /> Founder overview</Link>
        <div className="simulator-heading-grid">
          <div><h1>Prepare the room before you pitch.</h1><p>A focused practice with two follow-up questions from two different panel members. Check your microphone, understand how the recording is processed, then begin when you are ready.</p></div>
          <div className="session-allowance"><strong>{remainingFree}</strong><span>free learning session{remainingFree === 1 ? "" : "s"} available</span><small>Lifetime allowance · reserved only after the panel is ready</small></div>
        </div>
      </div>

      <section className="setup-impact" aria-label="Practice session processing">
        <ShieldCheck size={20} />
        <div><strong>Provider-connected practice</strong><p>Your profile snapshot, recordings, transcripts, session state, and scored report persist across refresh.</p></div>
        <span>Private session</span>
      </section>

      <div className="simulator-setup-grid">
        <section className="readiness-panel">
          <div className="panel-heading"><h2>Device and voice readiness</h2><p>Microphone access starts only when you choose Check microphone.</p></div>
          <div className={`mic-check ${mic.state}`}>
            <div className="mic-visual" style={{ "--mic-level": mic.level } as React.CSSProperties}><Mic2 size={23} /><i /></div>
            <div><strong>{mic.state === "ready" ? "Microphone ready" : mic.state === "requesting" ? "Waiting for permission" : "Check your microphone"}</strong><p>{mic.message}</p></div>
            <button className="button button-light" type="button" onClick={() => void mic.request()} disabled={mic.state === "requesting"}>{mic.state === "ready" ? "Check again" : "Check microphone"}</button>
          </div>
          {(mic.state === "denied" || mic.state === "unsupported" || mic.state === "error") && <div className="persistent-error" role="alert"><CircleAlert size={18} /><div><strong>Microphone is not ready</strong><p>{mic.message}</p></div></div>}
          {workspaceUnavailable ? <div className="persistent-error" role="alert"><CircleAlert size={18} /><div><strong>Profile storage is unavailable</strong><p>Apply the latest Supabase migrations, then reload this page before starting practice.</p></div></div> : null}
          {!startupId && !workspaceUnavailable ? <div className="persistent-error" role="alert"><CircleAlert size={18} /><div><strong>Create a founder profile first</strong><p>Practice snapshots the current draft so later feedback remains tied to the words you rehearsed.</p></div></div> : null}
          {startError ? <div className="persistent-error" role="alert"><CircleAlert size={18} /><div><strong>The room did not open</strong><p>{startError} Your free allowance was not consumed.</p></div></div> : null}
          {expiredSession && !activeSession ? <div className="session-resume" role="status"><div><strong>Your previous session expired</strong><p>Check your microphone and consent again to begin a new session. The expired reservation does not use a free session.</p></div></div> : null}
          {activeSession ? <div className="session-resume" role="status"><div><strong>Practice already in progress</strong><p>Resume the saved {activeSession.state.replaceAll("_", " ")} session after checking your microphone and confirming recording consent again.</p></div><button className="button button-light" type="button" disabled={mic.state !== "ready" || !consent} onClick={resumeSession}>Resume session <ArrowRight size={16} /></button></div> : null}

          <label className="recording-consent">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span><strong>I consent to this recording being transcribed.</strong><small>The audio is sent to Groq to produce a private transcript and two follow-up questions. Generated question text is sent to ElevenLabs only when you request voice playback.</small></span>
          </label>

          <div className="setup-actions">
            <div><Headphones size={17} /><span>Headphones recommended for the spoken questions.</span></div>
            {activeSession ? null : <button className="button button-dark" type="button" disabled={!ready || starting} onClick={() => void enterSession()}>{starting ? "Preparing your panel…" : ready ? <>Enter the pitch room <ArrowRight size={16} /></> : remainingFree === 0 ? "Free sessions used" : "Complete readiness first"}</button>}
          </div>
        </section>

        <aside className="practice-brief">
          <div className="panel-heading"><h2>What happens</h2><p>The session keeps one job visible at a time.</p></div>
          <ol className="practice-steps">
            <li><span>01</span><div><strong>Deliver your pitch</strong><p>Aim for three minutes. The hard stop is five.</p></div></li>
            <li><span>02</span><div><strong>Answer two generated questions</strong><p>Two different fictional personas each probe something you said or left unclear.</p></div></li>
            <li><span>03</span><div><strong>Review the result</strong><p>Both answers are transcribed, then the report ties every score and next action to what you said.</p></div></li>
          </ol>
          <div className="persona-preview-list">
            <p>Example fictional panel</p>
            {simulatorPersonas.map((persona) => <div key={persona.key}><span>{persona.initials}</span><div><strong>{persona.name}</strong><small>{persona.focus}</small></div><Check size={14} /></div>)}
          </div>
          <p className="fixture-disclosure"><AudioLines size={16} /> Your three fictional personas are generated from the saved sector, stage, and tagline when the room starts.</p>
        </aside>
      </div>
    </main>
  );
}
