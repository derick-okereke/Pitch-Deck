"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { SHOW_ANALYTICS_CHOICES_EVENT } from "@/lib/telemetry/consent-event";
import { ANALYTICS_CONSENT_KEY, clearPostHogIdentity, identifyPostHog, startPostHog, stopPostHog } from "@/lib/telemetry/posthog-client";
import { startWatchupAnalytics, stopWatchupAnalytics, captureWatchupPageView, captureWatchupWebVital } from "@/lib/telemetry/watchup-browser";

type Choice = "loading" | "unset" | "yes" | "no";

export function TelemetryConsent({ watchupEnabled = false }: { watchupEnabled?: boolean }) {
  useReportWebVitals(captureWatchupWebVital);
  const pathname = usePathname();
  const [choice, setChoice] = useState<Choice>("loading");
  const [editing, setEditing] = useState(false);
  const posthogEnabled = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY && process.env.NEXT_PUBLIC_POSTHOG_HOST);
  const enabled = watchupEnabled || posthogEnabled;

  useEffect(() => {
    const showChoices = () => setEditing(true);
    window.addEventListener(SHOW_ANALYTICS_CHOICES_EVENT, showChoices);
    return () => window.removeEventListener(SHOW_ANALYTICS_CHOICES_EVENT, showChoices);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    queueMicrotask(() => {
      try {
        const saved = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
        setChoice(saved === "yes" || saved === "no" ? saved : "unset");
      } catch { setChoice("unset"); }
    });
  }, [enabled]);

  useEffect(() => {
    if (choice !== "yes") return;
    startPostHog();
    if (watchupEnabled) { startWatchupAnalytics(); captureWatchupPageView(pathname); }
    if (!posthogEnabled) return;
    let active = true;
    void fetch("/api/v1/telemetry-identity", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((body) => { if (!active) return; if (typeof body?.account_id === "string") identifyPostHog(body.account_id); else clearPostHogIdentity(); })
      .catch(() => {});
    return () => { active = false; };
  }, [choice, pathname, watchupEnabled, posthogEnabled]);

  useEffect(() => {
    const synchronize = (event: StorageEvent) => {
      if (event.key !== ANALYTICS_CONSENT_KEY) return;
      if (event.newValue !== "yes") { stopPostHog(); stopWatchupAnalytics(); }
      setChoice(event.newValue === "yes" || event.newValue === "no" ? event.newValue : "unset");
    };
    window.addEventListener("storage", synchronize);
    return () => window.removeEventListener("storage", synchronize);
  }, []);

  if (!enabled || choice === "loading") return null;

  const decide = (next: "yes" | "no") => {
    try { window.localStorage.setItem(ANALYTICS_CONSENT_KEY, next); } catch { return; }
    if (next === "yes") startPostHog();
    else { stopPostHog(); stopWatchupAnalytics(); }
    setChoice(next);
    setEditing(false);
  };

  if (choice !== "unset" && !editing) return null;

  return <aside className="telemetry-consent" aria-label="Analytics choices">
    <p><strong>Help improve Peekytoe?</strong> Share page visits, performance measurements and a few usage events. Drafts, messages, recordings and personal details are excluded.</p>
    <div>
      <button type="button" onClick={() => decide("no")}>No thanks</button>
      <button type="button" onClick={() => decide("yes")}>Allow analytics</button>
    </div>
  </aside>;
}
