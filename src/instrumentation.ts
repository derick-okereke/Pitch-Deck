import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.WATCHUP_API_KEY) return;
  const { initializeWatchup } = await import("@/lib/telemetry/watchup-server");
  initializeWatchup();
}

export const onRequestError: Instrumentation.onRequestError = async () => {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.WATCHUP_API_KEY) return;
  const { captureServerFailure } = await import("@/lib/telemetry/watchup-server");
  captureServerFailure("server_unhandled", "UNHANDLED_SERVER_ERROR");
};
