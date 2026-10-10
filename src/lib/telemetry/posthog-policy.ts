import type { CaptureResult } from "posthog-js";

export type ProductEvent =
  | "role_selected"
  | "founder_draft_saved"
  | "profile_review_finished"
  | "session_step_completed"
  | "intro_sent"
  | "checkout_started"
  | "checkout_verified";

export const allowedEvents = new Set<ProductEvent>([
  "role_selected", "founder_draft_saved", "profile_review_finished", "session_step_completed",
  "intro_sent", "checkout_started", "checkout_verified",
]);

export function productEventProperties(event: ProductEvent, properties: Record<string, unknown> = {}) {
  return {
    ...(event === "role_selected" && (properties.role === "founder" || properties.role === "investor") ? { role: properties.role } : {}),
    ...(event === "session_step_completed" && (properties.step === "pitch" || properties.step === "answer" || properties.step === "report") ? { step: properties.step } : {}),
  };
}

export function beforeSendProductEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event || (!allowedEvents.has(event.event as ProductEvent) && event.event !== "$identify")) return null;
  const properties = event.properties ?? {};
  return {
    ...event,
    properties: {
      token: properties.token,
      distinct_id: properties.distinct_id,
      ...(event.event === "$identify" ? { $anon_distinct_id: properties.$anon_distinct_id } : {}),
      ...productEventProperties(event.event as ProductEvent, properties),
    },
    $set: undefined,
    $set_once: undefined,
  };
}
