"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { requestPasswordReset, signIn, signUp, updatePassword, type AuthFormState } from "@/app/auth/actions";

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

export function SignUpForm({ defaultRole }: { defaultRole: "founder" | "investor" }) {
  const [state, action, pending] = useActionState(signUp, initialState);
  return <form className="auth-form" action={action} noValidate>
    <fieldset className="auth-role-choice"><legend>I am joining as</legend><label><input type="radio" name="role" value="founder" defaultChecked={defaultRole === "founder"} /><span>Founder<small>Build and practise your pitch.</small></span></label><label><input type="radio" name="role" value="investor" defaultChecked={defaultRole === "investor"} /><span>Investor<small>Discover and contact founders.</small></span></label></fieldset>
    <label><span>Name</span><input name="displayName" type="text" autoComplete="name" maxLength={80} required /><ErrorText errors={state.fieldErrors?.displayName} /></label>
    <label><span>Email</span><input name="email" type="email" autoComplete="email" maxLength={254} required /><ErrorText errors={state.fieldErrors?.email} /></label>
    <label><span>Password</span><input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /><small>Use 12–128 characters. Password managers and paste are supported.</small><ErrorText errors={state.fieldErrors?.password} /></label>
    <Message state={state} /><SubmitButton pending={pending}>Create account</SubmitButton>
    <p className="auth-switch">Already have an account? <Link href="/auth/sign-in">Sign in</Link></p>
  </form>;
}

export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, initialState);
  return <form className="auth-form" action={action} noValidate>
    <label><span>Email</span><input name="email" type="email" autoComplete="email" maxLength={254} required /><ErrorText errors={state.fieldErrors?.email} /></label>
    <label><span>Password</span><input name="password" type="password" autoComplete="current-password" maxLength={128} required /><ErrorText errors={state.fieldErrors?.password} /></label>
    <Link className="auth-forgot" href="/auth/forgot-password">Forgot your password?</Link>
    <Message state={state} /><SubmitButton pending={pending}>Sign in</SubmitButton>
    <p className="auth-switch">New to Pitch Deck? <Link href="/auth/sign-up">Create an account</Link></p>
  </form>;
}

export function ResetRequestForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initialState);
  return <form className="auth-form" action={action} noValidate>
    <label><span>Email</span><input name="email" type="email" autoComplete="email" maxLength={254} required /><ErrorText errors={state.fieldErrors?.email} /></label>
    <Message state={state} /><SubmitButton pending={pending}>Send reset link</SubmitButton>
    <p className="auth-switch"><Link href="/auth/sign-in">Return to sign in</Link></p>
  </form>;
}

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initialState);
  return <form className="auth-form" action={action} noValidate>
    <label><span>New password</span><input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /><small>Use 12–128 characters.</small><ErrorText errors={state.fieldErrors?.password} /></label>
    <Message state={state} /><SubmitButton pending={pending}>Update password</SubmitButton>
  </form>;
}
