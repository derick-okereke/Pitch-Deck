const PRODUCTION_SITE_URL = "https://pitch-deck.pxxlspace.cv";

type HeaderReader = Pick<Headers, "get">;
type SiteUrlEnvironment = {
  APP_BASE_URL?: string;
  NODE_ENV?: string;
};

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

function isLocalOrigin(origin: string) {
  const hostname = new URL(origin).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function siteUrl(
  headerStore: HeaderReader,
  environment: SiteUrlEnvironment = process.env,
) {
  const configured = cleanOrigin(environment.APP_BASE_URL);
  if (environment.NODE_ENV === "production") {
    return configured && !isLocalOrigin(configured) ? configured : PRODUCTION_SITE_URL;
  }
  if (configured) return configured;

  const forwardedHost = headerStore.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || headerStore.get("host")?.split(",")[0]?.trim();
  const forwardedProto = headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const requestOrigin = cleanOrigin(headerStore.get("origin"));
  const publicRequestOrigin = cleanOrigin(host ? `${forwardedProto || "https"}://${host}` : null);

  if (publicRequestOrigin && !isLocalOrigin(publicRequestOrigin)) return publicRequestOrigin;
  if (requestOrigin && !isLocalOrigin(requestOrigin)) return requestOrigin;

  return configured || requestOrigin || "http://localhost:3000";
}
