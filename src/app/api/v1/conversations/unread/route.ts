import { withWatchupRequest } from "@/lib/telemetry/watchup-server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getConversationAccount, getUnreadConversationCount } from "@/lib/conversation-data";

async function handleGET() {
  const account = await getConversationAccount();
  if (!account) return apiError("AUTH_REQUIRED", "Sign in to view unread messages.", 401);
  try {
    return apiSuccess({ unread_count: await getUnreadConversationCount() });
  } catch {
    return apiError("UNREAD_COUNT_UNAVAILABLE", "Unread messages could not be checked. Try again shortly.", 503, true);
  }
}

export const GET = withWatchupRequest("/api/v1/conversations/unread", "GET", handleGET);
