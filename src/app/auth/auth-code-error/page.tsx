import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";

export default function AuthCodeErrorPage() {
  return <AuthShell eyebrow="Link unavailable" title="That authentication link did not work." intro="It may have expired or already been used."><div className="auth-state-card error"><CircleAlert size={24} /><p>Return to sign in, or request a new password-reset message if you were recovering your account.</p><Link className="button button-dark" href="/auth/sign-in">Return to sign in</Link></div></AuthShell>;
}
