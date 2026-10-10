import { allowedEvents, productEventProperties, type ProductEvent } from "./posthog-policy.ts";

const pages = new Set([
  "/", "/onboarding", "/discover", "/inbox", "/inbox/[id]", "/startups/[slug]",
  "/founder", "/founder/profile/edit", "/founder/profile/preview", "/founder/reviews", "/founder/reviews/[id]",
  "/founder/billing", "/founder/billing/return", "/investor/profile",
  "/simulator/new", "/simulator/history", "/simulator/[id]", "/simulator/[id]/report",
  "/auth/sign-in", "/auth/sign-up", "/auth/forgot-password", "/auth/update-password",
  "/auth/check-email", "/auth/confirm", "/auth/auth-code-error",
]);

export function analyticsPage(pathname: string): string | null {
  const path = pathname.split(/[?#]/, 1)[0].replace(/\/$/, "") || "/";
  if (pages.has(path)) return path;
  if (/^\/startups\/[^/]+$/.test(path)) return "/startups/[slug]";
  if (/^\/inbox\/[^/]+$/.test(path)) return "/inbox/[id]";
  if (/^\/founder\/reviews\/[^/]+$/.test(path)) return "/founder/reviews/[id]";
  if (/^\/simulator\/[^/]+\/report$/.test(path)) return "/simulator/[id]/report";
  if (/^\/simulator\/[^/]+$/.test(path)) return "/simulator/[id]";
  return null;
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const vitalNames = new Set(["FCP", "LCP", "INP", "CLS", "TTFB"]);

export type WatchupAnalytics =
  | { kind: "event"; event: ProductEvent; properties: Record<string, unknown>; visitor_id: string }
  | { kind: "pageview"; path: string; visitor_id: string; session_id: string; screen_w?: number; screen_h?: number; lang?: string }
  | { kind: "vital"; path: string; name: string; value: number; visitor_id: string };

export function parseWatchupAnalytics(input: unknown): WatchupAnalytics | null {
  if (!input || typeof input !== "object") return null;
  const body = input as Record<string, unknown>;
  if (typeof body.visitor_id !== "string" || !uuid.test(body.visitor_id)) return null;
  if (body.kind === "event") {
    if (!allowedEvents.has(body.event as ProductEvent)) return null;
    const properties = body.properties && typeof body.properties === "object" ? body.properties as Record<string, unknown> : {};
    return { kind: "event", event: body.event as ProductEvent, visitor_id: body.visitor_id, properties: productEventProperties(body.event as ProductEvent, properties) };
  }
  // Only already normalized, known templates may cross the server boundary.
  if (typeof body.path !== "string" || !pages.has(body.path)) return null;
  if (body.kind === "vital") {
    if (typeof body.name !== "string" || !vitalNames.has(body.name) || typeof body.value !== "number" || !Number.isFinite(body.value) || body.value < 0 || body.value > 3_600_000) return null;
    return { kind: "vital", path: body.path, name: body.name, value: body.value, visitor_id: body.visitor_id };
  }
  if (body.kind !== "pageview" || typeof body.session_id !== "string" || !uuid.test(body.session_id)) return null;
  const dimension = (value: unknown) => typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 16_384 ? value : undefined;
  return {
    kind: "pageview", path: body.path, visitor_id: body.visitor_id, session_id: body.session_id,
    screen_w: dimension(body.screen_w), screen_h: dimension(body.screen_h),
    lang: typeof body.lang === "string" && /^[a-z]{2,3}(?:-[a-z0-9]{2,8}){0,3}$/i.test(body.lang) ? body.lang : undefined,
  };
}
