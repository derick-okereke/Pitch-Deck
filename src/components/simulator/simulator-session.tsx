"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, AudioLines, CircleAlert, Clock3, Mic2, Pause, Play, RotateCcw, Square, X } from "lucide-react";
import { demoQuestion, simulatorPersonas, type PersonaKey } from "@/data/simulator-demo";
import { useAudioCapture } from "@/hooks/use-audio-capture";
import { SimulatorBoardroom } from "./simulator-boardroom";

type SessionPhase = "ready" | "countdown" | "recording-pitch" | "pitch-processing" | "question" | "recording-answer" | "feedback-processing" | "complete";

function clock(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export function SimulatorSession() {
  const router = useRouter();
  const { state: captureState, level, elapsed, message: captureMessage, request, start, stop, release } = useAudioCapture();
  const [consentVerified, setConsentVerified] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<SessionPhase>("ready");
  const [countdown, setCountdown] = useState(3);
  const [captureKind, setCaptureKind] = useState<"pitch" | "answer">("pitch");
  const [hasCapture, setHasCapture] = useState(false);
  const [questionReady, setQuestionReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ttsFailed, setTtsFailed] = useState(false);
  const [announcement, setAnnouncement] = useState("The panel is ready when you are.");

  const recording = phase === "recording-pitch" || phase === "recording-answer";
  const activeSpeaker: PersonaKey | "founder" | null = recording ? "founder" : playing ? demoQuestion.personaKey : null;
  const captureNeedsAttention = captureState === "requesting" || captureState === "denied" || captureState === "unsupported" || captureState === "error";

  useEffect(() => {
    const grantedAt = Number(window.sessionStorage.getItem("pitch-deck-simulator-consent-at"));
    const valid = Number.isFinite(grantedAt) && Date.now() - grantedAt < 30 * 60 * 1000;
    queueMicrotask(() => setConsentVerified(valid));
  }, []);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (recording || phase === "pitch-processing" || phase === "feedback-processing") event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase, recording]);

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown === 0) {
      void start().then((started) => {
        if (!started) { setPhase(captureKind === "pitch" ? "ready" : "question"); return; }
        setPhase(captureKind === "pitch" ? "recording-pitch" : "recording-answer");
        setAnnouncement(captureKind === "pitch" ? "Pitch recording started." : "Answer recording started.");
      });
      return;
    }
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [captureKind, countdown, phase, start]);

  const prepareCapture = async (kind: "pitch" | "answer") => {
    window.speechSynthesis?.cancel();
    setPlaying(false);
    const ready = await request();
    if (!ready) return;
    setCaptureKind(kind);
    setCountdown(3);
    setPhase("countdown");
    setAnnouncement("Recording begins after the three-second countdown.");
  };

  const endPitch = useCallback(async () => {
    const blob = await stop();
    if (!blob) return;
    setHasCapture(true);
    setPhase("pitch-processing");
    setAnnouncement("Pitch capture complete. Preparing the fixture question.");
    window.setTimeout(() => {
      setPhase("question");
      setAnnouncement("Question ready. Read it before playing the voice preview.");
    }, 900);
  }, [stop]);

  const endAnswer = useCallback(async () => {
    const blob = await stop();
    if (!blob) return;
    setHasCapture(true);
    setPhase("feedback-processing");
    setAnnouncement("Answer captured. Preparing the fixture report.");
    window.setTimeout(() => {
      setPhase("complete");
      setAnnouncement("Fixture report ready.");
    }, 1500);
  }, [stop]);

  useEffect(() => {
    if (phase !== "recording-pitch" && phase !== "recording-answer") return;
    const reachedLimit = (phase === "recording-pitch" && elapsed >= 300) || (phase === "recording-answer" && elapsed >= 90);
    if (!reachedLimit) return;
    const timer = window.setTimeout(() => {
      if (phase === "recording-pitch") void endPitch();
      else void endAnswer();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [elapsed, endAnswer, endPitch, phase]);

  const playQuestion = () => {
    if (!("speechSynthesis" in window)) { setTtsFailed(true); setQuestionReady(true); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(demoQuestion.text);
    utterance.rate = 0.94;
    utterance.onstart = () => { setPlaying(true); setAnnouncement(`${simulatorPersonas[1].name} is speaking.`); };
    utterance.onend = () => { setPlaying(false); setQuestionReady(true); setAnnouncement("Voice preview finished. You can record your answer."); };
    utterance.onerror = () => { setPlaying(false); setTtsFailed(true); setQuestionReady(true); setAnnouncement("Voice preview unavailable. Continue with the written question."); };
    window.speechSynthesis.speak(utterance);
  };

  const stopQuestion = () => {
    window.speechSynthesis?.cancel();
    setPlaying(false);
    setQuestionReady(true);
    setAnnouncement("Voice preview stopped. You can continue with the written question.");
  };

  const cancel = () => {
    if ((hasCapture || recording) && !window.confirm("Leave this fixture session? Any local recording will be discarded.")) return;
    release();
    window.speechSynthesis?.cancel();
    router.push("/founder");
  };

  const usePreparedExample = () => {
    setHasCapture(true);
    setPhase("question");
    setAnnouncement("Prepared fixture selected. Question ready.");
  };

  if (consentVerified === null) {
    return <main className="simulator-page session-page"><section className="session-guard" role="status"><h1>Preparing the pitch room…</h1><p>Checking the recording consent from session setup.</p></section></main>;
  }

  if (!consentVerified) {
    return <main className="simulator-page session-page"><section className="session-guard"><CircleAlert size={24} /><h1>Complete recording consent first.</h1><p>The pitch room only opens after microphone readiness and explicit recording consent. Direct links cannot skip that step.</p><Link className="button button-dark" href="/simulator/new">Return to session setup <ArrowRight size={16} /></Link></section></main>;
  }

  return (
    <main className="simulator-page session-page">
      <div className="session-header">
        <Link className="back-link" href="/simulator/new"><ArrowLeft size={15} /> Session setup</Link>
        <div className="session-header-status"><span>Illustrative fixture</span><strong>{phase === "recording-pitch" ? "Pitch recording" : phase === "recording-answer" ? "Answer recording" : phase.replaceAll("-", " ")}</strong></div>
        <button className="session-cancel" type="button" onClick={cancel}><X size={16} /> Cancel session</button>
      </div>

      <div className="session-workspace">
        <SimulatorBoardroom activeSpeaker={activeSpeaker} amplitude={recording ? level : 0} playbackActive={playing} busy={recording || playing} showMicrophone={phase === "countdown" || recording} />

        <section className="session-console" aria-labelledby="session-task-title">
          <div className="session-progress" aria-label="Session progress"><i className={phase !== "ready" ? "done" : "active"} /><i className={phase === "question" || phase === "recording-answer" || phase === "feedback-processing" || phase === "complete" ? "done" : ""} /><i className={phase === "feedback-processing" ? "active" : phase === "complete" ? "done" : ""} /><span>Pitch</span><span>Question</span><span>Feedback</span></div>
          {captureNeedsAttention && <div className={"capture-status " + captureState} role={captureState === "requesting" ? "status" : "alert"}><CircleAlert size={17} /><div><strong>{captureState === "requesting" ? "Waiting for microphone permission" : "Microphone needs attention"}</strong><p>{captureMessage}</p></div></div>}

          {phase === "ready" && <div className="session-task"><p className="task-position">Your turn · Pitch</p><h1 id="session-task-title">Make the case in three minutes.</h1><p>Lead with the problem, show why your approach is credible, and finish with the amount and milestone this round unlocks. The hard stop is five minutes.</p><div className="session-action-row"><button className="record-control" type="button" onClick={() => void prepareCapture("pitch")}><Mic2 size={20} /> Start pitch</button><button className="text-action" type="button" onClick={usePreparedExample}>Use prepared fixture</button></div><small>During capture you will see only the timer and microphone level—no live transcript or performance diagnosis.</small></div>}

          {phase === "countdown" && <div className="countdown-panel" role="status"><strong>{countdown}</strong><h1 id="session-task-title">Settle, breathe, begin.</h1><p>Recording starts automatically.</p></div>}

          {phase === "recording-pitch" && <div className="recording-panel"><div className="recording-meta"><span><i /> Recording pitch</span><strong>{clock(elapsed)} <small>/ 05:00</small></strong></div><div className="live-level" aria-label={`Microphone level ${Math.round(level * 100)} percent`}><i style={{ transform: `scaleX(${Math.max(0.03, level)})` }} /></div><h1 id="session-task-title">The panel is listening.</h1><p>Keep your own structure. Metrics and transcript arrive only after the recording is processed.</p><button className="record-control stop" type="button" onClick={() => void endPitch()} disabled={elapsed < 30}><Square size={18} /> {elapsed < 30 ? `End pitch in ${30 - elapsed}s` : "End pitch"}</button></div>}

          {phase === "pitch-processing" && <Processing title="Preparing the question" detail="Your recording remains local in this prototype. The question that follows is a labelled fixture, not a result generated from this capture." />}

          {phase === "question" && <div className="question-panel"><p className="task-position">{simulatorPersonas[1].name} · {simulatorPersonas[1].focus}</p><h1 id="session-task-title">“{demoQuestion.text}”</h1><p className="question-source">Prompted by the fixture phrase: “{demoQuestion.source}”</p><div className="session-action-row">{playing ? <button className="button button-light" type="button" onClick={stopQuestion}><Pause size={17} /> Stop voice</button> : <button className="button button-light" type="button" onClick={playQuestion}><Play size={17} /> {questionReady ? "Replay voice" : "Play voice preview"}</button>}<button className="record-control" type="button" disabled={!questionReady && !ttsFailed} onClick={() => void prepareCapture("answer")}><Mic2 size={19} /> Record answer</button></div><button className="text-action" type="button" onClick={() => { setQuestionReady(true); stopQuestion(); }}>Continue with written question</button>{ttsFailed && <div className="persistent-error compact" role="status"><CircleAlert size={17} /><div><strong>Voice preview unavailable</strong><p>The written question remains fully usable.</p></div></div>}<small>Voice playback uses the browser’s local speech preview in this build; it is not an ElevenLabs result.</small></div>}

          {phase === "recording-answer" && <div className="recording-panel"><div className="recording-meta"><span><i /> Recording answer</span><strong>{clock(elapsed)} <small>/ 01:30</small></strong></div><div className="live-level" aria-label={`Microphone level ${Math.round(level * 100)} percent`}><i style={{ transform: `scaleX(${Math.max(0.03, level)})` }} /></div><h1 id="session-task-title">Answer the assumption behind the number.</h1><p>Be specific about the inputs you know and the ones the pilot still needs to test.</p><button className="record-control stop" type="button" onClick={() => void endAnswer()} disabled={elapsed < 5}><Square size={18} /> {elapsed < 5 ? `End answer in ${5 - elapsed}s` : "End answer"}</button></div>}

          {phase === "feedback-processing" && <Processing title="Building the fixture report" detail="The final provider flow will validate transcripts, evidence quotes, and the fixed scoring schema before saving a report." />}

          {phase === "complete" && <div className="complete-panel"><span><AudioLines size={22} /></span><h1 id="session-task-title">Your fixture report is ready.</h1><p>Review the scoring explanation, transcript-derived metrics, three persona perspectives, and the exact distinction between this practice score and your public profile.</p><Link className="button button-dark" href="/simulator/demo-session/report">Open report <ArrowRight size={17} /></Link><button className="text-action" type="button" onClick={() => { release(); setPhase("ready"); setHasCapture(false); }}>Start over <RotateCcw size={14} /></button></div>}

          <p className="sr-only" aria-live="polite">{announcement}</p>
        </section>
      </div>
    </main>
  );
}

function Processing({ title, detail }: { title: string; detail: string }) {
  return <div className="processing-panel" role="status"><div className="processing-lines" aria-hidden="true"><i /><i /><i /></div><h1 id="session-task-title">{title}</h1><p>{detail}</p><span><Clock3 size={15} /> Usually under a minute with providers connected</span></div>;
}
