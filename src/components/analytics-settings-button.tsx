"use client";

import { SHOW_ANALYTICS_CHOICES_EVENT } from "@/lib/telemetry/consent-event";

export function AnalyticsSettingsButton() {
  return <button type="button" onClick={() => window.dispatchEvent(new Event(SHOW_ANALYTICS_CHOICES_EVENT))}>Analytics settings</button>;
}
