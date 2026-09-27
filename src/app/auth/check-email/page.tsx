import Link from "next/link";
import { MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";

export default function CheckEmailPage() {
  return <AuthShell eyebrow="Verify your email" title="Check your inbox." intro="Open the confirmation message from Pitch Deck to activate your account."><div className="auth-state-card"><MailCheck size={24} /><p>The link returns you securely to this application. If it does not arrive, check spam before requesting another message.</p><Link className="button button-dark" href="/auth/sign-in">Return to sign in</Link></div></AuthShell>;
}
