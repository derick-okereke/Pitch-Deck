import { notFound } from "next/navigation";
import { SimulatorSessionLive } from "@/components/simulator/simulator-session-live";

export function generateStaticParams() { return [{ id: "demo-session" }]; }

export default async function SimulatorSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id !== "demo-session") notFound();
  return <SimulatorSessionLive />;
}
