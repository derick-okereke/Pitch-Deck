import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.WATCHUP_API_KEY) return;
  const { initializeWatchup } = await import("@/lib/telemetry/watchup-server");
  initializeWatchup();
}

export const onRequestError: Instrumentation.onRequestError = async (_error, _request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.WATCHUP_API_KEY) return;
  const { captureUnhandledServerFailure } = await import("@/lib/telemetry/watchup-server");
  captureUnhandledServerFailure(context.routePath, context.routeType);
};
