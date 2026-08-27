import "server-only";
import { timingSafeEqual } from "crypto";

function tokensMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Guards server-to-server endpoints meant for Anchor OS, not browsers or the
 * portal's own session-based auth. Fails closed: a missing or empty
 * ANCHOR_OS_SERVICE_TOKEN denies every request rather than accepting any
 * bearer value.
 */
export function requireServiceToken(req: Request): { error: string; status: number } | null {
  const expected = process.env.ANCHOR_OS_SERVICE_TOKEN;
  if (!expected) {
    return { error: "Anchor OS integration is not configured.", status: 503 };
  }

  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (!token || !tokensMatch(token, expected)) {
    return { error: "Unauthorized.", status: 401 };
  }

  return null;
}
