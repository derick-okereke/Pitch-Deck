import Link from "next/link";
import { MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { safeAuthNext } from "@/lib/auth-redirect";

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeAuthNext((await searchParams).next);
  const investorNext = next === "/discover" || next === "/investor/profile";
  const signInHref = next ? `/auth/sign-in?${investorNext ? "role=investor&" : ""}next=${encodeURIComponent(next)}` : "/auth/sign-in";
  return <AuthShell eyebrow="Verify your email" title="Check your inbox." intro="Open the confirmation message from Peekytoe to activate your account."><div className="auth-state-card"><MailCheck size={24} /><p>The confirmation link signs you in and opens the workspace or practice step you chose. If it does not arrive, check spam first.</p><Link className="button button-dark" href={signInHref}>Sign in instead</Link></div></AuthShell>;
}
