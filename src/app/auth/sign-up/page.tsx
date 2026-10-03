import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/auth-form";
import { getCurrentAccount } from "@/lib/account";
import { postAuthDestination, safeAuthNext } from "@/lib/auth-redirect";

export const metadata: Metadata = { title: "Create account" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ role?: string; code?: string; next?: string }> }) {
  const { role, code, next: requested } = await searchParams;
  if (code) redirect(`/auth/callback?code=${encodeURIComponent(code)}`);
  const next = safeAuthNext(requested) ?? (role === "investor" ? "/discover" : null);
  const account = await getCurrentAccount();
  if (account && !(role === "investor" && account.role !== "investor")) redirect(postAuthDestination(account, next));
  return <AuthShell eyebrow="Create account" title="Choose your path." intro="Use a verified email. Your role is selected once during onboarding and controls the workspace you enter."><SignUpForm defaultRole={role === "investor" ? "investor" : "founder"} next={next} /></AuthShell>;
}
