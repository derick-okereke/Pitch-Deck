import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/account";

export default async function InvestorLayout({ children }: { children: React.ReactNode }) {
  const account = await getCurrentAccount();
  if (!account) redirect("/auth/sign-in?next=/investor/profile");
  if (account.role !== "investor") redirect("/auth/sign-in?role=investor&next=/investor/profile");
  if (!account.organizationName) redirect("/onboarding");
  return children;
}
