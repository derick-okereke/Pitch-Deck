"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, AudioLines, Check, CircleAlert, Headphones, Mic2, ShieldCheck } from "lucide-react";
import { simulatorPersonas } from "@/data/simulator-demo";
import { useAudioCapture } from "@/hooks/use-audio-capture";

export function SimulatorSetupLive() {
  const mic = useAudioCapture();
  const [consent, setConsent] = useState(false);
  const ready = mic.state === "ready" && consent;
  const enterSession = () => {
    window.sessionStorage.setItem("pitch-deck-simulator-consent-at", String(Date.now()));
    mic.release();
  };

  return (
    <main className="simulator-page setup-page">
      <div className="simulator-page-heading">
        <Link className="back-link" href="/founder"><ArrowLeft size={15} /> Founder overview</Link>
        <div className="simulator-heading-grid">
          <div><h1>Prepare the room before you pitch.</h1><p>A focused practice with one generated follow-up question. Check your microphone, understand how the recording is processed, then begin when you are ready.</p></div>
          <div className="session-allowance"><strong>3</strong><span>free learning sessions available</span><small>Practice score · public profile unchanged</small></div>
        </div>
      </div>

      <section className="setup-impact" aria-label="Practice session processing">
        <ShieldCheck size={20} />
        <div><strong>Provider-connected practice</strong><p>Your recording is sent to Groq for transcription. Pitch Deck does not save the audio file in this build.</p></div>
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

          <label className="recording-consent">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span><strong>I consent to this recording being transcribed.</strong><small>The audio is sent to Groq to produce a private transcript and follow-up question. Generated question text is sent to ElevenLabs only when you request voice playback.</small></span>
          </label>

          <div className="setup-actions">
            <div><Headphones size={17} /><span>Headphones recommended for the spoken question.</span></div>
            {ready ? <Link className="button button-dark" href="/simulator/demo-session" onClick={enterSession}>Enter the pitch room <ArrowRight size={16} /></Link> : <button className="button button-dark" type="button" disabled>Complete readiness first</button>}
          </div>
        </section>

        <aside className="practice-brief">
          <div className="panel-heading"><h2>What happens</h2><p>The session keeps one job visible at a time.</p></div>
          <ol className="practice-steps">
            <li><span>01</span><div><strong>Deliver your pitch</strong><p>Aim for three minutes. The hard stop is five.</p></div></li>
            <li><span>02</span><div><strong>Answer one generated question</strong><p>Groq selects one fictional persona to probe your transcript.</p></div></li>
            <li><span>03</span><div><strong>Review the result</strong><p>Your answer is transcribed; the structured scoring report remains the next integration stage.</p></div></li>
          </ol>
          <div className="persona-preview-list">
            <p>Today’s fictional panel</p>
            {simulatorPersonas.map((persona) => <div key={persona.key}><span>{persona.initials}</span><div><strong>{persona.name}</strong><small>{persona.focus}</small></div><Check size={14} /></div>)}
          </div>
          <p className="fixture-disclosure"><AudioLines size={16} /> Personas are fictional. The follow-up question and voice are generated during your session.</p>
        </aside>
      </div>
    </main>
  );
}
