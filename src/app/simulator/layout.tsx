import { redirect } from "next/navigation";
import { FounderShell } from "@/components/founder-shell";
import { getCurrentAccount } from "@/lib/account";

export default async function SimulatorLayout({ children }: { children: React.ReactNode }) {
  const account = await getCurrentAccount();
  if (!account) redirect("/auth/sign-in");
  if (!account.organizationName) redirect("/onboarding");
  if (account.role === "investor") redirect("/discover");
  return <FounderShell account={account}>{children}</FounderShell>;
}
