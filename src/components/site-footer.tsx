import Link from "next/link";
import { AnalyticsSettingsButton } from "@/components/analytics-settings-button";
import { BrandMark } from "@/components/brand-mark";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <Link className="wordmark footer-mark" href="/"><BrandMark /></Link>
        <p>Pitch practice. Reviewed founder profiles. Private introductions.</p>
      </div>
      <div className="footer-links" aria-label="Footer navigation">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/auth/sign-in">Sign in</Link>
        {process.env.NEXT_PUBLIC_POSTHOG_KEY && process.env.NEXT_PUBLIC_POSTHOG_HOST ? <AnalyticsSettingsButton /> : null}
      </div>
      <p className="copyright">© 2026 Peekytoe</p>
    </footer>
  );
}
