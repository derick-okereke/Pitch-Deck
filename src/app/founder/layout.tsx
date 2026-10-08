import { redirect } from "next/navigation";
import { FounderShell } from "@/components/founder-shell";
import { getCurrentAccount } from "@/lib/account";
import { getFounderBillingOverview } from "@/lib/billing";
import { getUnreadConversationCount } from "@/lib/conversation-data";

export default async function FounderLayout({ children }: { children: React.ReactNode }) {
  const account = await getCurrentAccount();
  if (!account) redirect("/auth/sign-in");
  if (!account.organizationName) redirect("/onboarding");
  if (account.role === "investor") redirect("/discover");
  const [billing, unreadCount] = await Promise.all([
    getFounderBillingOverview(account.id),
    getUnreadConversationCount().catch(() => null),
  ]);
  return <FounderShell account={account} pro={billing.active} initialUnreadCount={unreadCount}>{children}</FounderShell>;
}
