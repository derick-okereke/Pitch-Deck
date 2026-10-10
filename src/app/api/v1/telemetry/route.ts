import { createHash } from "node:crypto";
import { parseWatchupAnalytics } from "@/lib/telemetry/watchup-analytics-policy";
import { captureWatchupEvent } from "@/lib/telemetry/watchup-server";
import { applicationOrigin } from "@/lib/site-url";

export const runtime = "nodejs";
const windows = new Map<string, { start: number; count: number }>();

export async function POST(request: Request) {
  // Pxxl proxies can expose an internal localhost URL to the route handler.
  const origin = applicationOrigin();
  if (request.headers.get("origin") !== origin) return new Response(null, { status: 403 });
  if (!process.env.WATCHUP_API_KEY) return new Response(null, { status: 204 });
  const now = Date.now();
  for (const [key, window] of windows) if (now - window.start >= 60_000) windows.delete(key);
  // Rate-limit anonymous traffic without retaining IP addresses or sending them to WatchUp.
  const key = createHash("sha256").update(request.headers.get("x-forwarded-for")?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "anonymous").digest("hex");
  const window = windows.get(key);
  if ((window && window.count >= 120) || (!window && windows.size >= 2048)) return new Response(null, { status: 429 });
  windows.set(key, { start: window?.start ?? now, count: (window?.count ?? 0) + 1 });

  // Bound the body while reading it, including requests without Content-Length.
  const reader = request.body?.getReader();
  if (!reader) return new Response(null, { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2048) { await reader.cancel(); return new Response(null, { status: 413 }); }
      chunks.push(value);
    }
  } catch { return new Response(null, { status: 400 }); }
  let input: unknown;
  try { input = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return new Response(null, { status: 400 }); }
  const payload = parseWatchupAnalytics(input);
  if (!payload) return new Response(null, { status: 400 });
  if (payload.kind === "event") {
    captureWatchupEvent(payload.event, payload.properties);
  } else if (payload.kind === "vital") {
    captureWatchupEvent("web_vital", { route: payload.path, metric: payload.name, value: payload.value, unit: payload.name === "CLS" ? "score" : "ms" });
  } else {
    const { path, visitor_id, session_id, screen_w, screen_h, lang } = payload;
    try {
      // Official browser SDK wire format; the private key never reaches the browser.
      const userAgent = request.headers.get("user-agent")?.slice(0, 512);
      await fetch("https://api.watchup.site/api/v1/ingest/web-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Api-Key": process.env.WATCHUP_API_KEY, ...(userAgent ? { "User-Agent": userAgent } : {}) },
        body: JSON.stringify({ web: [{ path, visitor_id, session_id, screen_w, screen_h, lang, hostname: new URL(origin).hostname, event_name: "pageview", occurred_at: new Date().toISOString() }] }),
        signal: AbortSignal.timeout(3000),
      });
    } catch { /* best-effort analytics */ }
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
