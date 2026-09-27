"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

type StoredForm = {
  version: 1;
  updatedAt: number;
  values: Record<string, string>;
};

type RecoveryOptions = {
  formRef: RefObject<HTMLFormElement | null>;
  storageKey: string;
  onRecover?: (values: Record<string, string>) => void;
};

function eligible(element: Element): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) return false;
  if (!element.name || element.disabled) return false;
  if (element instanceof HTMLInputElement && ["password", "file", "hidden", "submit", "button", "reset"].includes(element.type)) return false;
  return true;
}

function capture(form: HTMLFormElement) {
  const values: Record<string, string> = {};
  for (const element of Array.from(form.elements)) {
    if (!eligible(element)) continue;
    if (element instanceof HTMLInputElement && element.type === "radio") {
      if (element.checked) values[element.name] = element.value;
      continue;
    }
    if (element instanceof HTMLInputElement && element.type === "checkbox") {
      values[element.name] = element.checked ? element.value || "on" : "";
      continue;
    }
    values[element.name] = element.value;
  }
  return values;
}

function restore(form: HTMLFormElement, values: Record<string, string>, skipNames?: Set<string>) {
  for (const element of Array.from(form.elements)) {
    if (!eligible(element) || !(element.name in values) || skipNames?.has(element.name)) continue;
    const value = values[element.name];
    if (element instanceof HTMLInputElement && element.type === "radio") element.checked = element.value === value;
    else if (element instanceof HTMLInputElement && element.type === "checkbox") element.checked = value !== "";
    else element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

export function useFormRecovery({ formRef, storageKey, onRecover }: RecoveryOptions) {
  const [recoveredAt, setRecoveredAt] = useState<number | null>(null);
  const callbackRef = useRef(onRecover);

  useEffect(() => {
    callbackRef.current = onRecover;
  }, [onRecover]);

  const clearRecovery = useCallback(() => {
    try { window.localStorage.removeItem(storageKey); } catch { /* Storage can be unavailable in private browsing. */ }
    setRecoveredAt(null);
  }, [storageKey]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    let saved: StoredForm | null = null;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StoredForm>;
        if (parsed.version === 1 && parsed.values && typeof parsed.updatedAt === "number") saved = parsed as StoredForm;
      }
    } catch { /* A corrupt or unavailable local store should never block the form. */ }

    const timers: number[] = [];
    const touchedNames = new Set<string>();
    if (saved) {
      callbackRef.current?.(saved.values);
      restore(form, saved.values);
      const apply = () => restore(form, saved!.values, touchedNames);
      timers.push(window.setTimeout(apply, 60), window.setTimeout(apply, 240));
      setRecoveredAt(saved.updatedAt);
    }

    let saveTimer: number | null = null;
    const save = (event: Event) => {
      if (event.target instanceof Element && eligible(event.target)) touchedNames.add(event.target.name);
      if (saveTimer !== null) window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        try {
          const payload: StoredForm = { version: 1, updatedAt: Date.now(), values: capture(form) };
          window.localStorage.setItem(storageKey, JSON.stringify(payload));
        } catch { /* Keep the live form usable if browser storage is full or blocked. */ }
      }, 180);
    };
    form.addEventListener("input", save);
    form.addEventListener("change", save);
    return () => {
      form.removeEventListener("input", save);
      form.removeEventListener("change", save);
      timers.forEach((timer) => window.clearTimeout(timer));
      if (saveTimer !== null) window.clearTimeout(saveTimer);
    };
  }, [formRef, storageKey]);

  return { clearRecovery, recoveredAt };
}
