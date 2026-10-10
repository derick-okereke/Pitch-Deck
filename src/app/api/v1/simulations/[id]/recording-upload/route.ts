import { withWatchupRequest } from "@/lib/telemetry/watchup-server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getVerifiedUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordingUploadSchema, signRecordingUpload } from "@/lib/recording-upload-ticket";
import { recordingExtension } from "@/lib/simulator-recording";

export const runtime = "nodejs";

async function handleGET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getVerifiedUser();
  if (!user) return apiError("AUTH_REQUIRED", "Sign in to recover your session.", 401);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return apiError("SESSION_NOT_FOUND", "The session was not found.", 404);
  const { data } = await createAdminClient().from("simulator_sessions").select("state_version").eq("id", id).eq("founder_id", user.id).maybeSingle();
  return data ? apiSuccess({ stateVersion: data.state_version }) : apiError("SESSION_NOT_FOUND", "The session was not found.", 404);
}

async function handlePOST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getVerifiedUser();
  if (!user) return apiError("AUTH_REQUIRED", "Sign in to upload a recording.", 401);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return apiError("SESSION_NOT_FOUND", "The session was not found.", 404);
  try {
    const text = await request.text();
    if (text.length > 1024) return apiError("MEDIA_INVALID", "Recording metadata is too large.", 413);
    const input = recordingUploadSchema.parse(JSON.parse(text));
    const admin = createAdminClient();
    const { data: session } = await admin.from("simulator_sessions").select("state, state_version, retry_stage, answered_question_count, expires_at").eq("id", id).eq("founder_id", user.id).maybeSingle();
    if (!session) return apiError("SESSION_NOT_FOUND", "The session was not found.", 404);
    const expectedState = input.kind === "pitch" ? "ready" : "question_ready";
    const retryStage = input.kind === "pitch" ? "pitch_processing" : "answer_processing";
    if (session.state_version !== input.stateVersion || Date.parse(session.expires_at) <= Date.now()
      || !(session.state === expectedState || (session.state === "retryable_error" && session.retry_stage === retryStage))
      || (input.kind === "answer" && input.questionIndex !== session.answered_question_count + 1)) {
      return apiError("SESSION_STATE_CONFLICT", "This session changed. Reload to recover it.", 409, true);
    }
    // A fresh object prevents old upload credentials from overwriting accepted evidence.
    const storagePath = `${user.id}/${id}/${randomUUID()}.${recordingExtension(input.mimeType)}`;
    const { data, error } = await admin.storage.from("pitch-audio").createSignedUploadUrl(storagePath);
    if (error || !data) return apiError("UPLOAD_UNAVAILABLE", "Audio upload is unavailable. Try again.", 503, true);
    const uploadTicket = signRecordingUpload({ ...input, userId: user.id, sessionId: id, storagePath, expiresAt: Date.now() + 15 * 60_000 }, process.env.SUPABASE_SECRET_KEY!);
    return apiSuccess({ storagePath, token: data.token, uploadTicket });
  } catch {
    return apiError("MEDIA_INVALID", "Use a supported recording within the size and duration limits.", 422, true);
  }
}

export const GET = withWatchupRequest("/api/v1/simulations/[id]/recording-upload", "GET", handleGET);
export const POST = withWatchupRequest("/api/v1/simulations/[id]/recording-upload", "POST", handlePOST);
