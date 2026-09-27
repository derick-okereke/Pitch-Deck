"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, AudioLines, Check, CircleAlert, Headphones, Mic2, ShieldCheck } from "lucide-react";
import { simulatorPersonas } from "@/data/simulator-demo";
import { useAudioCapture } from "@/hooks/use-audio-capture";

export function SimulatorSetup() {
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
          <div><h1>Prepare the room before you pitch.</h1><p>A focused three-minute practice with two follow-up questions from two different panel members. Check your microphone, understand what is recorded, then begin when you are ready.</p></div>
          <div className="session-allowance"><strong>2</strong><span>of 3 free sessions remain</span><small>Learning-only · public score unchanged</small></div>
        </div>
      </div>

      <section className="setup-impact" aria-label="Practice session impact">
        <ShieldCheck size={20} />
        <div><strong>Free practice session</strong><p>You will receive fixture feedback in this build. It will not change your public score or earn a badge.</p></div>
        <span>Illustrative demo</span>
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
            <span><strong>I understand this practice records audio.</strong><small>The fixture build keeps new capture in this browser and does not upload or score it. Q&amp;A and coaching remain private in the product contract.</small></span>
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
            <li><span>02</span><div><strong>Answer two questions</strong><p>Two different personas each probe something you said or left unclear.</p></div></li>
            <li><span>03</span><div><strong>Study the evidence</strong><p>Review your transcript, pace, detected fillers, and three perspectives.</p></div></li>
          </ol>
          <div className="persona-preview-list">
            <p>Today’s fictional panel</p>
            {simulatorPersonas.map((persona) => <div key={persona.key}><span>{persona.initials}</span><div><strong>{persona.name}</strong><small>{persona.focus}</small></div><Check size={14} /></div>)}
          </div>
          <p className="fixture-disclosure"><AudioLines size={16} /> Personas, question, and report content are labelled fixtures until provider adapters are connected.</p>
        </aside>
      </div>
    </main>
  );
}
