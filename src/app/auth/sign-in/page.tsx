import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/auth-form";
import { getCurrentAccount } from "@/lib/account";
import { postAuthDestination, safeAuthNext } from "@/lib/auth-redirect";

export const metadata: Metadata = { title: "Sign in" };
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeAuthNext((await searchParams).next);
  const account = await getCurrentAccount();
  if (account) redirect(postAuthDestination(account, next));
  return <AuthShell eyebrow="Welcome back" title="Continue where you left off." intro="Sign in to your private founder or investor workspace."><SignInForm next={next} /></AuthShell>;
}
