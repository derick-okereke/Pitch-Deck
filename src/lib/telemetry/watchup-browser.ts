"use client";

import { isAllowedBrowserFailure, type BrowserStage } from "@/lib/telemetry/watchup-policy";
import { ANALYTICS_CONSENT_KEY } from "@/lib/telemetry/consent";
import { analyticsPage, parseWatchupAnalytics } from "@/lib/telemetry/watchup-analytics-policy";
import type { ProductEvent } from "@/lib/telemetry/posthog-policy";

let analyticsEnabled = false;
let lastPage: string | null = null;
const VISITOR_KEY = "pitch-deck:watchup-visitor-v1";
const SESSION_KEY = "pitch-deck:watchup-session-v1";

export function startWatchupAnalytics() { analyticsEnabled = true; }
export function stopWatchupAnalytics() {
  analyticsEnabled = false;
  lastPage = null;
  try { localStorage.removeItem(VISITOR_KEY); sessionStorage.removeItem(SESSION_KEY); } catch { /* storage unavailable */ }
}

function analyticsAllowed() {
  try { return analyticsEnabled && localStorage.getItem(ANALYTICS_CONSENT_KEY) === "yes"; } catch { return false; }
}

function identifier(storage: Storage, key: string) {
  let id = storage.getItem(key);
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    id = crypto.randomUUID();
    storage.setItem(key, id);
  }
  return id;
}

function sendAnalytics(input: Record<string, unknown>) {
  if (!analyticsAllowed()) return false;
  try {
    const payload = parseWatchupAnalytics({ ...input, visitor_id: identifier(localStorage, VISITOR_KEY) });
    if (!payload) return false;
    void fetch("/api/v1/telemetry", {
      method: "POST", credentials: "same-origin", cache: "no-store", keepalive: true,
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    }).catch(() => {});
    return true;
  } catch { return false; }
}

export function captureWatchupPageView(pathname: string) {
  if (!analyticsAllowed() || lastPage === pathname) return;
  const path = analyticsPage(pathname);
  if (!path) return;
  try {
    if (sendAnalytics({ kind: "pageview", path, session_id: identifier(sessionStorage, SESSION_KEY), screen_w: screen.width, screen_h: screen.height, lang: navigator.language })) lastPage = pathname;
  } catch { /* optional analytics */ }
}

export function captureWatchupProductEvent(event: ProductEvent, properties?: Record<string, unknown>) {
  sendAnalytics({ kind: "event", event, properties });
}

export function captureWatchupWebVital(metric: { name: string; value: number }) {
  if (!analyticsAllowed()) return;
  const path = analyticsPage(window.location.pathname);
  if (path) sendAnalytics({ kind: "vital", path, name: metric.name, value: metric.value });
}

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
