import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/account";

export default async function InboxLayout({ children }: { children: React.ReactNode }) {
  const account = await getCurrentAccount();
  if (!account) redirect("/auth/sign-in?next=/inbox");
  if (!account.organizationName || !account.role) redirect("/onboarding");
  return children;
}
