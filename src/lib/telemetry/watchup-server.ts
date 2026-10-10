import "server-only";

import { getWatchup, initWatchup } from "@watchupltd/nextjs/server";
import { unhandledErrorRoute } from "@/lib/telemetry/watchup-route";
import { observeWatchupHandler } from "@/lib/telemetry/watchup-handler";

type ServerStage = "billing_checkout" | "billing_webhook" | "founder_profile" | "server_unhandled"
  | "profile_save" | "intro_request" | "billing_return" | "simulator_step";

export function initializeWatchup() {
  if (!process.env.WATCHUP_API_KEY) return;
  initWatchup({
    apiKey: process.env.WATCHUP_API_KEY,
    environment: process.env.NODE_ENV,
    release: process.env.GIT_SHA,
    logging: { enabled: true, captureConsole: false },
  });
}

export function withWatchupRequest<Args extends unknown[]>(route: string, method: string, handler: (...args: Args) => Response | Promise<Response>) {
  return observeWatchupHandler(handler, () => {
    if (!process.env.WATCHUP_API_KEY) return () => {};
    initializeWatchup();
    const watchup = getWatchup();
    const started = performance.now();
    let statusCode = 200;
    let onFinish: (() => void) | undefined;
    // The SDK middleware preserves the exact HTTP status. Pass only a fixed
    // template, never the request (cookies, query strings, bodies, or IDs).
    watchup.requestMiddleware()(
      { method, baseUrl: "", route: { path: route } },
      { get statusCode() { return statusCode; }, on: (_event: string, listener: () => void) => { onFinish = listener; } },
      () => {},
    );
    return (status: number) => {
      statusCode = status;
      onFinish?.();
      watchup.captureLog("REQUEST_COMPLETED", {
        level: status >= 500 ? "error" : status >= 400 ? "warning" : "info",
        route, method, status_code: status, ms: Math.round(performance.now() - started),
      });
    };
  });
}

export function captureWatchupEvent(name: string, properties: Record<string, unknown>) {
  if (!process.env.WATCHUP_API_KEY) return;
  try {
    initializeWatchup();
    getWatchup().track(name, properties);
  } catch { /* optional analytics */ }
}

export function captureServerFailure(stage: ServerStage, code: string) {
  captureFixedFailure(stage, code, stage);
}

export function captureUnhandledServerFailure(routePath: unknown, routeType: unknown) {
  captureFixedFailure("server_unhandled", "UNHANDLED_SERVER_ERROR", unhandledErrorRoute(routePath, routeType));
}

function captureFixedFailure(stage: ServerStage, code: string, route: string) {
  if (!process.env.WATCHUP_API_KEY) return;
  try {
    initializeWatchup();
    getWatchup().captureError(new Error(/^[A-Z_]{1,64}$/.test(code) ? code : "SERVER_OPERATION_FAILED"), {
      route,
      level: "error",
    });
  } catch {
    // A monitoring outage cannot change an operational response.
  }
}
