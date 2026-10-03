import { SimulatorSetupLive } from "@/components/simulator/simulator-setup-live";
import { getFounderWorkspace } from "@/lib/founder-profile";
import { createClient } from "@/lib/supabase/server";

export default async function NewSimulatorSessionPage() {
  const workspace = await getFounderWorkspace();
  const supabase = await createClient();
  const [{ data: reservations }, { data: sessions }] = await Promise.all([
    supabase.from("usage_reservations").select("state, expires_at"),
    supabase.from("simulator_sessions").select("id, state, state_version, expires_at").order("started_at", { ascending: false }).limit(10),
  ]);
  const now = Date.now();
  const used = reservations?.filter((reservation) => reservation.state === "consumed" || (reservation.state === "reserved" && Date.parse(reservation.expires_at) > now)).length ?? 0;
  const active = sessions?.find((session) => !["completed", "failed", "cancelled", "expired"].includes(session.state) && Date.parse(session.expires_at) > now) ?? null;
  const expiredSession = sessions?.some((session) => !["completed", "failed", "cancelled", "expired"].includes(session.state) && Date.parse(session.expires_at) <= now) ?? false;
  return (
    <SimulatorSetupLive
      activeSession={active}
      draftVersion={workspace.draftVersion}
      expiredSession={expiredSession}
      remainingFree={Math.max(0, 3 - used)}
      startupId={workspace.startupId}
      workspaceUnavailable={workspace.loadError}
    />
  );
}
