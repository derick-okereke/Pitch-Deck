import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { conversationMutationError } from "@/lib/conversation-api";
import { firstFieldErrors, readRequestSchema } from "@/lib/conversation";
import { getConversationAccount } from "@/lib/conversation-data";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const account = await getConversationAccount();
  if (!account) return apiError("AUTH_REQUIRED", "Sign in to update this conversation.", 401);
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return apiError("CONVERSATION_NOT_FOUND", "That conversation could not be found.", 404);
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Send a valid read update.", 422); }
  const parsed = readRequestSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "The read position is invalid.", 422, false, firstFieldErrors(parsed.error));
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("set_conversation_read", {
    p_user_id: account.id,
    p_conversation_id: id,
    p_last_read_sequence: parsed.data.last_read_sequence,
  });
  if (error) return conversationMutationError(error.message);
  return apiSuccess({ last_read_sequence: Number(data) });
}
