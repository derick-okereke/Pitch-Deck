import "server-only";

import { apiError } from "@/lib/api-response";

export function conversationMutationError(message: string | undefined) {
  if (message?.includes("INVESTOR_PRO_REQUIRED")) return apiError("INVESTOR_PRO_REQUIRED", "Investor Pro is required to open a new introduction. Investor billing is a demo preview and is not available yet.", 403);
  if (message?.includes("INVESTOR_PROFILE_REQUIRED")) return apiError("INVESTOR_PROFILE_REQUIRED", "Complete your investment profile before requesting an introduction.", 403);
  if (message?.includes("INVESTOR_REQUIRED") || message?.includes("FOUNDER_REQUIRED") || message?.includes("ACCOUNT_REQUIRED")) return apiError("ACTION_FORBIDDEN", "This account cannot complete that action.", 403);
  if (message?.includes("STARTUP_NOT_FOUND")) return apiError("STARTUP_NOT_FOUND", "This startup is no longer available for new introductions.", 404);
  if (message?.includes("CONVERSATION_NOT_FOUND")) return apiError("CONVERSATION_NOT_FOUND", "That conversation could not be found.", 404);
  if (message?.includes("CONVERSATION_BLOCKED")) return apiError("CONVERSATION_BLOCKED", "This conversation is blocked. Unblock it before sending another message.", 403);
  if (message?.includes("IDEMPOTENCY_CONFLICT")) return apiError("IDEMPOTENCY_CONFLICT", "That retry key was already used for different message content. Start a fresh message and try again.", 409);
  if (message?.includes("INTRO_RATE_LIMITED")) return apiError("INTRO_RATE_LIMITED", "The daily introduction limit has been reached. Try again tomorrow.", 429, true);
  if (message?.includes("MESSAGE_RATE_LIMITED")) return apiError("MESSAGE_RATE_LIMITED", "Messages are being sent too quickly. Wait a minute and retry.", 429, true);
  if (message?.includes("INVALID_INTRO_NOTE") || message?.includes("INVALID_MESSAGE") || message?.includes("INVALID_READ_SEQUENCE")) return apiError("VALIDATION_ERROR", "Check the message and try again.", 422);
  return apiError("MESSAGING_UNAVAILABLE", "Messaging is temporarily unavailable. Your typed message is still safe in this browser.", 503, true);
}
