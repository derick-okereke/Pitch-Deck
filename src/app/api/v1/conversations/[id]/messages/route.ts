import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { conversationMutationError } from "@/lib/conversation-api";
import { firstFieldErrors, messageRequestSchema } from "@/lib/conversation";
import { getConversationAccount, getConversationDetail } from "@/lib/conversation-data";
import { createAdminClient } from "@/lib/supabase/admin";

const idSchema = z.string().uuid();

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const account = await getConversationAccount();
  if (!account) return apiError("AUTH_REQUIRED", "Sign in to open this conversation.", 401);
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) return apiError("CONVERSATION_NOT_FOUND", "That conversation could not be found.", 404);
  const detail = await getConversationDetail(id);
  if (!detail) return apiError("CONVERSATION_NOT_FOUND", "That conversation could not be found.", 404);
  return apiSuccess({
    messages: detail.messages,
    highest_sequence: detail.highestSequence,
    blocked: detail.blocked,
    blocked_by_me: detail.blockedByMe,
    listed: detail.listed,
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const account = await getConversationAccount();
  if (!account) return apiError("AUTH_REQUIRED", "Sign in to send a message.", 401);
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) return apiError("CONVERSATION_NOT_FOUND", "That conversation could not be found.", 404);
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Send a valid message request.", 422); }
  const parsed = messageRequestSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Check the message and try again.", 422, false, firstFieldErrors(parsed.error));
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("send_conversation_message", {
    p_sender_id: account.id,
    p_conversation_id: id,
    p_body: parsed.data.body,
    p_client_message_id: parsed.data.client_message_id,
  });
  if (error || !data?.[0]) return conversationMutationError(error?.message);
  const message = data[0];
  return apiSuccess({
    id: message.message_id,
    clientMessageId: parsed.data.client_message_id,
    senderId: account.id,
    sequence: Number(message.message_sequence),
    body: message.message_body,
    createdAt: message.message_created_at,
    reused: message.reused,
  }, message.reused ? 200 : 201);
}
