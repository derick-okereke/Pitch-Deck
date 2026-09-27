"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, LogOut } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import type { CurrentAccount } from "@/lib/account";
import styles from "./founder-shell.module.css";

const navigation = [
  ["Overview", "/founder"],
  ["Profile", "/founder/profile/edit"],
  ["Practice", "/simulator/new"],
] as const;

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "PD";
}

export function FounderShell({ children, account }: { children: React.ReactNode; account: CurrentAccount }) {
  const pathname = usePathname();
  return (
    <div className="founder-app">
      <header className="founder-header">
        <Link className="wordmark" href="/">Pitch Deck<span className="wordmark-dot" aria-hidden="true" /></Link>
        <nav aria-label="Founder workspace">
          {navigation.map(([label, href]) => {
            const active = pathname === href || (href === "/simulator/new" && pathname.startsWith("/simulator/"));
            return <Link aria-current={active ? "page" : undefined} className={active ? "active" : ""} href={href} key={href}>{label}</Link>;
          })}
        </nav>
        <div className="founder-account">
          <span className="plan-tag">Free plan</span>
          <button aria-label="Notifications" type="button"><Bell size={17} /></button>
          <details className={styles.accountMenu}>
            <summary aria-label="Open account menu" className="account-button">
              <span aria-hidden="true">{initials(account.displayName)}</span><ChevronDown size={14} />
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
