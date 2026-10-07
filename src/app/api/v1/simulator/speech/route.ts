import { z } from "zod";
import { apiError } from "@/lib/api-response";
import { getVerifiedUser } from "@/lib/auth";
import { synthesizeSpeech } from "@/lib/providers/elevenlabs-speech";

export const runtime = "nodejs";
export const maxDuration = 60;

const inputSchema = z.object({
  text: z.string().min(20).max(400),
  voiceStyle: z.enum(["warm-rigorous", "direct-analytical", "calm-strategic"]),
}).strict();

export async function POST(request: Request) {
  if (!await getVerifiedUser()) return apiError("AUTH_REQUIRED", "Sign in to play the generated voice.", 401);
  try {
    const input = inputSchema.safeParse(await request.json());
    if (!input.success) return apiError("INVALID_INPUT", "The speech request is invalid.", 422);
    const audio = await synthesizeSpeech(input.data.text, input.data.voiceStyle);
    return new Response(audio, { status: 200, headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    console.error("ElevenLabs speech synthesis failed", error);
    return apiError("PROVIDER_UNAVAILABLE", "Voice playback is temporarily unavailable. Continue with the written question.", 503, true);
  }
}
