import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Create account" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ role?: string; code?: string }> }) {
  const { role, code } = await searchParams;
  if (code) redirect(`/auth/callback?code=${encodeURIComponent(code)}`);
  return <AuthShell eyebrow="Create account" title="Choose your path." intro="Use a verified email. Your role is selected once during onboarding and controls the workspace you enter."><SignUpForm defaultRole={role === "investor" ? "investor" : "founder"} /></AuthShell>;
}
