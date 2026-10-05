"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ban, Building2, Check, CircleAlert, ExternalLink, LoaderCircle, MessageSquareText, RefreshCw, Send, ShieldCheck, Undo2, WifiOff } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import type { CurrentAccount } from "@/lib/account";
import type { ConversationDetail, ConversationMessage, ConversationSummary } from "@/lib/conversation";
import { createClient } from "@/lib/supabase/client";
import styles from "./inbox-shell.module.css";

type LocalMessage = ConversationMessage & { status?: "sending" | "failed" };

function when(value: string) {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(date);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(date);
}

function mergeMessages(current: LocalMessage[], incoming: ConversationMessage[]) {
  const map = new Map<string, LocalMessage>();
  for (const message of current) map.set(message.clientMessageId || message.id, message);
  for (const message of incoming) map.set(message.clientMessageId || message.id, message);
  return [...map.values()].sort((a, b) => a.sequence - b.sequence || Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

export function InboxShell({ account, conversations, detail, loadError }: {
  account: CurrentAccount;
  conversations: ConversationSummary[];
  detail: ConversationDetail | null;
  loadError: boolean;
}) {
  const router = useRouter();
  const historyRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<LocalMessage[]>(detail?.messages ?? []);
  const [draft, setDraft] = useState("");
  const [draftRestored, setDraftRestored] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [connection, setConnection] = useState<"live" | "reconnecting" | "offline">("reconnecting");
  const [blocked, setBlocked] = useState(detail?.blocked ?? false);
  const [blockedByMe, setBlockedByMe] = useState(detail?.blockedByMe ?? false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const storageKey = detail ? `pitch-deck:message-draft:${detail.id}` : "";
  const highestSequence = useMemo(() => Math.max(0, ...messages.filter((message) => !message.status).map((message) => message.sequence)), [messages]);

  useEffect(() => {
    if (!storageKey) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setDraft(window.localStorage.getItem(storageKey) ?? "");
      setDraftRestored(true);
    });
    return () => { active = false; };
  }, [storageKey]);
  useEffect(() => {
    if (!storageKey || !draftRestored) return;
    if (draft) window.localStorage.setItem(storageKey, draft);
    else window.localStorage.removeItem(storageKey);
  }, [draft, draftRestored, storageKey]);
  useEffect(() => {
    historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight });
  }, [messages.length]);

  const markRead = async (sequence: number) => {
    if (!detail || sequence < 1) return;
    await fetch(`/api/v1/conversations/${detail.id}/read`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ last_read_sequence: sequence }) }).catch(() => undefined);
  };

  const refreshMessages = async () => {
    if (!detail || document.visibilityState !== "visible") return;
    try {
      const response = await fetch(`/api/v1/conversations/${detail.id}/messages`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error();
      setMessages((current) => mergeMessages(current.filter((message) => message.status !== "sending"), result.data.messages));
      setBlocked(result.data.blocked);
      setBlockedByMe(result.data.blocked_by_me);
      setConnection("live");
      await markRead(result.data.highest_sequence);
      router.refresh();
    } catch {
      setConnection(navigator.onLine ? "reconnecting" : "offline");
    }
  };

  useEffect(() => {
    if (!detail) return;
    void markRead(detail.highestSequence);
    const supabase = createClient();
    const channel = supabase.channel(`conversation:${detail.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${detail.id}` }, () => { void refreshMessages(); })
      .subscribe((status) => setConnection(status === "SUBSCRIBED" ? "live" : navigator.onLine ? "reconnecting" : "offline"));
    const interval = window.setInterval(() => { void refreshMessages(); }, 5_000);
    const onOnline = () => { setConnection("reconnecting"); void refreshMessages(); };
    const onOffline = () => setConnection("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      void supabase.removeChannel(channel);
    };
    // The active conversation owns one subscription; refreshMessages intentionally reads the latest closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.id]);

  const postMessage = async (body: string, clientMessageId: string) => {
    if (!detail) return;
    setMessages((current) => mergeMessages(current.filter((message) => message.clientMessageId !== clientMessageId), [{
      id: `pending:${clientMessageId}`,
      clientMessageId,
      senderId: detail.currentUserId,
      sequence: Math.max(detail.highestSequence, highestSequence) + 1,
      body,
      createdAt: new Date().toISOString(),
    }]).map((message) => message.clientMessageId === clientMessageId ? { ...message, status: "sending" } : message));
    setFeedback("");
    try {
      const response = await fetch(`/api/v1/conversations/${detail.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, client_message_id: clientMessageId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "The message could not be sent.");
      setMessages((current) => mergeMessages(current.filter((message) => message.clientMessageId !== clientMessageId), [result.data]));
      setDraft("");
      setConnection("live");
      await markRead(result.data.sequence);
      router.refresh();
    } catch (error) {
      setMessages((current) => current.map((message) => message.clientMessageId === clientMessageId ? { ...message, status: "failed" } : message));
      setFeedback(error instanceof Error ? error.message : "The message could not be sent. Your text is still available below.");
    }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body) { setFeedback("Write a message before sending."); return; }
    if (body.length > 2_000) { setFeedback("Keep the message under 2,000 characters."); return; }
    void postMessage(body, crypto.randomUUID());
  };

  const retry = (message: LocalMessage) => {
    setDraft(message.body);
    void postMessage(message.body, message.clientMessageId);
  };

  const changeBlock = async (next: boolean) => {
    if (!detail) return;
    setBlocking(true);
    setFeedback("");
    try {
      const response = await fetch(`/api/v1/conversations/${detail.id}/block`, { method: next ? "POST" : "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "The block setting could not be changed.");
      setBlocked(result.data.blocked);
      setBlockedByMe(result.data.blocked_by_me);
      setConfirmBlock(false);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "The block setting could not be changed.");
    } finally { setBlocking(false); }
  };

  return <div className="page-canvas"><div className="page-shell">
    <section className="app-panel">
      <SiteHeader investorWorkspace={account.role === "investor"} activeInvestorPage={account.role === "investor" ? "inbox" : undefined} investorHref={account.role === "founder" ? "/auth/sign-in?role=investor&next=/discover" : "/discover"} workspaceHref={account.role === "founder" ? "/founder" : "/investor/profile"} workspaceLabel={account.role === "founder" ? "Founder dashboard" : "Investor workspace"} />
      <div className={styles.heading}><div><h1>Private conversations, with context intact.</h1><p>Introductions stay attached to the startup that opened them. Direct contact details remain private unless someone chooses to share them in a message.</p></div><div><ShieldCheck size={18} /><span><strong>Participant-only</strong>Only the founder and requesting investor can read this correspondence.</span></div></div>
    </section>
    <main className={`${styles.workspace} ${detail ? styles.hasDetail : ""}`}>
      <section className={styles.index} aria-label="Conversations">
        <div className={styles.indexHeader}><div><h2>Inbox</h2><span>{conversations.reduce((total, conversation) => total + conversation.unreadCount, 0)} unread</span></div>{loadError ? <button type="button" onClick={() => router.refresh()}><RefreshCw size={15} /> Retry</button> : null}</div>
        {loadError ? <div className={styles.listState}><CircleAlert size={22} /><h3>Your inbox could not load.</h3><p>Nothing was changed. Check the connection and try again.</p></div> : conversations.length ? <div className={styles.conversationList}>{conversations.map((conversation) => <Link aria-current={detail?.id === conversation.id ? "page" : undefined} className={styles.conversationLink} href={`/inbox/${conversation.id}`} key={conversation.id}><span className={styles.avatar} aria-hidden="true">{conversation.counterpartName.slice(0, 1).toUpperCase()}</span><span className={styles.conversationCopy}><span><strong>{conversation.counterpartName}</strong><time>{when(conversation.lastMessageAt)}</time></span><small>{conversation.startupName}{conversation.listed ? "" : " · No longer listed"}</small><p>{conversation.lastMessage}</p></span>{conversation.unreadCount > 0 ? <b aria-label={`${conversation.unreadCount} unread messages`}>{conversation.unreadCount}</b> : null}</Link>)}</div> : <div className={styles.listState}><MessageSquareText size={24} /><h3>No conversations yet.</h3><p>{account.role === "investor" ? "Open a published startup to request an introduction." : "When an investor requests an introduction, it will appear here. You can always reply for free."}</p><Link className="button button-light" href={account.role === "investor" ? "/discover" : "/founder"}>{account.role === "investor" ? "Browse startups" : "Return to dashboard"}</Link></div>}
      </section>
      {detail ? <section className={styles.thread} aria-label={`Conversation with ${detail.counterpart.name}`}>
        <header className={styles.threadHeader}>
          <Link className={styles.mobileBack} href="/inbox"><ArrowLeft size={18} /> Inbox</Link>
          <div className={styles.threadIdentity}><span className={styles.avatar} aria-hidden="true">{detail.counterpart.name.slice(0, 1).toUpperCase()}</span><div><h2>{detail.counterpart.name}</h2><p>{detail.counterpart.meta}</p></div></div>
          <div className={styles.threadActions}>{detail.currentRole === "investor" ? <Link href={`/startups/${detail.startupId}`}><Building2 size={15} /> View profile</Link> : detail.counterpart.linkedinUrl ? <a href={detail.counterpart.linkedinUrl} target="_blank" rel="noreferrer">Professional profile <ExternalLink size={14} /></a> : null}<button type="button" onClick={() => blockedByMe ? void changeBlock(false) : setConfirmBlock(true)}>{blockedByMe ? <><Undo2 size={15} /> Unblock</> : <><Ban size={15} /> Block</>}</button></div>
        </header>
        <div className={styles.contextStrip}><span><strong>{detail.startupName}</strong>{detail.startupTagline}</span><span className={detail.listed ? styles.listed : styles.unlisted}>{detail.listed ? <><Check size={13} /> Published</> : "No longer listed"}</span></div>
        {detail.currentRole === "founder" && detail.counterpart.bio ? <details className={styles.investorContext}><summary>About this investor</summary><p>{detail.counterpart.bio}</p>{detail.counterpart.domainSignal ? <span><ShieldCheck size={13} /> Firm email matched; identity, affiliation, and funds have not been verified.</span> : <span>Professional details are self-reported.</span>}</details> : null}
        {confirmBlock ? <div className={styles.blockConfirm} role="alert"><div><strong>Block this conversation?</strong><p>Both sides will keep the existing history, but neither participant will be able to send another message until you unblock it.</p></div><div><button type="button" disabled={blocking} onClick={() => setConfirmBlock(false)}>Cancel</button><button type="button" disabled={blocking} onClick={() => void changeBlock(true)}>{blocking ? "Blocking…" : "Block conversation"}</button></div></div> : null}
        <div className={styles.history} ref={historyRef} aria-live="polite">
          {messages.map((message) => {
            const mine = message.senderId === detail.currentUserId;
            return <article className={`${styles.message} ${mine ? styles.mine : ""}`} key={message.clientMessageId || message.id}><header><strong>{mine ? "You" : detail.counterpart.name}</strong><time>{when(message.createdAt)}</time></header><p>{message.body}</p>{message.status ? <footer>{message.status === "sending" ? <><LoaderCircle className={styles.spinner} size={13} /> Sending…</> : <><CircleAlert size={13} /> Not sent <button type="button" onClick={() => retry(message)}>Retry</button></>}</footer> : null}</article>;
          })}
        </div>
        <form className={styles.composer} onSubmit={submit}>
          <div className={styles.connection} aria-live="polite">{connection === "live" ? <><span /> Connected</> : connection === "offline" ? <><WifiOff size={13} /> Offline · your draft is safe</> : <><LoaderCircle className={styles.spinner} size={13} /> Reconnecting…</>}</div>
          {blocked ? <div className={styles.blockedNotice}><Ban size={16} /><span><strong>This conversation is blocked.</strong>{blockedByMe ? "Unblock it from the header to send another message." : "Messages cannot be sent in this conversation."}</span></div> : <><label><span className="sr-only">Message</span><textarea value={draft} onChange={(event) => { setDraft(event.target.value); setFeedback(""); }} maxLength={2_000} rows={3} placeholder={detail.currentRole === "founder" ? "Reply to this investor — free on every plan" : "Write a private message"} /></label><div className={styles.composerFooter}><span>{draft.length} / 2,000 · Plain text</span><button className="button button-dark" disabled={!draft.trim()} type="submit"><Send size={15} /> Send message</button></div></>}
          {feedback ? <p className={styles.feedback} role="alert"><CircleAlert size={15} />{feedback}</p> : <p className={styles.draftNote}>Unsent text stays on this device.</p>}
        </form>
      </section> : <section className={styles.threadEmpty}><MessageSquareText size={28} /><h2>Select a conversation.</h2><p>The full introduction and startup context will stay together here.</p></section>}
    </main>
  </div></div>;
}
