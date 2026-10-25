/*
 * Optional website password. When ALEXENDER_PASSWORD is set, every page requires a session
 * cookie whose value is an HMAC of that password — so changing the password signs everyone out.
 * Used by both the proxy and the /api/auth route (server only).
 */

export const SESSION_COOKIE = "alex_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export const sitePassword = () => process.env.ALEXENDER_PASSWORD || "";

export async function sessionToken(password: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("alexender-session-v1"));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison, so response timing doesn't leak how close a guess was. */
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
