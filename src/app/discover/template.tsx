import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/account";

export default async function DiscoveryAccountBoundary({ children }: { children: React.ReactNode }) {
  const account = await getCurrentAccount();
  if (!account) redirect("/auth/sign-in?next=/discover");
  if (account.role !== "investor") redirect("/auth/sign-in?role=investor&next=/discover");
  if (!account.organizationName) redirect("/onboarding");
  return children;
}
