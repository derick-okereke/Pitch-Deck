"use client";

import { useState } from "react";
import { ArrowUpRight, CircleAlert, LoaderCircle } from "lucide-react";

export function UpgradeButton() {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function startCheckout() {
    setState("loading");
    setMessage("");
    try {
      const response = await fetch("/api/v1/billing/checkout", { method: "POST", headers: { Accept: "application/json" } });
      const payload = await response.json();
      const checkoutUrl = payload?.data?.checkout_url;
      if (!response.ok || typeof checkoutUrl !== "string") throw new Error(payload?.error?.message || "The sandbox checkout could not be started.");
      window.location.assign(checkoutUrl);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "The sandbox checkout could not be started.");
    }
  }

  return (
    <div className="billing-upgrade-action">
      <button className="button button-dark" disabled={state === "loading"} onClick={startCheckout} type="button">
        {state === "loading" ? <LoaderCircle className="spin" size={17} /> : <ArrowUpRight size={17} />}
        {state === "loading" ? "Opening secure checkout…" : "Continue to sandbox checkout"}
      </button>
      {state === "error" ? <p className="billing-action-error" role="alert"><CircleAlert size={15} />{message}</p> : null}
    </div>
  );
}
