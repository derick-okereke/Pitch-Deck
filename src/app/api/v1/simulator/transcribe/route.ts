import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getVerifiedUser } from "@/lib/auth";
import { transcribe } from "@/lib/providers/groq";

export const runtime = "nodejs";
export const maxDuration = 60;

const kindSchema = z.enum(["pitch", "answer"]);
const allowedTypes = new Set(["audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg", "audio/wav", "audio/x-m4a"]);

export async function POST(request: Request) {
  if (!await getVerifiedUser()) return apiError("AUTH_REQUIRED", "Sign in to transcribe a recording.", 401);
  try {
    const form = await request.formData();
    const file = form.get("file");
    const kind = kindSchema.safeParse(form.get("kind"));
    if (!(file instanceof File) || !kind.success) return apiError("MEDIA_INVALID", "Provide one supported pitch or answer recording.", 422);
    if (file.size === 0 || file.size > 20 * 1024 * 1024) return apiError("MEDIA_INVALID", "The recording must be between 1 byte and 20 MiB.", file.size > 20 * 1024 * 1024 ? 413 : 422);
    const baseType = file.type.split(";")[0].toLowerCase();
    if (!allowedTypes.has(baseType)) return apiError("MEDIA_INVALID", "Use WebM, MP4, OGG, MP3, WAV, or M4A audio.", 422);

    const result = await transcribe(file);
    const wordCount = result.text.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)?.length ?? 0;
    const minimum = kind.data === "pitch" ? 10 : 3;
    if (wordCount < minimum) return apiError("EMPTY_TRANSCRIPT", "The recording did not contain enough usable speech. Record it again in a quieter place.", 422);
    return apiSuccess({ ...result, kind: kind.data, wordCount });
  } catch {
    return apiError("PROVIDER_UNAVAILABLE", "Transcription is temporarily unavailable. Your recording has not been scored.", 503, true);
  }
}
