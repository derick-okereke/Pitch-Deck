import { z } from "zod";
import { simulatorPersonas } from "@/data/simulator-demo";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getVerifiedUser } from "@/lib/auth";
import { generateQuestion } from "@/lib/providers/groq";

export const runtime = "nodejs";
export const maxDuration = 60;

const inputSchema = z.object({ transcript: z.string().min(20).max(50_000), stage: z.string().min(2).max(80) }).strict();

export async function POST(request: Request) {
  if (!await getVerifiedUser()) return apiError("AUTH_REQUIRED", "Sign in to generate a question.", 401);
  try {
    const input = inputSchema.safeParse(await request.json());
    if (!input.success) return apiError("INVALID_INPUT", "The transcript or startup stage is invalid.", 422);
    const question = await generateQuestion({ transcript: input.data.transcript, stage: input.data.stage, personas: simulatorPersonas });
    return apiSuccess(question);
  } catch {
    return apiError("PROVIDER_UNAVAILABLE", "The investor question is temporarily unavailable.", 503, true);
  }
}
