/*
 * Website sign-in. When ALEXANDER_PASSWORD is set, every page needs a signed session cookie.
 * The owner signs in with that password; people the owner invites sign in with their own name
 * and password, and each gets their own separate data. Sessions are HMAC-signed with a key made
 * from the site password, so changing it signs everyone out. Used by the proxy and API routes.
 */

export const SESSION_COOKIE = "alex_session";
/** Readable by the page: which account this browser is signed in as, so each keeps its own local copy. */
export const ACCOUNT_COOKIE = "alex_user";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
export const OWNER = "owner";

// The old spelling is still read, so a password set before the rename keeps working.
export const sitePassword = () => process.env.ALEXANDER_PASSWORD || process.env.ALEXENDER_PASSWORD || "";

const enc = new TextEncoder();
const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");

async function hmac(key: string, message: string) {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, enc.encode(message)));
}

/** The owner's session from before accounts existed — still accepted, so nobody is signed out. */
export const sessionToken = (password: string) => hmac(password, "alexender-session-v1");

/** Constant-time string comparison, so response timing doesn't leak how close a guess was. */
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export type Session = { user: string; version: number };

const sign = (password: string, body: string) => hmac(password, `alexender-session-v2:${body}`);

/** A session for one account. `version` changes when that account's password does. */
export async function createSession(password: string, user: string, version: number) {
  const body = `${user}.${version}.${Math.floor(Date.now() / 1000)}`;
  return `v2.${body}.${await sign(password, body)}`;
}

/** Who a session cookie belongs to — or null if it's forged, expired or from an old password. */
export async function readSession(password: string, cookie: string): Promise<Session | null> {
  if (!cookie) return null;
  const parts = cookie.split(".");
  if (parts.length === 5 && parts[0] === "v2") {
    const [, user, version, issued, sig] = parts;
    if (!/^[\w-]{1,64}$/.test(user) || !/^\d+$/.test(version) || !/^\d+$/.test(issued)) return null;
    if ((Number(issued) + SESSION_MAX_AGE) * 1000 < Date.now()) return null;
    return safeEqual(sig, await sign(password, `${user}.${version}.${issued}`)) ? { user, version: Number(version) } : null;
  }
  return safeEqual(cookie, await sessionToken(password)) ? { user: OWNER, version: 0 } : null;
}

// ---------- Passwords of invited people (never stored as typed) ----------

export interface PasswordHash {
  salt: string;
  hash: string;
  iterations: number;
}

export async function hashPassword(password: string, salt = hex(crypto.getRandomValues(new Uint8Array(16)).buffer), iterations = 120_000): Promise<PasswordHash> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations }, key, 256);
  return { salt, hash: hex(bits), iterations };
}

export async function verifyPassword(password: string, stored: PasswordHash) {
  const { hash } = await hashPassword(password, stored.salt, stored.iterations);
  return safeEqual(hash, stored.hash);
}
