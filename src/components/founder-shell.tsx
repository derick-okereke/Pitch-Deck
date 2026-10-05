"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, LogOut } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import type { CurrentAccount } from "@/lib/account";
import styles from "./founder-shell.module.css";
import { BrandMark } from "@/components/brand-mark";

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

export function FounderShell({ children, account, pro = false }: { children: React.ReactNode; account: CurrentAccount; pro?: boolean }) {
  const pathname = usePathname();
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
