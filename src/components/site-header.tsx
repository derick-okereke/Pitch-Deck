"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function SiteHeader({ workspaceHref, workspaceLabel = "Open workspace" }: {
  workspaceHref?: string | null;
  workspaceLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="nav-row">
        <Link className="wordmark" href="/" aria-label="Pitch Deck home">
          Pitch Deck<span className="wordmark-dot" aria-hidden="true" />
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/#for-founders">For founders</Link>
          <Link href="/discover">For investors</Link>
        </nav>
        <div className="desktop-actions">
          {workspaceHref ? <Link className="button button-dark button-small" href={workspaceHref}>{workspaceLabel}</Link> : <>
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
          <Link onClick={() => setOpen(false)} href="/#how-it-works">How it works</Link>
          <Link onClick={() => setOpen(false)} href="/#for-founders">For founders</Link>
          <Link onClick={() => setOpen(false)} href="/discover">For investors</Link>
          {workspaceHref ? <Link onClick={() => setOpen(false)} className="button button-dark" href={workspaceHref}>{workspaceLabel}</Link> : <>
            <Link onClick={() => setOpen(false)} href="/auth/sign-up">Create account</Link>
            <Link onClick={() => setOpen(false)} className="button button-dark" href="/auth/sign-in">Sign in</Link>
          </>}
        </nav>
      )}
    </header>
  );
}

