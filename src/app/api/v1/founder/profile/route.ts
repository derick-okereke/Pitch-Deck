import type { ProfileActionState } from "@/lib/profile-action-state";
import { saveFounderProfile } from "@/lib/save-founder-profile";
import { captureServerFailure, withWatchupRequest } from "@/lib/telemetry/watchup-server";

export const runtime = "nodejs";
export const maxDuration = 60;

function responseStatus(state: ProfileActionState) {
  if (state.status === "conflict") return 409;
  if (state.status === "error" && state.fieldErrors) return 422;
  if (state.status === "error" && state.message.startsWith("Your session")) return 401;
  return 200;
}

function failureDiagnostic(error: unknown) {
  if (!(error instanceof Error)) return { errorName: "UnknownError" };
  const cause = error.cause;
  const providerError = cause && typeof cause === "object" ? cause as Record<string, unknown> : null;
  return {
    errorName: error.name,
    errorMessage: error.message,
    providerCode: typeof providerError?.code === "string" ? providerError.code : undefined,
    providerMessage: typeof providerError?.message === "string" ? providerError.message : undefined,
  };
}

async function handlePOST(request: Request) {
  const requestId = crypto.randomUUID().slice(0, 8).toUpperCase();
  try {
    const formData = await request.formData();
    const state = await saveFounderProfile(formData);
    return Response.json(state, { status: responseStatus(state) });
  } catch (error) {
    console.error("Founder profile save failed", {
      requestId,
      code: "PROFILE_STORAGE_FAILURE",
      ...failureDiagnostic(error),
    });
    captureServerFailure("founder_profile", "PROFILE_STORAGE_FAILURE");
    return Response.json({
      status: "error",
      message: `We could not reach profile storage. Your browser copy is safe. Try again shortly. Reference ${requestId}.`,
      supportCode: requestId,
    } satisfies ProfileActionState, { status: 503 });
  }
}

export const POST = withWatchupRequest("/api/v1/founder/profile", "POST", handlePOST);
