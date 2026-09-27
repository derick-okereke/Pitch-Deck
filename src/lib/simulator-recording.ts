import "server-only";

import type { Json } from "@/lib/supabase/database.types";
import { measureFillers, tokenizeSpokenWords, wordsPerMinute } from "@/lib/simulator";

const allowedTypes = new Set(["audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg", "audio/wav", "audio/x-m4a"]);

export function validateRecording(file: FormDataEntryValue | null, durationValue: FormDataEntryValue | null, kind: "pitch" | "answer") {
  if (!(file instanceof File)) throw new Error("MEDIA_INVALID");
  if (file.size === 0 || file.size > 20 * 1024 * 1024) throw new Error("MEDIA_INVALID");
  const mimeType = file.type.split(";")[0].toLocaleLowerCase();
  if (!allowedTypes.has(mimeType)) throw new Error("MEDIA_INVALID");
  const durationMs = Number(durationValue);
  const withinRange = Number.isInteger(durationMs) && (kind === "pitch" ? durationMs >= 30_000 && durationMs <= 300_000 : durationMs >= 5_000 && durationMs <= 90_000);
  if (!withinRange) throw new Error(kind === "pitch" ? "PITCH_DURATION_INVALID" : "ANSWER_DURATION_INVALID");
  return { file, mimeType, durationMs };
}

export function recordingExtension(mimeType: string) {
  if (mimeType === "audio/mp4" || mimeType === "audio/x-m4a") return "m4a";
  if (mimeType === "audio/ogg") return "ogg";
  if (mimeType === "audio/mpeg") return "mp3";
  if (mimeType === "audio/wav") return "wav";
  return "webm";
}

export function transcriptionMetrics(text: string, durationMs: number) {
  const fillers = measureFillers(text);
  return {
    wordCount: tokenizeSpokenWords(text).length,
    wordsPerMinute: wordsPerMinute(text, durationMs / 1000),
    fillerMatches: fillers.matchCount,
    fillerTokenCount: fillers.tokenCount,
    fillerPercent: fillers.percent,
  };
}

export function jsonSafe(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}
