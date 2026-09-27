"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, AudioLines, CircleAlert, Clock3, Mic2, Pause, Play, RotateCcw, Square, X } from "lucide-react";
import { demoQuestion, simulatorPersonas, type PersonaKey } from "@/data/simulator-demo";
import { useAudioCapture } from "@/hooks/use-audio-capture";
import { SimulatorBoardroom } from "./simulator-boardroom";

type SessionPhase = "ready" | "countdown" | "recording-pitch" | "pitch-processing" | "question" | "recording-answer" | "feedback-processing" | "complete";
type LiveQuestion = { personaKey: PersonaKey; text: string; source: string; generated: boolean };
type ApiEnvelope<T> = { data: T } | { error: { message: string } };

function clock(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

async function jsonRequest<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = await response.json() as ApiEnvelope<T>;
  if (!response.ok || "error" in payload) throw new Error("error" in payload ? payload.error.message : "The request failed.");
  return payload.data;
}

async function transcribeRecording(blob: Blob, kind: "pitch" | "answer") {
  const form = new FormData();
  form.append("kind", kind);
  form.append("file", blob, `${kind}.${blob.type.includes("mp4") ? "mp4" : "webm"}`);
  return jsonRequest<{ text: string; durationSeconds: number | null; wordCount: number }>("/api/v1/simulator/transcribe", { method: "POST", body: form });
}

function voiceStyle(personaKey: PersonaKey) {
  if (personaKey === "p1") return "warm-rigorous";
  if (personaKey === "p3") return "calm-strategic";
  return "direct-analytical";
}

export function SimulatorSessionLive() {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const { state: captureState, level, elapsed, message: captureMessage, request, start, stop, release } = useAudioCapture();
  const [consentVerified, setConsentVerified] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<SessionPhase>("ready");
  const [countdown, setCountdown] = useState(3);
  const [captureKind, setCaptureKind] = useState<"pitch" | "answer">("pitch");
  const [hasCapture, setHasCapture] = useState(false);
  const [question, setQuestion] = useState<LiveQuestion>({ personaKey: demoQuestion.personaKey, text: demoQuestion.text, source: demoQuestion.source, generated: false });
  const [questionReady, setQuestionReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ttsFailed, setTtsFailed] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("The panel is ready when you are.");

  const recording = phase === "recording-pitch" || phase === "recording-answer";
  const activeSpeaker: PersonaKey | "founder" | null = recording ? "founder" : playing ? question.personaKey : null;
  const captureNeedsAttention = captureState === "requesting" || captureState === "denied" || captureState === "unsupported" || captureState === "error";
  const persona = simulatorPersonas.find((item) => item.key === question.personaKey) ?? simulatorPersonas[1];

  const releaseAudio = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    setPlaying(false);
  }, []);

  useEffect(() => {
    const grantedAt = Number(window.sessionStorage.getItem("pitch-deck-simulator-consent-at"));
    const valid = Number.isFinite(grantedAt) && Date.now() - grantedAt < 30 * 60 * 1000;
    queueMicrotask(() => setConsentVerified(valid));
  }, []);

  useEffect(() => () => releaseAudio(), [releaseAudio]);

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
    releaseAudio();
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
    setProviderError(null);
    setQuestionReady(false);
    setPhase("pitch-processing");
    setAnnouncement("Pitch captured. Groq is preparing the transcript and follow-up question.");
    try {
      const transcript = await transcribeRecording(blob, "pitch");
      const result = await jsonRequest<{ persona_key: PersonaKey; question: string; source_quote: string }>("/api/v1/simulator/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcript.text, stage: "Not specified" }),
      });
      setQuestion({ personaKey: result.persona_key, text: result.question, source: result.source_quote, generated: true });
      setAnnouncement("Generated investor question ready.");
    } catch (error) {
      setQuestion({ personaKey: demoQuestion.personaKey, text: demoQuestion.text, source: demoQuestion.source, generated: false });
      setProviderError(error instanceof Error ? error.message : "The live question could not be generated.");
      setAnnouncement("Live generation was unavailable. A labelled fallback question is ready.");
    }
    setPhase("question");
  }, [stop]);

  const endAnswer = useCallback(async () => {
    const blob = await stop();
    if (!blob) return;
    setHasCapture(true);
    setProviderError(null);
    setPhase("feedback-processing");
    setAnnouncement("Answer captured. Groq is preparing the transcript.");
    try {
      await transcribeRecording(blob, "answer");
      setAnnouncement("Live transcription complete.");
    } catch (error) {
      setProviderError(error instanceof Error ? error.message : "The answer could not be transcribed.");
      setAnnouncement("Answer transcription was unavailable.");
    }
    setPhase("complete");
  }, [stop]);

  useEffect(() => {
    if (phase !== "recording-pitch" && phase !== "recording-answer") return;
    const reachedLimit = (phase === "recording-pitch" && elapsed >= 300) || (phase === "recording-answer" && elapsed >= 90);
    if (!reachedLimit) return;
    const timer = window.setTimeout(() => { if (phase === "recording-pitch") void endPitch(); else void endAnswer(); }, 0);
    return () => window.clearTimeout(timer);
  }, [elapsed, endAnswer, endPitch, phase]);

  const playQuestion = async () => {
    releaseAudio();
    setTtsFailed(false);
    setProviderError(null);
    try {
      const response = await fetch("/api/v1/simulator/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: question.text, voiceStyle: voiceStyle(question.personaKey) }),
      });
      if (!response.ok) {
        const payload = await response.json() as ApiEnvelope<never>;
        throw new Error("error" in payload ? payload.error.message : "Voice playback failed.");
      }
      const url = URL.createObjectURL(await response.blob());
      const audio = new Audio(url);
      audioUrlRef.current = url;
      audioRef.current = audio;
      audio.onplay = () => { setPlaying(true); setAnnouncement(`${persona.name} is speaking.`); };
      audio.onended = () => { releaseAudio(); setQuestionReady(true); setAnnouncement("Voice playback finished. You can record your answer."); };
      audio.onerror = () => { releaseAudio(); setTtsFailed(true); setQuestionReady(true); setAnnouncement("Voice playback unavailable. Continue with the written question."); };
      await audio.play();
    } catch (error) {
      releaseAudio();
      setTtsFailed(true);
      setQuestionReady(true);
      setProviderError(error instanceof Error ? error.message : "Voice playback is unavailable.");
    }
  };

  const stopQuestion = () => {
    releaseAudio();
    setQuestionReady(true);
    setAnnouncement("Voice playback stopped. You can continue with the written question.");
  };

  const cancel = () => {
    if ((hasCapture || recording) && !window.confirm("Leave this session? Any unsaved recording will be discarded.")) return;
    release();
    releaseAudio();
    router.push("/founder");
  };

  const usePreparedExample = () => {
    setHasCapture(true);
    setQuestion({ personaKey: demoQuestion.personaKey, text: demoQuestion.text, source: demoQuestion.source, generated: false });
    setProviderError(null);
    setPhase("question");
    setAnnouncement("Prepared fallback selected. Question ready.");
  };

  if (consentVerified === null) return <main className="simulator-page session-page"><section className="session-guard" role="status"><h1>Preparing the pitch room…</h1><p>Checking the recording consent from session setup.</p></section></main>;
  if (!consentVerified) return <main className="simulator-page session-page"><section className="session-guard"><CircleAlert size={24} /><h1>Complete recording consent first.</h1><p>The pitch room only opens after microphone readiness and explicit recording consent.</p><Link className="button button-dark" href="/simulator/new">Return to session setup <ArrowRight size={16} /></Link></section></main>;

  return (
    <main className="simulator-page session-page">
      <div className="session-header">
        <Link className="back-link" href="/simulator/new"><ArrowLeft size={15} /> Session setup</Link>
        <div className="session-header-status"><span>Private practice</span><strong>{phase === "recording-pitch" ? "Pitch recording" : phase === "recording-answer" ? "Answer recording" : phase.replaceAll("-", " ")}</strong></div>
        <button className="session-cancel" type="button" onClick={cancel}><X size={16} /> Cancel session</button>
      </div>

      <div className="session-workspace">
        <SimulatorBoardroom activeSpeaker={activeSpeaker} amplitude={recording ? level : 0} playbackActive={playing} busy={recording || playing} showMicrophone={phase === "countdown" || recording} />
        <section className="session-console" aria-labelledby="session-task-title">
          <div className="session-progress" aria-label="Session progress"><i className={phase !== "ready" ? "done" : "active"} /><i className={phase === "question" || phase === "recording-answer" || phase === "feedback-processing" || phase === "complete" ? "done" : ""} /><i className={phase === "feedback-processing" ? "active" : phase === "complete" ? "done" : ""} /><span>Pitch</span><span>Question</span><span>Transcript</span></div>
          {captureNeedsAttention && <div className={`capture-status ${captureState}`} role={captureState === "requesting" ? "status" : "alert"}><CircleAlert size={17} /><div><strong>{captureState === "requesting" ? "Waiting for microphone permission" : "Microphone needs attention"}</strong><p>{captureMessage}</p></div></div>}

          {phase === "ready" && <div className="session-task"><p className="task-position">Your turn · Pitch</p><h1 id="session-task-title">Make the case in three minutes.</h1><p>Lead with the problem, show why your approach is credible, and finish with the amount and milestone this round unlocks.</p><div className="session-action-row"><button className="record-control" type="button" onClick={() => void prepareCapture("pitch")}><Mic2 size={20} /> Start pitch</button><button className="text-action" type="button" onClick={usePreparedExample}>Preview with prepared example</button></div><small>Transcription begins only after you finish the recording.</small></div>}
          {phase === "countdown" && <div className="countdown-panel" role="status"><strong>{countdown}</strong><h1 id="session-task-title">Settle, breathe, begin.</h1><p>Recording starts automatically.</p></div>}
          {phase === "recording-pitch" && <div className="recording-panel"><div className="recording-meta"><span><i /> Recording pitch</span><strong>{clock(elapsed)} <small>/ 05:00</small></strong></div><div className="live-level" aria-label={`Microphone level ${Math.round(level * 100)} percent`}><i style={{ transform: `scaleX(${Math.max(0.03, level)})` }} /></div><h1 id="session-task-title">The panel is listening.</h1><p>Keep your own structure. The transcript appears only after capture ends.</p><button className="record-control stop" type="button" onClick={() => void endPitch()} disabled={elapsed < 30}><Square size={18} /> {elapsed < 30 ? `End pitch in ${30 - elapsed}s` : "End pitch"}</button></div>}
          {phase === "pitch-processing" && <Processing title="Preparing the question" detail="Groq is transcribing your pitch and selecting one transcript-grounded follow-up question." />}
          {phase === "question" && <div className="question-panel"><p className="task-position">{persona.name} · {persona.focus}</p><h1 id="session-task-title">“{question.text}”</h1><p className="question-source">Prompted by: “{question.source}” · {question.generated ? "Generated from your transcript" : "Prepared fallback"}</p>{providerError ? <div className="persistent-error compact" role="status"><CircleAlert size={17} /><div><strong>Live provider fallback</strong><p>{providerError}</p></div></div> : null}<div className="session-action-row">{playing ? <button className="button button-light" type="button" onClick={stopQuestion}><Pause size={17} /> Stop voice</button> : <button className="button button-light" type="button" onClick={() => void playQuestion()}><Play size={17} /> {questionReady ? "Replay ElevenLabs voice" : "Play ElevenLabs voice"}</button>}<button className="record-control" type="button" disabled={!questionReady && !ttsFailed} onClick={() => void prepareCapture("answer")}><Mic2 size={19} /> Record answer</button></div><button className="text-action" type="button" onClick={() => setQuestionReady(true)}>Continue with written question</button></div>}
          {phase === "recording-answer" && <div className="recording-panel"><div className="recording-meta"><span><i /> Recording answer</span><strong>{clock(elapsed)} <small>/ 01:30</small></strong></div><div className="live-level" aria-label={`Microphone level ${Math.round(level * 100)} percent`}><i style={{ transform: `scaleX(${Math.max(0.03, level)})` }} /></div><h1 id="session-task-title">Answer the assumption behind the question.</h1><p>Be specific about what you know and what the next milestone still needs to test.</p><button className="record-control stop" type="button" onClick={() => void endAnswer()} disabled={elapsed < 5}><Square size={18} /> {elapsed < 5 ? `End answer in ${5 - elapsed}s` : "End answer"}</button></div>}
          {phase === "feedback-processing" && <Processing title="Transcribing your answer" detail="Groq is producing the private answer transcript. Structured scoring is the next integration stage." />}
          {phase === "complete" && <div className="complete-panel"><span><AudioLines size={22} /></span><h1 id="session-task-title">The provider round is complete.</h1><p>{providerError ? providerError : "Your pitch generated a transcript-grounded question, ElevenLabs voice playback, and an answer transcript."} The detailed scoring report remains illustrative until the scoring endpoint is connected.</p><Link className="button button-dark" href="/simulator/demo-session/report">Open current report preview <ArrowRight size={17} /></Link><button className="text-action" type="button" onClick={() => { release(); releaseAudio(); setPhase("ready"); setHasCapture(false); setProviderError(null); }}>Start over <RotateCcw size={14} /></button></div>}
          <p className="sr-only" aria-live="polite">{announcement}</p>
        </section>
      </div>
    </main>
  );
}

function Processing({ title, detail }: { title: string; detail: string }) {
  return <div className="processing-panel" role="status"><div className="processing-lines" aria-hidden="true"><i /><i /><i /></div><h1 id="session-task-title">{title}</h1><p>{detail}</p><span><Clock3 size={15} /> Usually under a minute</span></div>;
}
