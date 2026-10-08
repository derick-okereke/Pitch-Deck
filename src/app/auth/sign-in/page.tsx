import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/auth-form";
import { getCurrentAccount } from "@/lib/account";
import { authEntryRole, canReuseAuthSession, postAuthDestination, safeAuthNext } from "@/lib/auth-redirect";

export const metadata: Metadata = { title: "Sign in" };
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; role?: string; link?: string }> }) {
  const { next: requested, role, link } = await searchParams;
  const next = safeAuthNext(requested);
  const entryRole = authEntryRole(role, next);
  const account = await getCurrentAccount();
  if (account && canReuseAuthSession(account.role, entryRole)) redirect(postAuthDestination(account, next));
  return <AuthShell eyebrow="Welcome back" title={entryRole ? `Sign in as ${entryRole === "investor" ? "an investor" : "a founder"}.` : "Continue where you left off."} intro={link === "session-unavailable" ? "Your email link opened, but we could not sign you in automatically. If your address was confirmed, sign in with the password you chose." : entryRole === "investor" ? "Use an investor account to explore startups." : entryRole === "founder" ? "Use a founder account to practise your pitch." : "Sign in to your private founder or investor workspace."}><SignInForm next={next} role={entryRole ?? undefined} /></AuthShell>;
}
