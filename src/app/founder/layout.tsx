import { redirect } from "next/navigation";
import { FounderShell } from "@/components/founder-shell";
import { getCurrentAccount } from "@/lib/account";
import { getFounderBillingOverview } from "@/lib/billing";

export default async function FounderLayout({ children }: { children: React.ReactNode }) {
  const account = await getCurrentAccount();
  if (!account) redirect("/auth/sign-in");
  if (!account.organizationName) redirect("/onboarding");
  if (account.role === "investor") redirect("/discover");
  const billing = await getFounderBillingOverview(account.id);
  return <FounderShell account={account} pro={billing.active}>{children}</FounderShell>;
}
