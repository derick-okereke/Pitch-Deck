import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/account";

export default async function InvestorLayout({ children }: { children: React.ReactNode }) {
  const account = await getCurrentAccount();
  if (!account) redirect("/auth/sign-in?next=/investor/profile");
  if (!account.organizationName) redirect("/onboarding");
  if (account.role !== "investor") redirect("/founder");
  return children;
}
