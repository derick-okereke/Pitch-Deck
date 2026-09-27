import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/account";

export default async function SimulatorAuthBoundary({ children }: { children: React.ReactNode }) {
  const account = await getCurrentAccount();
  if (!account) redirect("/auth/sign-in");
  if (!account.organizationName) redirect("/onboarding");
  if (account.role === "investor") redirect("/discover");
  return children;
}
