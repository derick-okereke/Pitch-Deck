import { withWatchupRequest } from "@/lib/telemetry/watchup-server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getCurrentAccount } from "@/lib/account";
import { createAdminClient } from "@/lib/supabase/admin";

const inputSchema = z.object({ state_version: z.number().int().positive() }).strict();

async function handlePOST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const account = await getCurrentAccount();
  if (!account || account.role !== "founder") return apiError("FOUNDER_REQUIRED", "Sign in with a founder account.", 403);
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return apiError("SESSION_NOT_FOUND", "The session was not found.", 404);
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_INPUT", "The cancellation request is invalid.", 422); }
  const input = inputSchema.safeParse(body);
  if (!input.success) return apiError("INVALID_INPUT", "The session version is invalid.", 422);
  const { data, error } = await createAdminClient().rpc("cancel_simulator_session", {
    p_founder_id: account.id,
    p_session_id: id,
    p_expected_version: input.data.state_version,
  });
  if (error) return apiError("INVALID_SESSION_STATE", "The session changed. Reload before cancelling it.", 409);
  return apiSuccess({ state: "cancelled", state_version: data });
}

export const POST = withWatchupRequest("/api/v1/simulations/[id]/cancel", "POST", handlePOST);
