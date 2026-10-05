import { getVerifiedUser } from "@/lib/auth";
import { isAllowedBrowserFailure } from "@/lib/telemetry/watchup-policy";
import { captureServerFailure } from "@/lib/telemetry/watchup-server";

const MAX_EVENTS_PER_MINUTE = 5;
const eventWindows = new Map<string, { startedAt: number; count: number }>();

export async function POST(request: Request) {
  const user = await getVerifiedUser();
  if (!user) return new Response(null, { status: 401 });
  if (!process.env.WATCHUP_API_KEY) return new Response(null, { status: 204 });

  const raw = await request.text();
  if (raw.length > 256) return new Response(null, { status: 413 });
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return new Response(null, { status: 400 }); }
  if (!payload || typeof payload !== "object") return new Response(null, { status: 400 });
  const { stage, code } = payload as Record<string, unknown>;
  if (!isAllowedBrowserFailure(stage, code)) return new Response(null, { status: 400 });

  const now = Date.now();
  if (eventWindows.size > 1000) {
    for (const [accountId, bucket] of eventWindows) {
      if (now - bucket.startedAt >= 60_000) eventWindows.delete(accountId);
    }
  }
  const window = eventWindows.get(user.id);
  if (window && now - window.startedAt < 60_000) {
    if (window.count >= MAX_EVENTS_PER_MINUTE) return new Response(null, { status: 429 });
    window.count += 1;
  } else {
    eventWindows.set(user.id, { startedAt: now, count: 1 });
  }
  captureServerFailure(stage, code as string);
  return new Response(null, { status: 204 });
}
