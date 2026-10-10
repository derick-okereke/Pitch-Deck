import { withWatchupRequest } from "@/lib/telemetry/watchup-server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { conversationMutationError } from "@/lib/conversation-api";
import { getConversationAccount } from "@/lib/conversation-data";
import { createAdminClient } from "@/lib/supabase/admin";

async function setBlock(id: string, blocked: boolean) {
  const account = await getConversationAccount();
  if (!account) return apiError("AUTH_REQUIRED", "Sign in to update this conversation.", 401);
  if (!z.string().uuid().safeParse(id).success) return apiError("CONVERSATION_NOT_FOUND", "That conversation could not be found.", 404);
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("set_conversation_block", { p_user_id: account.id, p_conversation_id: id, p_blocked: blocked });
  if (error) return conversationMutationError(error.message);
  return apiSuccess({ blocked: Boolean(data), blocked_by_me: blocked });
}

async function handlePOST(_request: Request, context: { params: Promise<{ id: string }> }) {
  return setBlock((await context.params).id, true);
}

async function handleDELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  return setBlock((await context.params).id, false);
}

export const POST = withWatchupRequest("/api/v1/conversations/[id]/block", "POST", handlePOST);
export const DELETE = withWatchupRequest("/api/v1/conversations/[id]/block", "DELETE", handleDELETE);
