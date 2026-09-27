import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, AudioLines, Check, CircleAlert, Clock3, FileText, Gauge, Info, LockKeyhole, MessageSquareText, RotateCcw, ShieldCheck } from "lucide-react";
import { ReportAudioControl } from "@/components/simulator/report-audio-control";
import { contentScore } from "@/data/founder-demo";
import { coachingResources, simulatorPersonas, simulatorReport, spokenCategories } from "@/data/simulator-demo";
import { calculateReadiness } from "@/lib/readiness";

export function generateStaticParams() { return [{ id: "demo-session" }]; }

export default async function SimulatorReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id !== "demo-session") notFound();

  const readiness = calculateReadiness({
    contentPoints: contentScore,
    sessionPoints: simulatorReport.sessionScore,
    deliveryPoints: simulatorReport.deliveryContribution,
    published: true,
    activePro: false,
    startedPro: simulatorReport.startedPro,
    matchingPublishedRevision: true,
    completed: true,
    fixture: simulatorReport.isFixture,
    voiceSession: true,
    pitchSeconds: 102,
    answerSeconds: 24,
    transcriptsValid: true,
    feedbackValid: true,
  });

  return (
    <main className="simulator-page report-page">
      <section className="report-summary">
        <Link className="back-link" href="/founder"><ArrowLeft size={15} /> Founder overview</Link>
        <div className="report-summary-grid">
          <div><span className="fixture-tag">Illustrative fixture report</span><h1>Your case is composed. The market logic needs another pass.</h1><p>This report demonstrates the complete evidence and coaching structure. It was not generated from the latest microphone capture and does not change the published profile.</p></div>
          <div className="session-score"><strong>{simulatorReport.sessionScore}</strong><span>/ 100 session score</span><small>Learning-only fixture</small></div>
        </div>
      </section>

      <section className="score-boundary" aria-label="Score contribution explanation">
        <Info size={19} />
        <div><strong>Session score and public readiness are separate.</strong><p>The session earned {simulatorReport.deliveryContribution}/10 for delivery, but {readiness.deliveryContribution}/10 is applied publicly because fixtures and free-started sessions remain learning-only.</p></div>
        <span>Public score unchanged</span>
      </section>

      <div className="report-layout">
        <div className="report-main">
          <section className="report-section">
            <div className="report-section-heading"><div><h2>How the pitch was assessed</h2><p>Seven spoken categories, each supported by exact session evidence.</p></div><span>{simulatorReport.rubricVersion} · {simulatorReport.promptVersion}</span></div>
            <div className="spoken-score-list">
              {spokenCategories.map((category) => <article key={category.label}><div><strong>{category.label}</strong><p>{category.note}</p><blockquote>“{category.evidence}”</blockquote></div><div className="spoken-score-track"><i style={{ width: String((category.score / category.max) * 100) + "%" }} /></div><span>{category.score}<small>/{category.max}</small></span></article>)}
            </div>
          </section>

          <section className="report-section">
            <div className="report-section-heading"><div><h2>Three perspectives on the same evidence</h2><p>Each fictional persona connects an observation to the words that support it.</p></div></div>
            <div className="persona-feedback-list">
              {simulatorReport.feedback.map((feedback) => {
                const persona = simulatorPersonas.find((item) => item.key === feedback.personaKey)!;
                return (
                  <article key={feedback.personaKey}>
                    <header><span>{persona.initials}</span><div><strong>{persona.name}</strong><small>Fictional AI investor · {persona.focus}</small></div></header>
                    <blockquote className="persona-evidence">“{feedback.evidence}”</blockquote>
                    <dl><div><dt><Check size={15} /> What worked</dt><dd>{feedback.worked}</dd></div><div><dt><CircleAlert size={15} /> What needs work</dt><dd>{feedback.improve}</dd></div><div><dt><ArrowRight size={15} /> Next action</dt><dd>{feedback.action}</dd></div></dl>
                    <div className="coaching-resource-row" aria-label="Concepts to research">{feedback.resources.map((resourceId) => <span key={resourceId}>{coachingResources[resourceId]}</span>)}</div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="report-section priority-plan">
            <div className="report-section-heading"><div><h2>Your next practice plan</h2><p>Three changes, ordered by the evidence gap they resolve.</p></div></div>
            <ol>
              {simulatorReport.priorities.map((priority, index) => (
                <li key={priority.title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div><h3>{priority.title}</h3><p>{priority.action}</p>{priority.evidence ? <blockquote>“{priority.evidence}”</blockquote> : <small>No competitive alternative was stated in the pitch.</small>}</div>
                </li>
              ))}
            </ol>
          </section>

          <section className="report-section transcript-section">
            <div className="report-section-heading"><div><h2>Transcript and question</h2><p>Fixture text remains available independently of audio.</p></div><span>Transcription may contain errors</span></div>
            <details open><summary><span><FileText size={16} /> Pitch transcript</span><small>{simulatorReport.pitchDuration}</small></summary><p>{simulatorReport.pitchTranscript}</p></details>
            <details><summary><span><MessageSquareText size={16} /> Follow-up and answer</span><small>{simulatorReport.answerDuration}</small></summary><p><strong>Question:</strong> You described 180,000 reachable households. Which employer groups make up that estimate, and what adoption rate are you assuming in the first eighteen months?</p><p><strong>Answer:</strong> {simulatorReport.answerTranscript}</p></details>
          </section>
        </div>

        <aside className="report-sidebar">
          <section className="readiness-impact">
            <div className="readiness-impact-heading"><ShieldCheck size={19} /><div><h2>Profile impact</h2><p>Published revision {simulatorReport.profileRevision}</p></div></div>
            <strong className="readiness-impact-value">+{readiness.deliveryContribution}<span>/10 applied</span></strong>
            <dl><div><dt>Current content</dt><dd>{contentScore}/90</dd></div><div><dt>Session delivery</dt><dd>{simulatorReport.deliveryContribution}/10</dd></div><div><dt>Public readiness</dt><dd>{readiness.displayReadiness}/100</dd></div></dl>
            <ul>{readiness.reasonMessages.map((message) => <li key={message}>{message}</li>)}</ul>
          </section>

          <ReportAudioControl canSelect={readiness.canSelectPublicAudio} recordedAt={simulatorReport.recordedAt} duration={simulatorReport.pitchDuration} reason="Demo fixtures and free-started sessions cannot be selected as public pitch audio." />

          <section>
            <h2>Delivery signals</h2>
            <dl className="delivery-metrics"><div><dt><Gauge size={15} /> Pitch pace</dt><dd>{simulatorReport.pitchPace} <small>WPM</small></dd><span>Including pauses</span></div><div><dt><Gauge size={15} /> Answer pace</dt><dd>{simulatorReport.answerPace} <small>WPM</small></dd><span>Including pauses</span></div><div><dt><AudioLines size={15} /> Detected fillers</dt><dd>{simulatorReport.fillerMatches}</dd><span>{simulatorReport.fillerTokenCount} matched words · {simulatorReport.fillerPercent}% · {simulatorReport.fillerPhrases.join(", ")}</span></div><div><dt><Clock3 size={15} /> Recorded speech</dt><dd>{simulatorReport.totalDuration}</dd><span>Pitch and answer</span></div></dl>
            <p className="metric-caveat">Speech-to-text may remove hesitations. A low count is not proof that none were audible.</p>
          </section>
          <section className="report-next-step"><h2>Practise the market bridge</h2><p>Keep the opening and business model. Replace the broad reachable-market claim with a bottom-up calculation you can explain aloud.</p><Link className="button button-dark" href="/simulator/new"><RotateCcw size={16} /> Start another practice</Link></section>
          <section className="private-report-note"><LockKeyhole size={18} /><h2>This report stays private</h2><p>Investors never see the Q&amp;A, coaching notes, or transcript. A qualifying pitch segment still requires explicit publication consent.</p></section>
        </aside>
      </div>
    </main>
  );
}
