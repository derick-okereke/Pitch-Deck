import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <Link className="wordmark footer-mark" href="/">Pitch Deck<span className="wordmark-dot" aria-hidden="true" /></Link>
        <p>Better preparation. Clearer signals. More useful conversations.</p>
      </div>
      <div className="footer-links" aria-label="Footer navigation">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/auth/sign-in">Sign in</Link>
      </div>
      <p className="copyright">© 2026 Pitch Deck</p>
    </footer>
  );
}

