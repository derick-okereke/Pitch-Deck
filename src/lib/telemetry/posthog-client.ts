"use client";

import posthog from "posthog-js";
import { allowedEvents, beforeSendProductEvent, type ProductEvent } from "@/lib/telemetry/posthog-policy";

export const ANALYTICS_CONSENT_KEY = "pitch-deck:analytics-consent-v1";
let initialized = false;
let identifiedAccountId: string | null = null;

export function startPostHog() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!key || !host) return;
  try {
    if (window.localStorage.getItem(ANALYTICS_CONSENT_KEY) !== "yes") return;
    if (initialized) { posthog.opt_in_capturing(); return; }
    const parsed = new URL(host);
    if (parsed.protocol !== "https:") return;
    posthog.init(key, {
      api_host: parsed.origin,
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_exceptions: false,
      disable_session_recording: true,
      person_profiles: "never",
      opt_out_capturing_by_default: true,
      before_send: beforeSendProductEvent,
    });
    posthog.opt_in_capturing();
    initialized = true;
  } catch {
    // Analytics availability does not affect application behavior.
  }
}

export function stopPostHog() {
  if (!initialized) return;
  try { posthog.opt_out_capturing(); posthog.reset(); identifiedAccountId = null; } catch { /* optional analytics */ }
}

export function identifyPostHog(accountId: string) {
  if (!initialized || identifiedAccountId === accountId || !/^[a-f0-9-]{36}$/i.test(accountId)) return;
  try { posthog.identify(accountId); identifiedAccountId = accountId; } catch { /* optional analytics */ }
}

export function clearPostHogIdentity() {
  if (!initialized || !identifiedAccountId) return;
  try {
    posthog.reset();
    identifiedAccountId = null;
    if (window.localStorage.getItem(ANALYTICS_CONSENT_KEY) === "yes") posthog.opt_in_capturing();
  } catch { /* optional analytics */ }
}

export function captureProductEvent(event: ProductEvent, properties?: { role?: "founder" | "investor"; step?: "pitch" | "answer" | "report" }) {
  if (!initialized || !allowedEvents.has(event)) return;
  try {
    if (window.localStorage.getItem(ANALYTICS_CONSENT_KEY) !== "yes") return;
    posthog.capture(event, properties);
  } catch {
    // An analytics failure must not change the completed user action.
  }
}
