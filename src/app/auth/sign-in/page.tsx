import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/auth-form";
import { getCurrentAccount } from "@/lib/account";
import { postAuthDestination, safeAuthNext } from "@/lib/auth-redirect";

export const metadata: Metadata = { title: "Sign in" };
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; role?: string; link?: string }> }) {
  const { next: requested, role, link } = await searchParams;
  const next = safeAuthNext(requested);
  const investorEntry = role === "investor" && (next === "/discover" || next === "/investor/profile");
  const account = await getCurrentAccount();
  if (account && (!investorEntry || account.role === "investor")) redirect(postAuthDestination(account, next));
  return <AuthShell eyebrow="Welcome back" title={investorEntry ? "Sign in as an investor." : "Continue where you left off."} intro={link === "session-unavailable" ? "Your email link opened, but we could not sign you in automatically. If your address was confirmed, sign in with the password you chose." : investorEntry ? "Use an investor account to explore startups." : "Sign in to your private founder or investor workspace."}><SignInForm next={next} role={investorEntry ? "investor" : undefined} /></AuthShell>;
}
