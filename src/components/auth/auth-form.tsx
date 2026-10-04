"use client";

import Link from "next/link";
import { useActionState, useId, useRef, useState } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { requestPasswordReset, signIn, signUp, updatePassword, type AuthFormState } from "@/app/auth/actions";
import { useFormRecovery } from "@/hooks/use-form-recovery";
import { captureProductEvent } from "@/lib/telemetry/posthog-client";

const initialState: AuthFormState = {};

function Message({ state }: { state: AuthFormState }) {
  if (!state.message) return null;
  return <p className={state.success ? "auth-message success" : "auth-message"} role={state.success ? "status" : "alert"}>{state.message}</p>;
}

function ErrorText({ errors }: { errors?: string[] }) {
  return errors?.[0] ? <small className="auth-field-error">{errors[0]}</small> : null;
}

function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return <button className="button button-dark auth-submit" type="submit" disabled={pending}>{pending ? <LoaderCircle className="auth-spinner" size={16} /> : null}{children}<ArrowRight size={16} /></button>;
}

function PasswordField({
  label,
  autoComplete,
  errors,
  showRequirements = false,
  mentionPasswordManagers = false,
}: {
  label: string;
  autoComplete: "current-password" | "new-password";
  errors?: string[];
  showRequirements?: boolean;
  mentionPasswordManagers?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [showRequirements ? hintId : null, errors?.[0] ? errorId : null].filter(Boolean).join(" ") || undefined;

  return <label htmlFor={inputId}>
    <span>{label}</span>
    <span className="auth-password-control">
      <input
        id={inputId}
        name="password"
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        minLength={showRequirements ? 8 : undefined}
        maxLength={128}
        pattern={showRequirements ? "(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,128}" : undefined}
        aria-describedby={describedBy}
        aria-invalid={errors?.[0] ? true : undefined}
        required
      />
      <button
        type="button"
        className="auth-password-toggle"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </span>
    {showRequirements ? <small id={hintId} className="auth-password-hint">Use 8–128 characters with a capital letter, number, and special character.{mentionPasswordManagers ? " Password managers and paste are supported." : ""}</small> : null}
    {errors?.[0] ? <small id={errorId} className="auth-field-error">{errors[0]}</small> : null}
  </label>;
}

export function SignUpForm({ defaultRole, next }: { defaultRole: "founder" | "investor"; next?: string | null }) {
  const [state, action, pending] = useActionState(signUp, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const { recoveredAt } = useFormRecovery({ formRef, storageKey: "pitch-deck:auth:sign-up" });
  return <form className="auth-form" action={action} noValidate ref={formRef}>
    {next ? <input type="hidden" name="next" value={next} /> : null}
    <fieldset className="auth-role-choice" onChange={(event) => { const target = event.target; if (!(target instanceof HTMLInputElement)) return; const role = target.value; if (role === "founder" || role === "investor") captureProductEvent("role_selected", { role }); }}><legend>I am joining as</legend><label><input type="radio" name="role" value="founder" defaultChecked={defaultRole === "founder"} /><span>Founder<small>Build and practise your pitch.</small></span></label><label><input type="radio" name="role" value="investor" defaultChecked={defaultRole === "investor"} /><span>Investor<small>Discover and contact founders.</small></span></label></fieldset>
    <label><span>Name</span><input name="displayName" type="text" autoComplete="name" maxLength={80} required /><ErrorText errors={state.fieldErrors?.displayName} /></label>
    <label><span>Email</span><input name="email" type="email" autoComplete="email" maxLength={254} required /><ErrorText errors={state.fieldErrors?.email} /></label>
    <PasswordField label="Password" autoComplete="new-password" errors={state.fieldErrors?.password} showRequirements mentionPasswordManagers />
    {recoveredAt ? <small className="form-recovery-note" role="status">Name, email, and role recovered from this browser. Your password was not stored.</small> : null}
    <Message state={state} /><SubmitButton pending={pending}>Create account</SubmitButton>
    <p className="auth-switch">Already have an account? <Link href={next ? `/auth/sign-in?${defaultRole === "investor" ? "role=investor&" : ""}next=${encodeURIComponent(next)}` : "/auth/sign-in"}>Sign in</Link></p>
  </form>;
}

export function SignInForm({ next, role }: { next?: string | null; role?: "investor" }) {
  const [state, action, pending] = useActionState(signIn, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const { recoveredAt } = useFormRecovery({ formRef, storageKey: "pitch-deck:auth:sign-in" });
  return <form className="auth-form" action={action} noValidate ref={formRef}>
    {next ? <input type="hidden" name="next" value={next} /> : null}
    <label><span>Email</span><input name="email" type="email" autoComplete="email" maxLength={254} required /><ErrorText errors={state.fieldErrors?.email} /></label>
    <PasswordField label="Password" autoComplete="current-password" errors={state.fieldErrors?.password} />
    <Link className="auth-forgot" href="/auth/forgot-password">Forgot your password?</Link>
    {recoveredAt ? <small className="form-recovery-note" role="status">Your email was recovered. Passwords are never stored.</small> : null}
    <Message state={state} /><SubmitButton pending={pending}>Sign in</SubmitButton>
    <p className="auth-switch">New to Pitch Deck? <Link href={next ? `/auth/sign-up?role=${role ?? "founder"}&next=${encodeURIComponent(next)}` : "/auth/sign-up"}>Create an account</Link></p>
  </form>;
}

export function ResetRequestForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const { recoveredAt } = useFormRecovery({ formRef, storageKey: "pitch-deck:auth:reset-request" });
  return <form className="auth-form" action={action} noValidate ref={formRef}>
    <label><span>Email</span><input name="email" type="email" autoComplete="email" maxLength={254} required /><ErrorText errors={state.fieldErrors?.email} /></label>
    {recoveredAt ? <small className="form-recovery-note" role="status">Your email was recovered from this browser.</small> : null}
    <Message state={state} /><SubmitButton pending={pending}>Send reset link</SubmitButton>
    <p className="auth-switch"><Link href="/auth/sign-in">Return to sign in</Link></p>
  </form>;
}

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initialState);
  return <form className="auth-form" action={action} noValidate>
    <PasswordField label="New password" autoComplete="new-password" errors={state.fieldErrors?.password} showRequirements />
    <Message state={state} /><SubmitButton pending={pending}>Update password</SubmitButton>
  </form>;
}
