import Link from "next/link";
import { MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";

export default function CheckEmailPage() {
  return <AuthShell eyebrow="Verify your email" title="Check your inbox." intro="Open the confirmation message from Pitch Deck to activate your account."><div className="auth-state-card"><MailCheck size={24} /><p>The confirmation link signs you in and opens your founder dashboard or investor discovery workspace automatically. If it does not arrive, check spam first.</p><Link className="button button-dark" href="/auth/sign-in">Sign in instead</Link></div></AuthShell>;
}
