"use client";

import { useActionState, useRef } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { completeOnboarding, type OnboardingState } from "./actions";
import styles from "./onboarding.module.css";
import { useFormRecovery } from "@/hooks/use-form-recovery";

const initialState: OnboardingState = {};

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.[0] ? <small className={styles.error}>{errors[0]}</small> : null;
}

export function OnboardingForm({
  defaultName,
  organizationLabel,
  recoveryKey,
}: {
  defaultName: string;
  organizationLabel: string;
  recoveryKey: string;
}) {
  const [state, action, pending] = useActionState(completeOnboarding, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const { recoveredAt } = useFormRecovery({ formRef, storageKey: recoveryKey });
  return (
    <form action={action} className={styles.form} noValidate ref={formRef}>
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
      {recoveredAt ? <small className={styles.recovered} role="status">Your unfinished workspace details were recovered from this browser.</small> : null}
      {state.message ? <p className={styles.message} role="alert">{state.message}</p> : null}
      <button className="button button-dark" disabled={pending} type="submit">
        {pending ? <LoaderCircle className={styles.spinner} size={16} /> : null}
        Open my workspace <ArrowRight size={16} />
      </button>
    </form>
  );
}
