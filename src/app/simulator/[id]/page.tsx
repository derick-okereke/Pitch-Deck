import { notFound } from "next/navigation";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { SimulatorSessionLive } from "@/components/simulator/simulator-session-live";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/account";

export default async function SimulatorSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await getCurrentAccount();
  if (!account) notFound();
  const supabase = await createClient();
  const { data: session } = await supabase.from("simulator_sessions").select("id, state, state_version, snapshot_revision_id, answered_question_count, retry_stage, expires_at").eq("id", id).maybeSingle();
  if (!session || ["failed", "cancelled"].includes(session.state)) notFound();
  // This server-rendered request must compare expiry against the current time.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  if (session.state === "expired" || (session.state !== "completed" && Date.parse(session.expires_at) <= now)) {
    return <main className="simulator-page session-page"><section className="session-guard"><CircleAlert size={24} /><h1>This practice session expired.</h1><p>The room’s time window has ended. Return to setup to begin a new session. Any unused free session reservation will be released when you start.</p><Link className="button button-dark" href="/simulator/new">Return to session setup</Link></section></main>;
  }
  const [{ data: personas }, { data: questions }] = await Promise.all([
    supabase.from("simulator_personas").select("persona_key, name, title, focus, voice_style").eq("session_id", id).order("persona_key"),
    supabase.from("simulator_questions").select("question_index, persona_key, question, source_quote, focus_category").eq("session_id", id).order("question_index"),
  ]);
  if (!personas || personas.length !== 3) notFound();
  return <SimulatorSessionLive answeredQuestionCount={session.answered_question_count} founderName={account.displayName} initialQuestions={questions ?? []} initialState={session.state as "ready" | "pitch_processing" | "question_ready" | "answer_processing" | "ready_for_feedback" | "feedback_generating" | "retryable_error" | "completed"} initialStateVersion={session.state_version} personas={personas} retryStage={session.retry_stage} sessionId={session.id} />;
}
