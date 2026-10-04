import { createHash } from "node:crypto";
import { z } from "zod";
import type { Json } from "@/lib/supabase/database.types";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getCurrentAccount } from "@/lib/account";
import { founderDraftSchema, founderSectors } from "@/lib/profile";
import { generatePersonas } from "@/lib/providers/groq";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const inputSchema = z.object({
  startup_id: z.string().uuid(),
  draft_version: z.number().int().positive(),
  consent_version: z.literal("recording-consent-v1"),
  industry: z.enum(founderSectors),
}).strict();

function mappedError(message: string | undefined) {
  if (message?.includes("FREE_SESSIONS_EXHAUSTED")) return apiError("FREE_SESSIONS_EXHAUSTED", "All three lifetime free practice sessions have been used.", 403);
  if (message?.includes("ACTIVE_SESSION_EXISTS")) return apiError("ACTIVE_SESSION_EXISTS", "Finish or cancel the active practice session before starting another.", 409);
  if (message?.includes("DRAFT_VERSION_CONFLICT")) return apiError("DRAFT_VERSION_CONFLICT", "The profile changed. Reload setup before starting this session.", 409);
  if (message?.includes("IDEMPOTENCY_CONFLICT")) return apiError("IDEMPOTENCY_CONFLICT", "This start request was already used for different session details.", 409);
  return apiError("SESSION_START_FAILED", "The practice session could not start. Try again without closing this page.", 503, true);
}

export async function POST(request: Request) {
  const account = await getCurrentAccount();
  if (!account || account.role !== "founder") return apiError("FOUNDER_REQUIRED", "Sign in with a founder account to practise.", 403);

  const idempotencyKey = request.headers.get("Idempotency-Key");
  if (!idempotencyKey || !z.string().uuid().safeParse(idempotencyKey).success) {
    return apiError("IDEMPOTENCY_KEY_REQUIRED", "A valid session start key is required.", 422);
  }

  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_INPUT", "The session request is invalid.", 422); }
  const input = inputSchema.safeParse(body);
  if (!input.success) return apiError("INVALID_INPUT", "Choose an industry, use a current founder profile, and confirm recording consent.", 422);

  const supabase = await createClient();
  const { data: startup } = await supabase.from("startups").select("id, draft_version, draft_payload").eq("id", input.data.startup_id).maybeSingle();
  if (!startup) return apiError("STARTUP_NOT_FOUND", "The founder profile was not found.", 404);
  const profile = founderDraftSchema.safeParse(startup.draft_payload);
  if (!profile.success) return apiError("INVALID_PROFILE", "The saved profile needs to be repaired before practice can begin.", 422);

  const serialized = JSON.stringify(profile.data);
  const contentHash = createHash("sha256").update(serialized).digest("hex");
  const inputHash = createHash("sha256").update(JSON.stringify(input.data)).digest("hex");
  const admin = createAdminClient();
  const { data: started, error: startError } = await admin.rpc("start_simulator_session", {
    p_founder_id: account.id,
    p_startup_id: startup.id,
    p_draft_version: input.data.draft_version,
    p_content_hash: contentHash,
    p_consent_version: input.data.consent_version,
    p_idempotency_key: idempotencyKey,
    p_input_hash: inputHash,
  });
  if (startError || !started?.[0]) return mappedError(startError?.message);
  const session = started[0];

  if (session.session_state === "ready") {
    return apiSuccess({
      session_id: session.session_id,
      state: session.session_state,
      state_version: session.state_version,
      remaining_free: session.remaining_free,
      reused: true,
    });
  }
  if (session.session_state !== "preparing") {
    return apiError("INVALID_SESSION_STATE", "This start request belongs to a session that can no longer be prepared.", 409);
  }

  try {
    const personas = await generatePersonas({ sector: input.data.industry, tagline: profile.data.tagline, stage: profile.data.stage });
    const { data: prepared, error: preparationError } = await admin.rpc("complete_simulator_preparation", {
      p_session_id: session.session_id,
      p_personas: personas as unknown as Json,
    });
    if (preparationError || !prepared?.[0]) throw preparationError ?? new Error("Preparation did not return a session.");
    return apiSuccess({
      session_id: session.session_id,
      state: prepared[0].session_state,
      state_version: prepared[0].state_version,
      remaining_free: session.remaining_free,
      reused: session.reused,
    }, 201);
  } catch {
    await admin.rpc("fail_simulator_preparation", { p_session_id: session.session_id, p_error_code: "PROVIDER_UNAVAILABLE" });
    return apiError("PROVIDER_UNAVAILABLE", "Practice is temporarily unavailable. No free session was used.", 503, true);
  }
}
