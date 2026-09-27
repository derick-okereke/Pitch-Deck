import { notFound } from "next/navigation";
import { SimulatorSessionLive } from "@/components/simulator/simulator-session-live";
import { createClient } from "@/lib/supabase/server";

export default async function SimulatorSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: session } = await supabase.from("simulator_sessions").select("id, state, state_version, snapshot_revision_id, answered_question_count, retry_stage").eq("id", id).maybeSingle();
  if (!session || ["failed", "cancelled", "expired"].includes(session.state)) notFound();
  const [{ data: personas }, { data: questions }] = await Promise.all([
    supabase.from("simulator_personas").select("persona_key, name, title, focus, voice_style").eq("session_id", id).order("persona_key"),
    supabase.from("simulator_questions").select("question_index, persona_key, question, source_quote, focus_category").eq("session_id", id).order("question_index"),
  ]);
  if (!personas || personas.length !== 3) notFound();
  return <SimulatorSessionLive answeredQuestionCount={session.answered_question_count} initialQuestions={questions ?? []} initialState={session.state as "ready" | "pitch_processing" | "question_ready" | "answer_processing" | "ready_for_feedback" | "feedback_generating" | "retryable_error" | "completed"} initialStateVersion={session.state_version} personas={personas} retryStage={session.retry_stage} sessionId={session.id} />;
}
