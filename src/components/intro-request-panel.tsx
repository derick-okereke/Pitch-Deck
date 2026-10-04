"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleAlert, LoaderCircle, LockKeyhole, MessageSquareText, X } from "lucide-react";
import styles from "./intro-request-panel.module.css";
import { captureBrowserFailure } from "@/lib/telemetry/watchup-browser";
import { captureProductEvent } from "@/lib/telemetry/posthog-client";

type Props = {
  startupId: string;
  startupName: string;
  existingConversationId: string | null;
  canRequest: boolean;
  illustrative?: boolean;
};

export function IntroRequestPanel({ startupId, startupName, existingConversationId, canRequest, illustrative = false }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [restored, setRestored] = useState(false);
  const storageKey = `pitch-deck:intro-draft:${startupId}`;

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setNote(window.localStorage.getItem(storageKey) ?? "");
      setRestored(true);
    });
    return () => { active = false; };
  }, [storageKey]);
  useEffect(() => {
    if (!restored) return;
    if (note) window.localStorage.setItem(storageKey, note);
    else window.localStorage.removeItem(storageKey);
  }, [note, restored, storageKey]);

  const open = () => {
    setError("");
    dialogRef.current?.showModal();
  };
  const close = () => {
    if (sending) return;
    dialogRef.current?.close();
    openerRef.current?.focus();
  };
  const send = async () => {
    const trimmed = note.trim();
    if (trimmed.length < 20) {
      setError("Write at least 20 characters so the founder understands your interest.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/v1/intros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startup_id: startupId, note: trimmed, client_message_id: crypto.randomUUID() }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error?.field_errors?.note ?? result.error?.message ?? "The introduction could not be sent. Your note is still saved here.");
        return;
      }
      window.localStorage.removeItem(storageKey);
      if (result.data.created) captureProductEvent("intro_sent");
      dialogRef.current?.close();
      router.push(`/inbox/${result.data.conversation_id}`);
      router.refresh();
    } catch {
      captureBrowserFailure("intro_request", "INTRO_REQUEST_CLIENT_FAILURE");
      setError("The introduction could not reach the server. Your note is still saved here; check the connection and try again.");
    } finally {
      setSending(false);
    }
  };

  if (existingConversationId) {
    return <Link className="button button-dark" href={`/inbox/${existingConversationId}`}>Open conversation <ArrowRight size={16} /></Link>;
  }
  if (illustrative) {
    return <div className={styles.locked}><LockKeyhole size={16} /><span><strong>Illustrative profile</strong>Introductions are available only on real published profiles.</span></div>;
  }
  if (!canRequest) {
    return <div className={styles.locked}><LockKeyhole size={16} /><span><strong>Investor Pro required</strong>New introductions are a Pro feature. Investor billing is a demo preview and is not available yet.</span></div>;
  }

  return <>
    <button ref={openerRef} type="button" className="button button-dark" onClick={open}><MessageSquareText size={16} /> Request introduction</button>
    <dialog ref={dialogRef} className={styles.dialog} onCancel={(event) => { event.preventDefault(); close(); }}>
      <div className={styles.dialogHeader}>
        <div><span>Private introduction</span><h2>Write to {startupName}.</h2></div>
        <button type="button" onClick={close} aria-label="Close introduction request"><X size={20} /></button>
      </div>
      <p className={styles.explainer}>Your note opens a private conversation immediately. The founder can reply for free; neither side’s email address is shown.</p>
      <label className={styles.noteField}>
        <span>Why would you like to connect?</span>
        <textarea autoFocus value={note} onChange={(event) => { setNote(event.target.value); setError(""); }} maxLength={1_000} rows={7} placeholder="Share what caught your attention and what you would like to discuss." aria-describedby="intro-note-help intro-note-error" />
      </label>
      <div className={styles.noteMeta} id="intro-note-help"><span>Plain text · 20–1,000 characters</span><span>{note.length} / 1,000</span></div>
      <div className={styles.dialogActions}>
        <button type="button" className="button button-light" disabled={sending} onClick={close}>Keep as draft</button>
        <button type="button" className="button button-dark" disabled={sending} onClick={send}>{sending ? <><LoaderCircle className={styles.spinner} size={16} /> Sending request…</> : "Send request"}</button>
      </div>
      {error ? <p className={styles.error} id="intro-note-error" role="alert"><CircleAlert size={16} />{error}</p> : <p className={styles.saved} aria-live="polite">Your unfinished note stays on this device until it is sent.</p>}
    </dialog>
  </>;
}
