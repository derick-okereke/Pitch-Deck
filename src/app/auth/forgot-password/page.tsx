import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetRequestForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Reset password" };
export default function ForgotPasswordPage() {
  return <AuthShell eyebrow="Account recovery" title="Reset your password." intro="Enter your email. For privacy, the response is the same whether or not an account exists."><ResetRequestForm /></AuthShell>;
}
