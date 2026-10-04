import "server-only";

import { getWatchup, initWatchup } from "@watchupltd/nextjs/server";

type ServerStage = "billing_checkout" | "billing_webhook" | "founder_profile" | "server_unhandled";

export function initializeWatchup() {
  if (!process.env.WATCHUP_API_KEY) return;
  initWatchup({
    apiKey: process.env.WATCHUP_API_KEY,
    environment: process.env.NODE_ENV,
    release: process.env.GIT_SHA,
  });
}

export function captureServerFailure(stage: ServerStage, code: string) {
  if (!process.env.WATCHUP_API_KEY) return;
  try {
    initializeWatchup();
    getWatchup().captureError(new Error(/^[A-Z_]{1,64}$/.test(code) ? code : "SERVER_OPERATION_FAILED"), {
      route: stage,
      level: "error",
    });
  } catch {
    // A monitoring outage cannot change an operational response.
  }
}
