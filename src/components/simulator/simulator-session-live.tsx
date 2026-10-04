"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, AudioLines, CircleAlert, Clock3, Mic2, Pause, Play, RefreshCw, Square, X } from "lucide-react";
import type { PersonaKey } from "@/data/simulator-demo";
import { useAudioCapture } from "@/hooks/use-audio-capture";
import type { SimulatorPersona, SimulatorQuestion } from "@/lib/simulator";
import { SimulatorBoardroom } from "./simulator-boardroom";

type DurableState = "ready" | "pitch_processing" | "question_ready" | "answer_processing" | "ready_for_feedback" | "feedback_generating" | "retryable_error" | "completed";
type SessionPhase = "ready" | "countdown" | "recording-pitch" | "pitch-processing" | "question" | "recording-answer" | "answer-processing" | "feedback-processing" | "feedback-error" | "complete";
type ApiEnvelope<T> = { data: T } | { error: { message: string; retryable?: boolean } };

function clock(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

async function jsonRequest<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = await response.json() as ApiEnvelope<T>;
  if (!response.ok || "error" in payload) throw new Error("error" in payload ? payload.error.message : "The request failed.");
  return payload.data;
}

function initialPhase(state: DurableState, retryStage: string | null): SessionPhase {
  if (state === "completed") return "complete";
  if (state === "question_ready") return "question";
  if (state === "ready_for_feedback" || state === "feedback_generating") return "feedback-processing";
  if (state === "retryable_error") return retryStage === "feedback_generating" ? "feedback-error" : retryStage === "answer_processing" ? "question" : "ready";
  if (state === "pitch_processing") return "pitch-processing";
  if (state === "answer_processing") return "answer-processing";
  return "ready";
}

function questionerName(question: SimulatorQuestion | undefined, personas: SimulatorPersona[]) {
  return personas.find((persona) => persona.persona_key === question?.persona_key)?.name ?? "AI investor";
}

export function SimulatorSessionLive({ answeredQuestionCount: initialAnsweredCount, initialQuestions, initialState, initialStateVersion, personas, retryStage, sessionId }: {
  answeredQuestionCount: number;
  initialQuestions: SimulatorQuestion[];
  initialState: DurableState;
  initialStateVersion: number;
  personas: SimulatorPersona[];
  retryStage: string | null;
  sessionId: string;
}) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const { state: captureState, level, elapsed, message: captureMessage, request, start, stop, release } = useAudioCapture();
  const [consentVerified, setConsentVerified] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<SessionPhase>(() => initialPhase(initialState, retryStage));
  const [stateVersion, setStateVersion] = useState(initialStateVersion);
  const [answeredCount, setAnsweredCount] = useState(initialAnsweredCount);
  const [questions, setQuestions] = useState(initialQuestions);
  const [countdown, setCountdown] = useState(3);
  const [captureKind, setCaptureKind] = useState<"pitch" | "answer">("pitch");
  const [hasCapture, setHasCapture] = useState(initialAnsweredCount > 0 || initialQuestions.length > 0);
  const [questionReady, setQuestionReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [providerError, setProviderError] = useState<string | null>(initialState === "retryable_error" ? "The last provider step did not finish. Your accepted work is still saved." : null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("The panel is ready when you are.");

  const currentQuestion = questions[answeredCount];
  const currentPersona = personas.find((persona) => persona.persona_key === currentQuestion?.persona_key) ?? personas[0];
  const recording = phase === "recording-pitch" || phase === "recording-answer";
  const activeSpeaker: PersonaKey | "founder" | null = recording ? "founder" : playing ? currentQuestion?.persona_key ?? null : null;
  const captureNeedsAttention = captureState === "requesting" || captureState === "denied" || captureState === "unsupported" || captureState === "error";

  const releaseAudio = useCallback(() => {
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
      utteranceRef.current = null;
    }
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    if (audioRef.current) { audioRef.current.onended = null; audioRef.current.onerror = null; }
    audioRef.current?.pause();
    audioRef.current = null;
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    setPlaying(false);
  }, []);

  const speakLocally = (question: string, personaName: string) => {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setQuestionReady(true);
      setProviderError("Voice playback is unavailable on this device. You can continue with the written question.");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(question);
    utterance.lang = "en-GB";
    utterance.rate = 0.94;
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find((voice) => voice.lang === "en-NG") ?? voices.find((voice) => voice.lang === "en-GB") ?? voices.find((voice) => voice.lang.startsWith("en")) ?? null;
    utteranceRef.current = utterance;
    utterance.onstart = () => { setPlaying(true); setQuestionReady(true); setAnnouncement(`${personaName}'s question is playing with your device voice.`); };
    utterance.onend = () => { releaseAudio(); setQuestionReady(true); setAnnouncement("Voice playback finished. You can record your answer."); };
    utterance.onerror = () => { releaseAudio(); setQuestionReady(true); setVoiceNotice(null); setProviderError("Voice playback is unavailable on this device. You can continue with the written question."); };
    setVoiceNotice("Using your device voice for this question because the generated voice could not play.");
    try { window.speechSynthesis.speak(utterance); }
    catch { releaseAudio(); setQuestionReady(true); setVoiceNotice(null); setProviderError("Voice playback is unavailable on this device. You can continue with the written question."); }
  };

  useEffect(() => {
    const grantedAt = Number(window.sessionStorage.getItem("pitch-deck-simulator-consent-at"));
    queueMicrotask(() => setConsentVerified(Number.isFinite(grantedAt) && Date.now() - grantedAt < 30 * 60 * 1000));
  }, []);

  useEffect(() => () => releaseAudio(), [releaseAudio]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (recording) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [recording]);

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown === 0) {
      void start().then((started) => {
        if (!started) { setPhase(captureKind === "pitch" ? "ready" : "question"); return; }
        setPhase(captureKind === "pitch" ? "recording-pitch" : "recording-answer");
        setAnnouncement(captureKind === "pitch" ? "Pitch recording started." : `Answer ${answeredCount + 1} recording started.`);
      });
      return;
    }
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [answeredCount, captureKind, countdown, phase, start]);

  const prepareCapture = async (kind: "pitch" | "answer") => {
    releaseAudio();
    setProviderError(null);
    setVoiceNotice(null);
    if (!await request()) return;
    setCaptureKind(kind);
    setCountdown(3);
    setPhase("countdown");
    setAnnouncement("Recording begins after the three-second countdown.");
  };

  const submitFeedback = useCallback(async (version: number) => {
    setPhase("feedback-processing");
    setProviderError(null);
    setAnnouncement("Both answers are saved. Groq is preparing your evidence-based report.");
    try {
      const result = await jsonRequest<{ stateVersion: number; reportUrl: string }>(`/api/v1/simulations/${sessionId}/feedback`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state_version: version }),
      });
      setStateVersion(result.stateVersion);
      setPhase("complete");
      setAnnouncement("Your private coaching report is ready.");
      router.push(result.reportUrl);
    } catch (error) {
      setProviderError(error instanceof Error ? error.message : "Feedback could not be generated.");
      setStateVersion((value) => value + 2);
      setPhase("feedback-error");
      setAnnouncement("Feedback paused. Your recordings and transcripts are safe.");
    }
  }, [router, sessionId]);

  const endPitch = useCallback(async () => {
    const durationMs = elapsed * 1000;
    const blob = await stop();
    if (!blob) return;
    setHasCapture(true);
    setProviderError(null);
    setPhase("pitch-processing");
    setAnnouncement("Pitch saved locally. Uploading, transcribing, and preparing two questions.");
    const form = new FormData();
    form.append("file", blob, `pitch.${blob.type.includes("mp4") ? "m4a" : "webm"}`);
    form.append("duration_ms", String(durationMs));
    form.append("state_version", String(stateVersion));
    try {
      const result = await jsonRequest<{ stateVersion: number; questions: SimulatorQuestion[] }>(`/api/v1/simulations/${sessionId}/pitch`, { method: "POST", body: form });
      setQuestions(result.questions);
      setStateVersion(result.stateVersion);
      setAnsweredCount(0);
      setQuestionReady(false);
      setPhase("question");
      setAnnouncement(`Two questions are ready. ${questionerName(result.questions[0], personas)} asks first.`);
    } catch (error) {
      setProviderError(error instanceof Error ? error.message : "The pitch could not be processed.");
      setStateVersion((value) => value + 2);
      setPhase("ready");
      setAnnouncement("Pitch processing paused. Record again or reload to recover the saved session.");
    }
  }, [elapsed, personas, sessionId, stateVersion, stop]);

  const endAnswer = useCallback(async () => {
    const durationMs = elapsed * 1000;
    const blob = await stop();
    if (!blob || !currentQuestion) return;
    setHasCapture(true);
    setProviderError(null);
    setPhase("answer-processing");
    setAnnouncement(`Answer ${currentQuestion.question_index} saved locally. Uploading and transcribing.`);
    const form = new FormData();
    form.append("file", blob, `answer-${currentQuestion.question_index}.${blob.type.includes("mp4") ? "m4a" : "webm"}`);
    form.append("duration_ms", String(durationMs));
    form.append("state_version", String(stateVersion));
    form.append("question_index", String(currentQuestion.question_index));
    try {
      const result = await jsonRequest<{ stateVersion: number; answeredQuestionCount: number; state: DurableState }>(`/api/v1/simulations/${sessionId}/answers`, { method: "POST", body: form });
      setStateVersion(result.stateVersion);
      setAnsweredCount(result.answeredQuestionCount);
      releaseAudio();
      if (result.answeredQuestionCount < 2) {
        setQuestionReady(false);
        setPhase("question");
        setAnnouncement(`${questionerName(questions[result.answeredQuestionCount], personas)} asks the second and final question.`);
      } else {
        await submitFeedback(result.stateVersion);
      }
    } catch (error) {
      setProviderError(error instanceof Error ? error.message : "The answer could not be processed.");
      setStateVersion((value) => value + 2);
      setPhase("question");
      setAnnouncement("Answer processing paused. Your session is recoverable.");
    }
  }, [currentQuestion, elapsed, personas, questions, releaseAudio, sessionId, stateVersion, stop, submitFeedback]);

  useEffect(() => {
    if (phase !== "recording-pitch" && phase !== "recording-answer") return;
    const atLimit = (phase === "recording-pitch" && elapsed >= 300) || (phase === "recording-answer" && elapsed >= 90);
    if (!atLimit) return;
    const timer = window.setTimeout(() => { if (phase === "recording-pitch") void endPitch(); else void endAnswer(); }, 0);
    return () => window.clearTimeout(timer);
  }, [elapsed, endAnswer, endPitch, phase]);

  const playQuestion = async () => {
    if (!currentQuestion || !currentPersona) return;
    releaseAudio();
    setProviderError(null);
    setVoiceNotice(null);
    let fallbackStarted = false;
    const fallback = () => {
      if (fallbackStarted) return;
      fallbackStarted = true;
      releaseAudio();
      speakLocally(currentQuestion.question, currentPersona.name);
    };
    try {
      const response = await fetch("/api/v1/simulator/speech", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: currentQuestion.question, voiceStyle: currentPersona.voice_style }),
      });
      if (!response.ok) { const payload = await response.json() as ApiEnvelope<never>; throw new Error("error" in payload ? payload.error.message : "Voice playback failed."); }
      const url = URL.createObjectURL(await response.blob());
      const audio = new Audio(url);
      audioUrlRef.current = url;
      audioRef.current = audio;
      audio.onplay = () => { setPlaying(true); setAnnouncement(`${currentPersona.name} is speaking.`); };
      audio.onended = () => { releaseAudio(); setQuestionReady(true); setAnnouncement("Voice playback finished. You can record your answer."); };
      audio.onerror = fallback;
      await audio.play();
    } catch {
      fallback();
    }
  };

  const cancel = async () => {
    if ((hasCapture || recording) && !window.confirm("Leave this session? Any recording that is still only in this browser will be discarded.")) return;
    setCancelError(null);
    try {
      await jsonRequest(`/api/v1/simulations/${sessionId}/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state_version: stateVersion }) });
      release(); releaseAudio(); router.push("/founder");
    } catch (error) { setCancelError(error instanceof Error ? error.message : "The session could not be cancelled."); }
  };

  if (consentVerified === null) return <main className="simulator-page session-page"><section className="session-guard" role="status"><h1>Preparing the pitch room…</h1><p>Checking your recording consent and saved session.</p></section></main>;
  if (!consentVerified) return <main className="simulator-page session-page"><section className="session-guard"><CircleAlert size={24} /><h1>Complete recording consent first.</h1><p>The pitch room only opens after microphone readiness and explicit recording consent.</p><Link className="button button-dark" href="/simulator/new">Return to session setup</Link></section></main>;

  return (
    <main className="simulator-page session-page">
      <div className="session-header">
        <Link className="back-link" href="/simulator/new"><ArrowLeft size={15} /> Session setup</Link>
        <div className="session-header-status"><span>Private practice</span><strong>{phase.replaceAll("-", " ")}</strong></div>
        <button className="session-cancel" type="button" onClick={() => void cancel()}><X size={16} /> Cancel session</button>
      </div>

      <div className="session-workspace">
        <SimulatorBoardroom activeSpeaker={activeSpeaker} amplitude={recording ? level : 0} playbackActive={playing} busy={recording || playing} personas={personas} showMicrophone={phase === "countdown" || recording} />
        <section className="session-console" aria-labelledby="session-task-title">
          <div className="session-progress" aria-label="Session progress"><i className={phase !== "ready" ? "done" : "active"} /><i className={answeredCount > 0 ? "done" : phase === "question" || phase === "recording-answer" ? "active" : ""} /><i className={answeredCount === 2 ? "done" : answeredCount === 1 ? "active" : ""} /><span>Pitch</span><span>Question 1</span><span>Question 2</span></div>
          {captureNeedsAttention && <Status title={captureState === "requesting" ? "Waiting for microphone permission" : "Microphone needs attention"} message={captureMessage} />}
          {cancelError && <Status title="Session not cancelled" message={`${cancelError} Reload to recover the current state.`} />}
          {providerError && <Status title="Session paused safely" message={providerError} />}
          {voiceNotice && phase === "question" && <p className="voice-notice" role="status">{voiceNotice}</p>}

          {phase === "ready" && <div className="session-task"><h1 id="session-task-title">Make the case in three minutes.</h1><p>Lead with the problem, show why your approach is credible, and finish with the amount and milestone this round unlocks. Two panel members will each ask one follow-up.</p><button className="record-control" type="button" onClick={() => void prepareCapture("pitch")}><Mic2 size={20} /> {providerError ? "Record pitch again" : "Start pitch"}</button><small>Accepted recordings are stored privately. Transcription begins only after capture ends.</small></div>}
          {phase === "countdown" && <div className="countdown-panel" role="status"><strong>{countdown}</strong><h1 id="session-task-title">Settle, breathe, begin.</h1><p>Recording starts automatically.</p></div>}
          {phase === "recording-pitch" && <Recording title="The panel is listening." detail="Keep your own structure. The transcript appears only after capture ends." elapsed={elapsed} level={level} limit={300} minimum={30} label="pitch" onStop={endPitch} />}
          {phase === "pitch-processing" && <Processing title="Preparing two questions" detail="Your pitch is being stored privately, transcribed, and examined by two distinct panel members." />}

          {phase === "question" && currentQuestion && <div className="question-panel">
            <div className="question-sequence"><span>Question {currentQuestion.question_index} of 2</span><span>{currentQuestion.question_index === 1 ? `${questionerName(questions[1], personas)} follows next` : "Final panel question"}</span></div>
            <p className="task-position">{currentPersona.name} · Fictional AI investor · {currentPersona.focus}</p>
            <h1 id="session-task-title">“{currentQuestion.question}”</h1>
            <p className="question-source">Prompted by: “{currentQuestion.source_quote}” · Generated from your pitch transcript</p>
            <div className="session-action-row">
              {playing ? <button className="button button-light" type="button" onClick={() => { releaseAudio(); setQuestionReady(true); }}><Pause size={17} /> Stop voice</button> : <button className="button button-light" type="button" onClick={() => void playQuestion()}><Play size={17} /> {questionReady ? "Replay voice" : "Play voice"}</button>}
              <button className="record-control" type="button" disabled={!questionReady} onClick={() => void prepareCapture("answer")}><Mic2 size={19} /> Record answer {currentQuestion.question_index}</button>
            </div>
            {!questionReady && <button className="text-action" type="button" onClick={() => setQuestionReady(true)}>Continue with the written question</button>}
          </div>}
          {phase === "recording-answer" && <Recording title={`Answer question ${answeredCount + 1} directly.`} detail="Be specific about what you know, what remains an assumption, and what you will test next." elapsed={elapsed} level={level} limit={90} minimum={5} label="answer" onStop={endAnswer} />}
          {phase === "answer-processing" && <Processing title={`Saving answer ${answeredCount + 1}`} detail="The recording is being stored privately and transcribed before the panel continues." />}
          {phase === "feedback-processing" && <Processing title="Building your coaching report" detail="All three personas are assessing the pitch and both answers against the same evidence-backed rubric." />}
          {phase === "feedback-error" && <div className="complete-panel"><span><CircleAlert size={22} /></span><h1 id="session-task-title">Your evidence is safe.</h1><p>The feedback provider did not finish. Your pitch, both questions, and both answer transcripts remain stored; retrying does not consume another session.</p><button className="record-control" type="button" onClick={() => void submitFeedback(stateVersion)}><RefreshCw size={17} /> Retry feedback</button></div>}
          {phase === "complete" && <div className="complete-panel"><span><AudioLines size={22} /></span><h1 id="session-task-title">Your report is ready.</h1><p>Both question rounds are complete and the allowance has been charged exactly once.</p><Link className="button button-dark" href={`/simulator/${sessionId}/report`}>Open coaching report</Link></div>}
          <p className="sr-only" aria-live="polite">{announcement}</p>
        </section>
      </div>
    </main>
  );
}

function Recording({ detail, elapsed, label, level, limit, minimum, onStop, title }: { detail: string; elapsed: number; label: string; level: number; limit: number; minimum: number; onStop: () => Promise<void>; title: string }) {
  return <div className="recording-panel"><div className="recording-meta"><span><i /> Recording {label}</span><strong>{clock(elapsed)} <small>/ {clock(limit)}</small></strong></div><div className="live-level" aria-label={`Microphone level ${Math.round(level * 100)} percent`}><i style={{ transform: `scaleX(${Math.max(0.03, level)})` }} /></div><h1 id="session-task-title">{title}</h1><p>{detail}</p><button className="record-control stop" type="button" onClick={() => void onStop()} disabled={elapsed < minimum}><Square size={18} /> {elapsed < minimum ? `End in ${minimum - elapsed}s` : `End ${label}`}</button></div>;
}

function Processing({ title, detail }: { title: string; detail: string }) {
  return <div className="processing-panel" role="status"><div className="processing-lines" aria-hidden="true"><i /><i /><i /></div><h1 id="session-task-title">{title}</h1><p>{detail}</p><span><Clock3 size={15} /> Usually under a minute</span></div>;
}

function Status({ message, title }: { message: string; title: string }) {
  return <div className="capture-status error" role="alert"><CircleAlert size={17} /><div><strong>{title}</strong><p>{message}</p></div></div>;
}
