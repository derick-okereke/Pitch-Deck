import "server-only";

import { getWatchup, initWatchup } from "@watchupltd/nextjs/server";
import { unhandledErrorRoute } from "@/lib/telemetry/watchup-route";

type ServerStage = "billing_checkout" | "billing_webhook" | "founder_profile" | "server_unhandled"
  | "profile_save" | "intro_request" | "billing_return" | "simulator_step";

export function initializeWatchup() {
  if (!process.env.WATCHUP_API_KEY) return;
  initWatchup({
    apiKey: process.env.WATCHUP_API_KEY,
    environment: process.env.NODE_ENV,
    release: process.env.GIT_SHA,
  });
}

export function captureServerFailure(stage: ServerStage, code: string) {
  captureFixedFailure(stage, code, stage);
}

export function captureUnhandledServerFailure(routePath: unknown, routeType: unknown) {
  captureFixedFailure("server_unhandled", "UNHANDLED_SERVER_ERROR", unhandledErrorRoute(routePath, routeType));
}

function captureFixedFailure(stage: ServerStage, code: string, route: string) {
  if (!process.env.WATCHUP_API_KEY) return;
  try {
    initializeWatchup();
    getWatchup().captureError(new Error(/^[A-Z_]{1,64}$/.test(code) ? code : "SERVER_OPERATION_FAILED"), {
      route,
      level: "error",
    });
  } catch {
    // A monitoring outage cannot change an operational response.
  }
}
