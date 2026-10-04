"use client";

import { Watchup } from "@watchupltd/browser";

type BrowserStage = "profile_save" | "intro_request" | "billing_checkout" | "billing_return" | "simulator_step";
let client: Watchup | null = null;

export function captureBrowserFailure(stage: BrowserStage, code: string) {
  const key = process.env.NEXT_PUBLIC_WATCHUP_KEY;
  if (!key?.startsWith("wup_pub_")) return;
  try {
    client ??= new Watchup({
      apiKey: key,
      environment: process.env.NODE_ENV,
      release: process.env.NEXT_PUBLIC_GIT_SHA,
      autoCapture: { errors: false, performance: false, pageViews: false },
    });
    // Never pass an original exception, stack, URL, form value or API body.
    client.captureError(new Error(/^[A-Z_]{1,64}$/.test(code) ? code : "CLIENT_OPERATION_FAILED"), {
      route: stage,
      level: "error",
    });
  } catch {
    // Telemetry cannot alter the user action.
  }
}
