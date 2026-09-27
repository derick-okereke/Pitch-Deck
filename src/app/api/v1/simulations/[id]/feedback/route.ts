import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getVerifiedUser } from "@/lib/auth";
import { generateSimulatorFeedback } from "@/lib/providers/groq";
import { jsonSafe } from "@/lib/simulator-recording";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getVerifiedUser();
  if (!user) return apiError("AUTH_REQUIRED", "Sign in to generate feedback.", 401);
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return apiError("SESSION_NOT_FOUND", "The session was not found.", 404);
  const admin = createAdminClient();
  let processingStarted = false;
  try {
    const input = z.object({ state_version: z.number().int().positive() }).strict().parse(await request.json());
    const { data: session } = await admin.from("simulator_sessions").select("id, founder_id, snapshot_revision_id").eq("id", id).maybeSingle();
    if (!session || session.founder_id !== user.id) return apiError("SESSION_NOT_FOUND", "The session was not found.", 404);
    const { error: beginError } = await admin.rpc("begin_simulator_feedback", { p_founder_id: user.id, p_session_id: id, p_expected_version: input.state_version });
    if (beginError) return apiError("SESSION_STATE_CONFLICT", "This session changed in another tab. Reload to recover it.", 409, true);
    processingStarted = true;
    const [recordings, questions, personas, revision] = await Promise.all([
      admin.from("simulator_recordings").select("segment_kind, question_index, transcript, words_per_minute, filler_matches, filler_percent").eq("session_id", id).not("accepted_at", "is", null),
      admin.from("simulator_questions").select("question_index, persona_key, question").eq("session_id", id).order("question_index"),
      admin.from("simulator_personas").select("persona_key, name, title, focus").eq("session_id", id).order("persona_key"),
      admin.from("profile_revisions").select("payload").eq("id", session.snapshot_revision_id).single(),
    ]);
    const pitch = recordings.data?.find((recording) => recording.segment_kind === "pitch");
    const answers = recordings.data?.filter((recording) => recording.segment_kind === "answer").sort((a, b) => (a.question_index ?? 0) - (b.question_index ?? 0));
    if (!pitch?.transcript || answers?.length !== 2 || !answers.every((answer) => answer.transcript) || questions.data?.length !== 2 || personas.data?.length !== 3) throw new Error("SESSION_EVIDENCE_INCOMPLETE");
    const payload = revision.data?.payload as { stage?: unknown } | undefined;
    const feedback = await generateSimulatorFeedback({
      stage: typeof payload?.stage === "string" ? payload.stage : "not specified",
      personas: personas.data,
      pitch: { transcript: pitch.transcript, wordsPerMinute: pitch.words_per_minute ?? 0, fillerMatches: pitch.filler_matches ?? 0, fillerPercent: pitch.filler_percent ?? 0 },
      questions: questions.data,
      answers: answers.map((answer) => ({ question_index: answer.question_index!, transcript: answer.transcript!, wordsPerMinute: answer.words_per_minute ?? 0, fillerMatches: answer.filler_matches ?? 0, fillerPercent: answer.filler_percent ?? 0 })),
    });
    const { data: completedVersion, error: completeError } = await admin.rpc("complete_simulator_feedback", {
      p_session_id: id, p_schema_version: feedback.schema_version, p_rubric_version: "readiness-v1", p_prompt_version: "feedback-v1-two-question",
      p_model_id: feedback.modelId, p_categories: jsonSafe(feedback.categories), p_persona_feedback: jsonSafe(feedback.persona_feedback),
      p_session_points: feedback.sessionPoints, p_delivery_points: feedback.deliveryPoints,
    });
    if (completeError) throw new Error("PERSISTENCE_FAILED");
    return apiSuccess({ state: "completed" as const, stateVersion: completedVersion, reportUrl: `/simulator/${id}/report` });
  } catch (error) {
    if (processingStarted) await admin.rpc("fail_simulator_stage", { p_session_id: id, p_expected_state: "feedback_generating", p_error_code: error instanceof Error ? error.message : "FEEDBACK_FAILED" });
    return apiError("PROVIDER_UNAVAILABLE", "Your recordings and transcripts are safe, but feedback could not finish. Retry from this session.", 503, true);
  }
}
