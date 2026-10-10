import { withWatchupRequest } from "@/lib/telemetry/watchup-server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getVerifiedUser } from "@/lib/auth";
import { transcribe } from "@/lib/providers/groq";
import { jsonSafe, transcriptionMetrics } from "@/lib/simulator-recording";
import { createAdminClient } from "@/lib/supabase/admin";

import { storedRecording } from "@/lib/stored-recording";

export const runtime = "nodejs";
export const maxDuration = 90;

async function handlePOST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getVerifiedUser();
  if (!user) return apiError("AUTH_REQUIRED", "Sign in to submit your answer.", 401);
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return apiError("SESSION_NOT_FOUND", "The session was not found.", 404);
  const admin = createAdminClient();
  let processingStarted = false;
  try {
    const { mimeType, durationMs, byteSize, stateVersion, storagePath, audioUrl, questionIndex } = await storedRecording(request, user.id, id, "answer");
    const { data: session } = await admin.from("simulator_sessions").select("id, founder_id").eq("id", id).maybeSingle();
    if (!session || session.founder_id !== user.id) return apiError("SESSION_NOT_FOUND", "The session was not found.", 404);
    const { error: beginError } = await admin.rpc("begin_simulator_segment", {
      p_founder_id: user.id, p_session_id: id, p_expected_version: stateVersion, p_segment_kind: "answer", p_question_index: questionIndex!,
      p_storage_path: storagePath, p_mime_type: mimeType, p_byte_size: byteSize, p_duration_ms: durationMs,
    });
    if (beginError) return apiError("SESSION_STATE_CONFLICT", "This session changed in another tab. Reload to recover it.", 409, true);
    processingStarted = true;
    const transcriptResult = await transcribe(audioUrl);
    const metrics = transcriptionMetrics(transcriptResult.text, durationMs);
    if (metrics.wordCount < 3) throw new Error("EMPTY_TRANSCRIPT");
    const { data, error: completeError } = await admin.rpc("complete_simulator_answer", {
      p_session_id: id, p_question_index: questionIndex!, p_transcript: transcriptResult.text,
      p_words: jsonSafe(transcriptResult.words), p_segments: jsonSafe(transcriptResult.segments), p_word_count: metrics.wordCount,
      p_wpm: metrics.wordsPerMinute, p_filler_matches: metrics.fillerMatches, p_filler_token_count: metrics.fillerTokenCount, p_filler_percent: metrics.fillerPercent,
    });
    if (completeError || !data?.[0]) throw new Error("PERSISTENCE_FAILED");
    return apiSuccess({ state: data[0].session_state, stateVersion: data[0].state_version, answeredQuestionCount: data[0].answered_question_count, metrics });
  } catch (error) {
    if (processingStarted) await admin.rpc("fail_simulator_stage", { p_session_id: id, p_expected_state: "answer_processing", p_error_code: error instanceof Error ? error.message : "ANSWER_PROCESSING_FAILED" });
    const code = error instanceof Error ? error.message : "ANSWER_PROCESSING_FAILED";
    if (["MEDIA_INVALID", "ANSWER_DURATION_INVALID", "EMPTY_TRANSCRIPT"].includes(code)) return apiError(code, code === "EMPTY_TRANSCRIPT" ? "The answer did not contain enough usable speech. Record it again in a quieter place." : "Use a supported 5-to-90-second audio recording under 20 MiB.", 422, true);
    return apiError("PROVIDER_UNAVAILABLE", "Your answer is saved, but processing could not finish. Retry from this session.", 503, true);
  }
}

export const POST = withWatchupRequest("/api/v1/simulations/[id]/answers", "POST", handlePOST);
