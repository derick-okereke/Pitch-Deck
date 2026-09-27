import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getVerifiedUser } from "@/lib/auth";
import { generateQuestions, transcribe } from "@/lib/providers/groq";
import { jsonSafe, recordingExtension, transcriptionMetrics, validateRecording } from "@/lib/simulator-recording";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getVerifiedUser();
  if (!user) return apiError("AUTH_REQUIRED", "Sign in to submit your pitch recording.", 401);
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return apiError("SESSION_NOT_FOUND", "The session was not found.", 404);
  const admin = createAdminClient();
  let processingStarted = false;
  try {
    const form = await request.formData();
    const { file, mimeType, durationMs } = validateRecording(form.get("file"), form.get("duration_ms"), "pitch");
    const stateVersion = z.coerce.number().int().positive().parse(form.get("state_version"));
    const { data: session } = await admin.from("simulator_sessions").select("id, founder_id, snapshot_revision_id").eq("id", id).maybeSingle();
    if (!session || session.founder_id !== user.id) return apiError("SESSION_NOT_FOUND", "The session was not found.", 404);
    const storagePath = `${user.id}/${id}/pitch.${recordingExtension(mimeType)}`;
    const { error: beginError } = await admin.rpc("begin_simulator_segment", {
      p_founder_id: user.id, p_session_id: id, p_expected_version: stateVersion, p_segment_kind: "pitch", p_question_index: null,
      p_storage_path: storagePath, p_mime_type: mimeType, p_byte_size: file.size, p_duration_ms: durationMs,
    });
    if (beginError) return apiError("SESSION_STATE_CONFLICT", "This session changed in another tab. Reload to recover it.", 409, true);
    processingStarted = true;
    const { error: uploadError } = await admin.storage.from("pitch-audio").upload(storagePath, file, { contentType: mimeType, upsert: true });
    if (uploadError) throw new Error("AUDIO_UPLOAD_FAILED");

    const [transcriptResult, personasResult, revisionResult] = await Promise.all([
      transcribe(file),
      admin.from("simulator_personas").select("persona_key, name, title, focus").eq("session_id", id).order("persona_key"),
      admin.from("profile_revisions").select("payload").eq("id", session.snapshot_revision_id).single(),
    ]);
    const metrics = transcriptionMetrics(transcriptResult.text, durationMs);
    if (metrics.wordCount < 10) throw new Error("EMPTY_TRANSCRIPT");
    if (!personasResult.data || personasResult.data.length !== 3) throw new Error("PERSONAS_MISSING");
    const payload = revisionResult.data?.payload as { stage?: unknown } | undefined;
    const generated = await generateQuestions({
      transcript: transcriptResult.text,
      stage: typeof payload?.stage === "string" ? payload.stage : "not specified",
      personas: personasResult.data.map((persona) => ({ key: persona.persona_key, name: persona.name, title: persona.title, focus: persona.focus })),
    });
    const { data: completedVersion, error: completeError } = await admin.rpc("complete_pitch_and_questions", {
      p_session_id: id, p_transcript: transcriptResult.text, p_words: jsonSafe(transcriptResult.words), p_segments: jsonSafe(transcriptResult.segments),
      p_word_count: metrics.wordCount, p_wpm: metrics.wordsPerMinute, p_filler_matches: metrics.fillerMatches,
      p_filler_token_count: metrics.fillerTokenCount, p_filler_percent: metrics.fillerPercent, p_questions: jsonSafe(generated.questions),
      p_prompt_version: "questions-v2-two-persona", p_model_id: generated.modelId,
    });
    if (completeError) throw new Error("PERSISTENCE_FAILED");
    return apiSuccess({ state: "question_ready" as const, stateVersion: completedVersion, questions: generated.questions, metrics });
  } catch (error) {
    if (processingStarted) await admin.rpc("fail_simulator_stage", { p_session_id: id, p_expected_state: "pitch_processing", p_error_code: error instanceof Error ? error.message : "PITCH_PROCESSING_FAILED" });
    const code = error instanceof Error ? error.message : "PITCH_PROCESSING_FAILED";
    if (["MEDIA_INVALID", "PITCH_DURATION_INVALID", "EMPTY_TRANSCRIPT"].includes(code)) return apiError(code, code === "EMPTY_TRANSCRIPT" ? "The recording did not contain enough usable speech. Record it again in a quieter place." : "Use a supported 30-second to 5-minute audio recording under 20 MiB.", 422, true);
    return apiError("PROVIDER_UNAVAILABLE", "Your pitch is saved, but processing could not finish. Retry from this session without using another allowance.", 503, true);
  }
}
