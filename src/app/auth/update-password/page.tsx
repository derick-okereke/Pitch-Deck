import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { UpdatePasswordForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Choose a new password" };
export default function UpdatePasswordPage() {
  return <AuthShell eyebrow="Account recovery" title="Choose a new password." intro="This reset session is short-lived. Use a unique password stored in your password manager."><UpdatePasswordForm /></AuthShell>;
}
