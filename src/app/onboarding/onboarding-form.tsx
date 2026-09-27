"use client";

import { useActionState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { completeOnboarding, type OnboardingState } from "./actions";
import styles from "./onboarding.module.css";

const initialState: OnboardingState = {};

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.[0] ? <small className={styles.error}>{errors[0]}</small> : null;
}

export function OnboardingForm({
  defaultName,
  organizationLabel,
}: {
  defaultName: string;
  organizationLabel: string;
}) {
  const [state, action, pending] = useActionState(completeOnboarding, initialState);
  return (
    <form action={action} className={styles.form} noValidate>
      <label>
        <span>Your name</span>
        <input name="displayName" defaultValue={defaultName} maxLength={80} autoComplete="name" required />
        <FieldError errors={state.fieldErrors?.displayName} />
      </label>
      <label>
        <span>{organizationLabel}</span>
        <input name="organizationName" maxLength={120} autoComplete="organization" required autoFocus />
        <small>This is the name people will see in your workspace.</small>
        <FieldError errors={state.fieldErrors?.organizationName} />
      </label>
      {state.message ? <p className={styles.message} role="alert">{state.message}</p> : null}
      <button className="button button-dark" disabled={pending} type="submit">
        {pending ? <LoaderCircle className={styles.spinner} size={16} /> : null}
        Open my workspace <ArrowRight size={16} />
      </button>
    </form>
  );
}
