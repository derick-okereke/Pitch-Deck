"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ANALYTICS_CONSENT_KEY, clearPostHogIdentity, identifyPostHog, startPostHog, stopPostHog } from "@/lib/telemetry/posthog-client";

type Choice = "loading" | "unset" | "yes" | "no";

export function TelemetryConsent() {
  const pathname = usePathname();
  const [choice, setChoice] = useState<Choice>("loading");
  const [editing, setEditing] = useState(false);
  const enabled = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY && process.env.NEXT_PUBLIC_POSTHOG_HOST);

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
    let active = true;
    void fetch("/api/v1/telemetry-identity", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((body) => { if (!active) return; if (typeof body?.account_id === "string") identifyPostHog(body.account_id); else clearPostHogIdentity(); })
      .catch(() => {});
    return () => { active = false; };
  }, [choice, pathname]);

  if (!enabled || choice === "loading") return null;

  const decide = (next: "yes" | "no") => {
    try { window.localStorage.setItem(ANALYTICS_CONSENT_KEY, next); } catch { return; }
    if (next === "no") stopPostHog();
    setChoice(next);
    setEditing(false);
  };

  if (choice !== "unset" && !editing) {
    return <button className="telemetry-preferences" type="button" onClick={() => setEditing(true)}>Analytics choices</button>;
  }

  return <aside className="telemetry-consent" aria-label="Analytics choices">
    <p><strong>Help improve Pitch Deck?</strong> Share a few usage events. Drafts, messages, recordings and page addresses are excluded.</p>
    <div>
      <button type="button" onClick={() => decide("no")}>No thanks</button>
      <button type="button" onClick={() => decide("yes")}>Allow analytics</button>
    </div>
  </aside>;
}
