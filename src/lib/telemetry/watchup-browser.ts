"use client";

import { isAllowedBrowserFailure, type BrowserStage } from "@/lib/telemetry/watchup-policy";

export function captureBrowserFailure(stage: BrowserStage, code: string) {
  if (!isAllowedBrowserFailure(stage, code)) return;
  try {
    // Only fixed codes cross this boundary. The private WatchUp key stays on the server.
    void fetch("/api/v1/telemetry-error", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage, code }),
    }).catch(() => {});
  } catch {
    // Telemetry cannot alter the user action.
  }
}
