// Supabase owns the token format and verifies its authenticity. In particular,
// token hashes can be SHA-224 values or carry a PKCE prefix, not just SHA-256.
export function confirmationTokenHash(value: unknown): string | null {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,512}$/.test(value) ? value : null;
}
