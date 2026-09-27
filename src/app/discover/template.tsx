import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/account";

export default async function DiscoveryAccountBoundary({ children }: { children: React.ReactNode }) {
  const account = await getCurrentAccount();
  if (account && !account.organizationName) redirect("/onboarding");
  return children;
}
