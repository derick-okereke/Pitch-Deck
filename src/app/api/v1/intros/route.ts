import { withWatchupRequest } from "@/lib/telemetry/watchup-server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { conversationMutationError } from "@/lib/conversation-api";
import { firstFieldErrors, introRequestSchema } from "@/lib/conversation";
import { getConversationAccount } from "@/lib/conversation-data";
import { createAdminClient } from "@/lib/supabase/admin";

async function handlePOST(request: Request) {
  const account = await getConversationAccount();
  if (!account) return apiError("AUTH_REQUIRED", "Sign in to request an introduction.", 401);
  if (account.role !== "investor") return apiError("INVESTOR_REQUIRED", "Only investors can request introductions.", 403);
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Send a valid introduction request.", 422); }
  const parsed = introRequestSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Check the introduction note and try again.", 422, false, firstFieldErrors(parsed.error));

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("create_intro_request", {
    p_investor_id: account.id,
    p_startup_id: parsed.data.startup_id,
    p_body: parsed.data.note,
    p_client_message_id: parsed.data.client_message_id,
    p_demo_mode: process.env.DEMO_MODE === "true",
  });
  if (error || !data?.[0]) return conversationMutationError(error?.message);
  return apiSuccess({ conversation_id: data[0].conversation_id, created: data[0].created }, data[0].created ? 201 : 200);
}

export const POST = withWatchupRequest("/api/v1/intros", "POST", handlePOST);
