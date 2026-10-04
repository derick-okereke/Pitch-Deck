"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, AudioLines, Check, CircleAlert, FileText, Headphones, Mic2, ShieldCheck } from "lucide-react";
import { simulatorPersonas } from "@/data/simulator-demo";
import { useAudioCapture } from "@/hooks/use-audio-capture";
import { founderSectors } from "@/lib/profile";

const industryLabels: Record<(typeof founderSectors)[number], string> = {
  agritech: "Agritech", "climate-energy": "Climate & energy", commerce: "Commerce", education: "Education",
  fintech: "Fintech", healthtech: "Healthtech", logistics: "Logistics", "enterprise-software": "Enterprise software",
  consumer: "Consumer", other: "Other",
};

type ActiveSession = { id: string; state: string; state_version: number; expires_at: string };
type RecentReport = { session_id: string; session_points: number; created_at: string };

export function SimulatorSetupLive({ activeSession, draftVersion, expiredSession, isPro, remainingFree, recentReports, reportsUnavailable, startupId, workspaceUnavailable }: {
  activeSession: ActiveSession | null;
  draftVersion: number;
  expiredSession: boolean;
  isPro: boolean;
  remainingFree: number;
  recentReports: RecentReport[];
  reportsUnavailable: boolean;
  startupId: string | null;
  workspaceUnavailable: boolean;
}) {
  const router = useRouter();
  const mic = useAudioCapture();
  const [consent, setConsent] = useState(false);
  const [industry, setIndustry] = useState<(typeof founderSectors)[number] | "">("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const ready = mic.state === "ready" && consent && Boolean(industry) && Boolean(startupId) && (isPro || remainingFree > 0) && !workspaceUnavailable;
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
        body: JSON.stringify({ startup_id: startupId, draft_version: draftVersion, consent_version: "recording-consent-v1", industry }),
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
          {isPro ? (
            <div className="session-allowance"><strong>∞</strong><span>Founder Pro practice is active</span><small>No advertised monthly practice cap · eligible results can contribute delivery points</small></div>
          ) : (
            <div className="session-allowance"><strong>{remainingFree}</strong><span>free learning session{remainingFree === 1 ? "" : "s"} available</span><small>Lifetime allowance · reserved only after the panel is ready</small></div>
          )}
        </div>
      </div>

      <section className="setup-impact" aria-label="Practice session processing">
        <ShieldCheck size={20} />
        <div><strong>Provider-connected practice</strong><p>Your profile snapshot, recordings, transcripts, session state, and scored report persist across refresh.</p></div>
        <span>Private session</span>
      </section>

      <section className="practice-results" aria-labelledby="practice-results-title">
        <div className="practice-results-heading">
          <div><h2 id="practice-results-title">Your results</h2><p>Return to your private coaching reports at any time.</p></div>
          <Link className="practice-results-all" href="/simulator/history">View all results <ArrowRight size={16} /></Link>
        </div>
        {reportsUnavailable ? <p className="practice-results-status" role="status">Reports could not load. Refresh this page to try again.</p> : recentReports.length ? (
          <ol className="practice-results-list">
            {recentReports.map((report) => <li key={report.session_id}>
              <FileText size={19} aria-hidden="true" />
              <div><strong>Pitch practice report</strong><span>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(report.created_at))} · {Math.round(report.session_points)}/100 session score</span></div>
              <Link href={`/simulator/${report.session_id}/report`}>Review result <ArrowRight size={16} /></Link>
            </li>)}
          </ol>
        ) : <p className="practice-results-status">Your completed practice reports will appear here.</p>}
      </section>

      <div className="simulator-setup-grid">
        <section className="readiness-panel">
          <div className="panel-heading"><h2>Set up your practice</h2><p>Choose an industry, then check your microphone. Access starts only when you choose Check microphone.</p></div>
          <div className="industry-choice">
            <label htmlFor="practice-industry">Industry for this practice <span>Required</span></label>
            <p>Choose the field you want the panel to assess. You can practise a different industry next time without changing your profile.</p>
            <select id="practice-industry" value={industry} onChange={(event) => setIndustry(event.target.value as typeof industry)} required>
              <option value="" disabled>Choose an industry</option>
              {founderSectors.map((value) => <option key={value} value={value}>{industryLabels[value]}</option>)}
            </select>
          </div>
          <div className={`mic-check ${mic.state}`}>
            <div className="mic-visual" style={{ "--mic-level": mic.level } as React.CSSProperties}><Mic2 size={23} /><i /></div>
            <div><strong>{mic.state === "ready" ? "Microphone ready" : mic.state === "requesting" ? "Waiting for permission" : "Check your microphone"}</strong><p>{mic.message}</p></div>
            <button className="button button-light" type="button" onClick={() => void mic.request()} disabled={mic.state === "requesting"}>{mic.state === "ready" ? "Check again" : "Check microphone"}</button>
          </div>
          {(mic.state === "denied" || mic.state === "unsupported" || mic.state === "error") && <div className="persistent-error" role="alert"><CircleAlert size={18} /><div><strong>Microphone is not ready</strong><p>{mic.message}</p></div></div>}
          {workspaceUnavailable ? <div className="persistent-error" role="alert"><CircleAlert size={18} /><div><strong>Profile storage is unavailable</strong><p>Apply the latest Supabase migrations, then reload this page before starting practice.</p></div></div> : null}
          {!startupId && !workspaceUnavailable ? <div className="persistent-error" role="alert"><CircleAlert size={18} /><div><strong>Create a founder profile first</strong><p>Practice snapshots the current draft so later feedback remains tied to the words you rehearsed.</p></div></div> : null}
          {startError ? <div className="persistent-error" role="alert"><CircleAlert size={18} /><div><strong>The room did not open</strong><p>{startError} {isPro ? "No practice session was started." : "Your free allowance was not consumed."}</p></div></div> : null}
          {expiredSession && !activeSession ? <div className="session-resume" role="status"><div><strong>Your previous session expired</strong><p>{isPro ? "Check your microphone and consent again to begin a new scored session." : "Check your microphone and consent again to begin a new session. The expired reservation does not use a free session."}</p></div></div> : null}
          {activeSession ? <div className="session-resume" role="status"><div><strong>Practice already in progress</strong><p>Resume the saved {activeSession.state.replaceAll("_", " ")} session after checking your microphone and confirming recording consent again.</p></div><button className="button button-light" type="button" disabled={mic.state !== "ready" || !consent} onClick={resumeSession}>Resume session <ArrowRight size={16} /></button></div> : null}

          <label className="recording-consent">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span><strong>I consent to this recording being transcribed.</strong><small>The audio is sent to Groq to produce a private transcript and two follow-up questions. Generated question text is sent to ElevenLabs only when you request voice playback.</small></span>
          </label>

          <div className="setup-actions">
            <div><Headphones size={17} /><span>Headphones recommended for the spoken questions.</span></div>
            {activeSession ? null : <button className="button button-dark" type="button" disabled={!ready || starting} onClick={() => void enterSession()}>{starting ? "Preparing your panel…" : ready ? <>Enter the pitch room <ArrowRight size={16} /></> : !isPro && remainingFree === 0 ? "Free sessions used" : !industry ? "Choose an industry first" : "Complete readiness first"}</button>}
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
          <p className="fixture-disclosure"><AudioLines size={16} /> Your three fictional personas use the industry you choose here, plus your saved stage and tagline.</p>
        </aside>
      </div>
    </main>
  );
}
