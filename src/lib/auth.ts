/*
 * Optional website password. When ALEXANDER_PASSWORD is set, every page requires a signed session
 * cookie. Only you sign in. Sessions are HMAC-signed with a key made from the password, so
 * changing it signs every device out. Used by both the proxy and the API routes (server only).
 */

export const SESSION_COOKIE = "alex_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// The old spelling is still read, so a password set before the rename keeps working.
export const sitePassword = () => process.env.ALEXANDER_PASSWORD || process.env.ALEXENDER_PASSWORD || "";

const enc = new TextEncoder();
const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");

async function hmac(key: string, message: string) {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, enc.encode(message)));
}

/** The signature of a password — your session cookie, and how a typed password is compared. */
export const sessionToken = (password: string) => hmac(password, "alexender-session-v1");

/** Constant-time string comparison, so response timing doesn't leak how close a guess was. */
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Whether a session cookie is yours. Also accepts the owner sessions of the short-lived
 * multi-person version ("v2.owner.…"), so no device is signed out by going back to one person.
 */
export async function isSession(password: string, cookie: string) {
  if (!cookie) return false;
  if (safeEqual(cookie, await sessionToken(password))) return true;
  const parts = cookie.split(".");
  if (parts.length !== 5 || parts[0] !== "v2" || parts[1] !== "owner" || !/^\d+$/.test(parts[3])) return false;
  if ((Number(parts[3]) + SESSION_MAX_AGE) * 1000 < Date.now()) return false;
  return safeEqual(parts[4], await hmac(password, `alexender-session-v2:${parts[1]}.${parts[2]}.${parts[3]}`));
}
