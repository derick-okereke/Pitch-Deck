import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Sign in" };
export default function SignInPage() {
  return <AuthShell eyebrow="Welcome back" title="Continue where you left off." intro="Sign in to your private founder or investor workspace."><SignInForm /></AuthShell>;
}
