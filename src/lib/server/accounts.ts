import type { NextRequest } from "next/server";
import { ACCOUNT_COOKIE, createSession, SESSION_COOKIE, SESSION_MAX_AGE, sitePassword } from "../auth";
import type { Account } from "./storage";

/** Shared by People (the owner adds someone) and Join (someone uses an invite link). */

export const cleanName = (value: unknown) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "");
export const newId = (length = 16) => crypto.randomUUID().replace(/-/g, "").slice(0, length);

/** Problems with a name or password, in plain words — or null when they're fine. */
export function checkAccount(name: string, password: string | undefined, accounts: Account[], self?: string) {
  if (!name || name.length > 40) return "Choose a name (up to 40 letters).";
  if (accounts.some((a) => a.id !== self && a.name.toLowerCase() === name.toLowerCase())) return "Someone already has that name — try another.";
  if (password !== undefined && password.length < 6) return "Use a password of at least 6 characters.";
  return null;
}

export const publicView = (a: Account) => ({ id: a.id, name: a.name, createdAt: a.createdAt });

/** Signs a response in as `user`: the session, and the (readable) account it belongs to. */
export async function signIn(response: Response, request: NextRequest, user: string, version: number) {
  // Only mark cookies Secure over https, or signing in breaks when self-hosted on plain http.
  const https = request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  const secure = https ? "; Secure" : "";
  const token = await createSession(sitePassword(), user, version);
  response.headers.append("Set-Cookie", `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${secure}`);
  // Not secret: lets the page keep this account's local copy apart from anyone else's on this device.
  response.headers.append("Set-Cookie", `${ACCOUNT_COOKIE}=${user}; Path=/; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${secure}`);
  return response;
}
