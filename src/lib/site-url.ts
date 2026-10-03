const PRODUCTION_SITE_URL = "https://pitch-deck.pxxlspace.cv";

type SiteUrlEnvironment = Record<string, string | undefined>;

function cleanOrigin(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function authEmailRedirectOrigin(environment: SiteUrlEnvironment = process.env) {
  // Email links must never depend on proxy request headers: some hosting
  // runtimes expose their internal localhost origin to server actions.
  return cleanOrigin(environment.AUTH_EMAIL_REDIRECT_ORIGIN) || PRODUCTION_SITE_URL;
}

export function applicationOrigin(environment: SiteUrlEnvironment = process.env) {
  return cleanOrigin(environment.APP_BASE_URL) || PRODUCTION_SITE_URL;
}
