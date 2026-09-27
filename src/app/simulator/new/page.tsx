import { SimulatorSetupLive } from "@/components/simulator/simulator-setup-live";
import { getFounderWorkspace } from "@/lib/founder-profile";
import { createClient } from "@/lib/supabase/server";

export default async function NewSimulatorSessionPage() {
  const workspace = await getFounderWorkspace();
  const supabase = await createClient();
  const [{ data: reservations }, { data: sessions }] = await Promise.all([
    supabase.from("usage_reservations").select("state"),
    supabase.from("simulator_sessions").select("id, state, state_version").order("started_at", { ascending: false }).limit(10),
  ]);
  const used = reservations?.filter((reservation) => reservation.state === "reserved" || reservation.state === "consumed").length ?? 0;
  const active = sessions?.find((session) => !["completed", "failed", "cancelled", "expired"].includes(session.state)) ?? null;
  return (
    <SimulatorSetupLive
      activeSession={active}
      draftVersion={workspace.draftVersion}
      remainingFree={Math.max(0, 3 - used)}
      startupId={workspace.startupId}
      workspaceUnavailable={workspace.loadError}
    />
  );
}
