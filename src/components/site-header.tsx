"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { signOut } from "@/app/auth/actions";
import { BrandMark } from "@/components/brand-mark";

export function SiteHeader({ founderHref = "/#for-founders", investorHref = "/discover", workspaceHref, workspaceLabel = "Open workspace", investorWorkspace = false, activeInvestorPage }: {
  founderHref?: string;
  investorHref?: string;
  workspaceHref?: string | null;
  workspaceLabel?: string;
  investorWorkspace?: boolean;
  activeInvestorPage?: "discover" | "inbox" | "profile";
}) {
  const [open, setOpen] = useState(false);
  const investorLinks = [
    { href: "/discover", label: "Discovery", page: "discover" },
    { href: "/inbox", label: "Inbox", page: "inbox" },
    { href: "/investor/profile", label: "Investment profile", page: "profile" },
  ];

  return (
    <header className="site-header">
      <div className="nav-row">
        <Link className="wordmark" href="/" aria-label="Peekytoe home"><BrandMark /></Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {investorWorkspace ? investorLinks.map(({ href, label, page }) => <Link key={href} href={href} aria-current={activeInvestorPage === page ? "page" : undefined}>{label}</Link>) : <>
            <Link href="/#how-it-works">How it works</Link>
            <Link href={founderHref}>For founders</Link>
            <Link href={investorHref}>For investors</Link>
            {workspaceHref ? <Link href="/inbox">Inbox</Link> : null}
          </>}
        </nav>
        <div className="desktop-actions">
          {workspaceHref ? <><form action={signOut} className="site-signout"><button type="submit">Sign out</button></form><Link className="button button-dark button-small" href={workspaceHref}>{workspaceLabel}</Link></> : <>
            <Link className="text-link" href="/auth/sign-up">Create account</Link>
            <Link className="button button-dark button-small" href="/auth/sign-in">Sign in</Link>
          </>}
        </div>
        <button
          type="button"
          className="menu-button"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open && (
        <nav className="mobile-nav" id="mobile-menu" aria-label="Mobile navigation">
          {investorWorkspace ? investorLinks.map(({ href, label, page }) => <Link key={href} onClick={() => setOpen(false)} href={href} aria-current={activeInvestorPage === page ? "page" : undefined}>{label}</Link>) : <>
            <Link onClick={() => setOpen(false)} href="/#how-it-works">How it works</Link>
            <Link onClick={() => setOpen(false)} href={founderHref}>For founders</Link>
            <Link onClick={() => setOpen(false)} href={investorHref}>For investors</Link>
            {workspaceHref ? <Link onClick={() => setOpen(false)} href="/inbox">Inbox</Link> : null}
          </>}
          {workspaceHref ? <><Link onClick={() => setOpen(false)} className="button button-dark" href={workspaceHref}>{workspaceLabel}</Link><form action={signOut} className="site-signout"><button type="submit">Sign out</button></form></> : <>
            <Link onClick={() => setOpen(false)} href="/auth/sign-up">Create account</Link>
            <Link onClick={() => setOpen(false)} className="button button-dark" href="/auth/sign-in">Sign in</Link>
          </>}
        </nav>
      )}
    </header>
  );
}
