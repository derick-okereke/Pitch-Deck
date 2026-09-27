import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CircleAlert, FileText, Gauge, LockKeyhole, MessageSquareText, RotateCcw, ShieldCheck } from "lucide-react";
import { coachingResources } from "@/data/simulator-demo";
import type { SimulatorFeedback, SimulatorPersona, SimulatorQuestion } from "@/lib/simulator";
import { personaInitials } from "@/lib/simulator";

type Recording = {
  segment_kind: "pitch" | "answer";
  question_index: number | null;
  transcript: string | null;
  duration_ms: number;
  words_per_minute: number | null;
  filler_matches: number | null;
  filler_token_count: number | null;
  filler_percent: number | null;
};

const categoryLabels: Record<SimulatorFeedback["categories"][number]["key"], string> = {
  clarity: "Clarity", market: "Market", traction: "Traction", team: "Team", business_model: "Business model", competition: "Competition", delivery: "Delivery",
};

function duration(milliseconds: number) {
  const seconds = Math.round(milliseconds / 1000);
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function LiveSimulatorReport({ createdAt, deliveryPoints, feedback, personas, questions, recordings, sessionPoints }: {
  createdAt: string;
  deliveryPoints: number;
  feedback: SimulatorFeedback;
  personas: SimulatorPersona[];
  questions: SimulatorQuestion[];
  recordings: Recording[];
  sessionPoints: number;
}) {
  const pitch = recordings.find((recording) => recording.segment_kind === "pitch")!;
  const answers = recordings.filter((recording) => recording.segment_kind === "answer").sort((a, b) => (a.question_index ?? 0) - (b.question_index ?? 0));
  const allFillerMatches = recordings.reduce((total, recording) => total + (recording.filler_matches ?? 0), 0);
  const allFillerTokens = recordings.reduce((total, recording) => total + (recording.filler_token_count ?? 0), 0);

  return (
    <main className="simulator-page report-page">
      <section className="report-summary">
        <Link className="back-link" href="/founder"><ArrowLeft size={15} /> Founder overview</Link>
        <div className="report-summary-grid">
          <div><span className="fixture-tag">Private AI coaching report</span><h1>Your pitch has been assessed across the full panel.</h1><p>Two investors questioned your case. All three reviewed the pitch and both answers against exact transcript evidence.</p></div>
          <div className="session-score"><strong>{Math.round(sessionPoints)}</strong><span>/ 100 session score</span><small>Learning-only free session</small></div>
        </div>
      </section>

      <section className="score-boundary" aria-label="Score contribution explanation">
        <ShieldCheck size={19} /><div><strong>This report teaches; it does not alter your public score.</strong><p>Your delivery earned {deliveryPoints}/10 inside this session. Free-started sessions remain private and learning-only, even after a later upgrade.</p></div><span>Public score unchanged</span>
      </section>

      <div className="report-layout">
        <div className="report-main">
          <section className="report-section">
            <div className="report-section-heading"><div><h2>How the pitch was assessed</h2><p>Seven spoken categories, scored from the words in this session.</p></div><span>readiness-v1 · feedback-v1-two-question</span></div>
            <div className="spoken-score-list">
              {feedback.categories.map((category) => <article key={category.key}><div><strong>{categoryLabels[category.key]}</strong><p>{category.rationale}</p>{category.evidence[0] ? <blockquote>“{category.evidence[0].quote}”</blockquote> : null}<small>Next: {category.next_step}</small></div><div className="spoken-score-track"><i style={{ width: `${category.rating * 25}%` }} /></div><span>{category.rating}<small>/4</small></span></article>)}
            </div>
          </section>

          <section className="report-section">
            <div className="report-section-heading"><div><h2>Three perspectives on the same evidence</h2><p>The third panel member still coaches the pitch, even though only two personas asked questions.</p></div></div>
            <div className="persona-feedback-list">
              {feedback.persona_feedback.map((item) => {
                const persona = personas.find((candidate) => candidate.persona_key === item.persona_key)!;
                return <article key={item.persona_key}><header><span>{personaInitials(persona.name)}</span><div><strong>{persona.name}</strong><small>Fictional AI investor · {persona.focus}</small></div></header><dl><div><dt><Check size={15} /> What worked</dt><dd>{item.what_worked.map((entry) => <p key={entry.observation}>{entry.observation}{entry.evidence ? <q>{entry.evidence.quote}</q> : null}</p>)}</dd></div><div><dt><CircleAlert size={15} /> What needs work</dt><dd>{item.what_didnt.map((entry) => <p key={entry.observation}>{entry.observation}{entry.evidence ? <q>{entry.evidence.quote}</q> : null}</p>)}</dd></div><div><dt><ArrowRight size={15} /> How to improve</dt><dd>{item.how_to_improve.map((entry) => <p key={entry.action}><strong>{entry.action}</strong> {entry.why}</p>)}</dd></div></dl><div className="coaching-resource-row" aria-label="Concepts to research">{item.resources.map((resource) => <span key={resource.resource_id}>{coachingResources[resource.resource_id]}</span>)}</div></article>;
              })}
            </div>
          </section>

          <section className="report-section transcript-section">
            <div className="report-section-heading"><div><h2>Transcript and panel questions</h2><p>Your accepted recordings are immutable. Transcription may contain errors.</p></div><span>Two-question round</span></div>
            <details open><summary><span><FileText size={16} /> Pitch transcript</span><small>{duration(pitch.duration_ms)}</small></summary><p>{pitch.transcript}</p></details>
            {questions.map((question, index) => {
              const persona = personas.find((candidate) => candidate.persona_key === question.persona_key)!;
              const answer = answers[index];
              return <details key={question.question_index}><summary><span><MessageSquareText size={16} /> {persona.name} · Question {question.question_index}</span><small>{answer ? duration(answer.duration_ms) : "—"}</small></summary><p><strong>Question:</strong> {question.question}</p><p><strong>Answer:</strong> {answer?.transcript}</p></details>;
            })}
          </section>
        </div>

        <aside className="report-sidebar">
          <section className="readiness-impact"><div className="readiness-impact-heading"><ShieldCheck size={19} /><div><h2>Session result</h2><p>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(createdAt))}</p></div></div><strong className="readiness-impact-value">{deliveryPoints}<span>/10 delivery</span></strong><dl><div><dt>Session score</dt><dd>{sessionPoints}/100</dd></div><div><dt>Public contribution</dt><dd>0/10</dd></div></dl></section>
          <section><h2>Delivery signals</h2><dl className="delivery-metrics"><div><dt><Gauge size={15} /> Pitch pace</dt><dd>{pitch.words_per_minute ?? "—"} <small>WPM</small></dd><span>Average including pauses</span></div>{answers.map((answer) => <div key={answer.question_index}><dt><Gauge size={15} /> Answer {answer.question_index} pace</dt><dd>{answer.words_per_minute ?? "—"} <small>WPM</small></dd><span>Average including pauses</span></div>)}<div><dt><MessageSquareText size={15} /> Detected fillers</dt><dd>{allFillerMatches}</dd><span>{allFillerTokens} matched transcript words</span></div></dl><p className="metric-caveat">Speech-to-text may remove hesitations. A low count is not proof that none were audible.</p></section>
          <section className="report-next-step"><h2>Practise the strongest next action</h2><p>{feedback.categories.slice().sort((a, b) => a.rating - b.rating)[0]?.next_step}</p><Link className="button button-dark" href="/simulator/new"><RotateCcw size={16} /> Start another practice</Link></section>
          <section className="private-report-note"><LockKeyhole size={18} /><h2>This report stays private</h2><p>Investors cannot see the Q&amp;A, transcripts, coaching notes, or stored audio. Publication is always a separate explicit choice.</p></section>
        </aside>
      </div>
    </main>
  );
}
