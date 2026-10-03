import { SimulatorSetupLive } from "@/components/simulator/simulator-setup-live";
import { getFounderBillingOverview } from "@/lib/billing";
import { getFounderWorkspace } from "@/lib/founder-profile";
import { createClient } from "@/lib/supabase/server";

export default async function NewSimulatorSessionPage() {
  const workspace = await getFounderWorkspace();
  const billing = await getFounderBillingOverview(workspace.ownerId);
  const supabase = await createClient();
  const [{ data: reservations }, { data: sessions }, { data: reports, error: reportsError }] = await Promise.all([
    supabase.from("usage_reservations").select("state, expires_at"),
    supabase.from("simulator_sessions").select("id, state, state_version, expires_at").order("started_at", { ascending: false }).limit(10),
    supabase.from("simulator_reports").select("session_id, session_points, created_at").order("created_at", { ascending: false }).limit(3),
  ]);
  // Request-time expiry is intentional; session reservations are time-sensitive server data.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const used = reservations?.filter((reservation) => reservation.state === "consumed" || (reservation.state === "reserved" && Date.parse(reservation.expires_at) > now)).length ?? 0;
  const active = sessions?.find((session) => !["completed", "failed", "cancelled", "expired"].includes(session.state) && Date.parse(session.expires_at) > now) ?? null;
  const expiredSession = sessions?.some((session) => !["completed", "failed", "cancelled", "expired"].includes(session.state) && Date.parse(session.expires_at) <= now) ?? false;
  return (
    <SimulatorSetupLive
      activeSession={active}
      draftVersion={workspace.draftVersion}
      expiredSession={expiredSession}
      isPro={billing.active}
      remainingFree={Math.max(0, 3 - used)}
      recentReports={reports ?? []}
      reportsUnavailable={Boolean(reportsError)}
      startupId={workspace.startupId}
      workspaceUnavailable={workspace.loadError}
    />
  );
}
