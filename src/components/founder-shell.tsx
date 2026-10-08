"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/auth/actions";
import type { CurrentAccount } from "@/lib/account";
import styles from "./founder-shell.module.css";
import { BrandMark } from "@/components/brand-mark";
import { createClient } from "@/lib/supabase/client";

const navigation = [
  ["Overview", "/founder"],
  ["Profile", "/founder/profile/edit"],
  ["Practice", "/simulator/new"],
  ["Inbox", "/inbox"],
  ["Plan", "/founder/billing"],
] as const;

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "PD";
}

export function FounderShell({ children, account, pro = false, initialUnreadCount = null }: { children: React.ReactNode; account: CurrentAccount; pro?: boolean; initialUnreadCount?: number | null }) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const accountMenuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    let active = true;
    let fetching = false;
    const controller = new AbortController();
    const refresh = async () => {
      if (fetching || document.visibilityState !== "visible" || !navigator.onLine) return;
      fetching = true;
      try {
        const response = await fetch("/api/v1/conversations/unread", { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const result = await response.json();
        const count = result.data?.unread_count;
        if (active && Number.isSafeInteger(count) && count >= 0) setUnreadCount(count);
      } catch {
        // Keep the last known count during a connection interruption.
      } finally {
        fetching = false;
      }
    };
    void refresh();
    const supabase = createClient();
    const channel = supabase.channel(`founder-unread:${account.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        if (payload.new.sender_id !== account.id) void refresh();
      })
      .subscribe((status) => { if (status === "SUBSCRIBED") void refresh(); });
    const interval = window.setInterval(() => { void refresh(); }, 15_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
      void supabase.removeChannel(channel);
    };
  }, [account.id, pathname]);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !accountMenuRef.current?.contains(event.target)) accountMenuRef.current?.removeAttribute("open");
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && accountMenuRef.current?.open) {
        accountMenuRef.current.removeAttribute("open");
        accountMenuRef.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const hasUnread = unreadCount !== null && unreadCount > 0;
  return (
    <div className="founder-app">
      <header className="founder-header">
        <Link className="wordmark" href="/"><BrandMark /></Link>
        <nav aria-label="Founder workspace">
          {navigation.map(([label, href]) => {
            const active = pathname === href || (href === "/simulator/new" && pathname.startsWith("/simulator/")) || (href === "/inbox" && pathname.startsWith("/inbox/")) || (href === "/founder/billing" && pathname.startsWith("/founder/billing/"));
            return <Link aria-current={active ? "page" : undefined} className={active ? "active" : ""} href={href} key={href}>{label}</Link>;
          })}
        </nav>
        <div className="founder-account">
          <Link className="plan-tag" href="/founder/billing">{pro ? "Founder Pro" : "Free plan"}</Link>
          <Link className={styles.notificationLink} href="/inbox" aria-label={unreadCount === null ? "Inbox notifications" : `${unreadCount} unread inbox ${unreadCount === 1 ? "message" : "messages"}`}>
            <Bell size={23} fill={hasUnread ? "currentColor" : "white"} aria-hidden="true" />
            {hasUnread ? <span className={styles.unreadBadge} aria-hidden="true">{unreadCount}</span> : null}
          </Link>
          <details className={styles.accountMenu} ref={accountMenuRef}>
            <summary aria-label="Open account menu" className={styles.accountTrigger}>
              <span aria-hidden="true">{initials(account.displayName)}</span>
            </summary>
            <div className={styles.menuPanel}>
              <strong>{account.displayName}</strong>
              <span>{account.organizationName}</span>
              {account.email ? <small>{account.email}</small> : null}
              <form action={signOut}>
                <button type="submit"><LogOut size={15} /> Sign out</button>
              </form>
            </div>
          </details>
        </div>
      </header>
      {children}
    </div>
  );
}
