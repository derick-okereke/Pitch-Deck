"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BadgeCheck, CircleAlert, LoaderCircle } from "lucide-react";
import { captureBrowserFailure } from "@/lib/telemetry/watchup-browser";
import { captureProductEvent } from "@/lib/telemetry/posthog-client";

type Status = "pending" | "active" | "error";

export function ReturnStatus({ checkoutId }: { checkoutId: string }) {
  const [status, setStatus] = useState<Status>("pending");

  useEffect(() => {
    let stopped = false;
    let attempts = 0;
    async function check() {
      attempts += 1;
      try {
        const response = await fetch(`/api/v1/billing/status?checkout_id=${encodeURIComponent(checkoutId)}`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error();
        if (payload?.data?.active) { if (!stopped) { captureProductEvent("checkout_verified"); setStatus("active"); } return; }
      } catch { if (!stopped) { captureBrowserFailure("billing_return", "CHECKOUT_STATUS_FAILURE"); setStatus("error"); } return; }
      if (!stopped && attempts < 15) window.setTimeout(check, 2000);
    }
    void check();
    return () => { stopped = true; };
  }, [checkoutId]);

  if (status === "active") return <div className="return-state return-success"><BadgeCheck size={30} /><p className="eyebrow">Payment verified</p><h1>Founder Pro is active.</h1><p>Bachs confirmed the sandbox subscription and its paid period. Your next simulator session will snapshot the Pro tier.</p><Link className="button button-dark" href="/simulator/new">Prepare a Pro session <ArrowRight size={16} /></Link></div>;
  if (status === "error") return <div className="return-state"><CircleAlert size={30} /><p className="eyebrow">Status unavailable</p><h1>Your payment evidence is safe.</h1><p>We could not read the latest verification state. Do not repeat checkout; return to the plan page and check again.</p><Link className="button button-light" href="/founder/billing">Return to plan</Link></div>;
  return <div className="return-state"><LoaderCircle className="spin" size={30} /><p className="eyebrow">Confirming sandbox payment</p><h1>Waiting for the signed event.</h1><p>Bachs has returned you to Peekytoe. Founder Pro activates only after the webhook and checkout record agree.</p><Link className="inline-link" href="/founder/billing">Check plan manually <ArrowRight size={14} /></Link></div>;
}
