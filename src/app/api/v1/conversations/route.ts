import { withWatchupRequest } from "@/lib/telemetry/watchup-server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getConversationAccount, getConversationList } from "@/lib/conversation-data";

async function handleGET() {
  const account = await getConversationAccount();
  if (!account) return apiError("AUTH_REQUIRED", "Sign in to open your inbox.", 401);
  try {
    const items = await getConversationList();
    return apiSuccess({ items, next_cursor: null });
  } catch {
    return apiError("CONVERSATIONS_UNAVAILABLE", "Your conversations could not load. Try again shortly.", 503, true);
  }
}

export const GET = withWatchupRequest("/api/v1/conversations", "GET", handleGET);
