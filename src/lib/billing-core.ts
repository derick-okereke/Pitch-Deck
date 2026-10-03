import { createHash, createHmac, timingSafeEqual } from "node:crypto";

function safeHexEqual(left: string, right: string) {
  if (!/^[0-9a-f]+$/i.test(left) || !/^[0-9a-f]+$/i.test(right)) return false;
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
export function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function usdToMinor(value: string) {
  const match = /^(0|[1-9]\d*)\.(\d{2})$/.exec(value);
  if (!match) return null;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  if (!Number.isSafeInteger(major) || major > 90_071_992_547_409) return null;
  return major * 100 + minor;
}

type SignatureInput = {
  rawBody: string;
  secret: string;
  signatureV2?: string | null;
  timestamp?: string | null;
  signature?: string | null;
  nowSeconds?: number;
  toleranceSeconds?: number;
};

export function verifyBachsSignature({
  rawBody,
  secret,
  signatureV2,
  timestamp,
  signature,
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = 300,
}: SignatureInput) {
  let signedAt: number;
  let candidates: string[];

  if (signatureV2) {
    const parts = signatureV2.split(",").map((part) => part.trim());
    const timestampValue = parts.find((part) => part.startsWith("t="))?.slice(2);
    signedAt = Number(timestampValue);
    candidates = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  } else {
    signedAt = Number(timestamp);
    candidates = signature ? [signature] : [];
  }

  if (!Number.isInteger(signedAt) || Math.abs(nowSeconds - signedAt) > toleranceSeconds || candidates.length === 0) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(`${signedAt}.${rawBody}`, "utf8").digest("hex");
  return candidates.some((candidate) => safeHexEqual(expected, candidate));
}
