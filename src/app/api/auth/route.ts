import type { NextRequest } from "next/server";
import { isSession, safeEqual, SESSION_COOKIE, SESSION_MAX_AGE, sessionToken, sitePassword } from "@/lib/auth";

/** Whether the website password is switched on. */
export async function GET() {
  return Response.json({ enabled: !!sitePassword() });
}

// Wrong guesses per address. After MAX_FAILS within the window, that address waits out the
// lockout. Kept in memory: enough to stop rapid guessing against a single-person site.
const MAX_FAILS = 5;
const WINDOW_MS = 10 * 60_000;
const fails = new Map<string, { count: number; first: number }>();

const clientAddress = (request: NextRequest) => request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

/**
 * Sign in with the website password. With `verify`, only checks it for whoever is already signed
 * in (used to remove a forgotten passcode) and leaves the session as it is.
 */
export async function POST(request: NextRequest) {
  const password = sitePassword();
  if (!password) return Response.json({ ok: true });

  const address = clientAddress(request);
  const now = Date.now();
  const record = fails.get(address);
  if (record && now - record.first > WINDOW_MS) fails.delete(address);
  const current = fails.get(address);
  if (current && current.count >= MAX_FAILS) {
    const wait = Math.ceil((current.first + WINDOW_MS - now) / 60_000);
    return Response.json({ ok: false, error: `Too many tries. Wait ${wait} min.` }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({}))) as { password?: string; verify?: boolean };
  // Compared as signatures, so the time taken says nothing about how close a guess was.
  const [given, expected] = await Promise.all([sessionToken(body.password ?? ""), sessionToken(password)]);
  const right = safeEqual(given, expected);

  if (body.verify) {
    const ok = right && (await isSession(password, request.cookies.get(SESSION_COOKIE)?.value ?? ""));
    if (!ok) fails.set(address, { count: (current?.count ?? 0) + 1, first: current?.first ?? now });
    return Response.json({ ok }, { status: ok ? 200 : 401 });
  }

  if (!right) {
    fails.set(address, { count: (current?.count ?? 0) + 1, first: current?.first ?? now });
    await new Promise((r) => setTimeout(r, 1000)); // slow down guessing
    return Response.json({ ok: false, error: "Wrong password." }, { status: 401 });
  }
  fails.delete(address);

  const response = Response.json({ ok: true });
  // Only mark the cookie Secure over https, or signing in breaks when self-hosted on plain http.
  const https = request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  response.headers.append("Set-Cookie", `${SESSION_COOKIE}=${expected}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${https ? "; Secure" : ""}`);
  // Clears the account marker the multi-person version set, if this browser still has one.
  response.headers.append("Set-Cookie", "alex_user=; Path=/; SameSite=Lax; Max-Age=0");
  return response;
}

/** Sign out. */
export async function DELETE() {
  const response = Response.json({ ok: true });
  response.headers.append("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  response.headers.append("Set-Cookie", "alex_user=; Path=/; SameSite=Lax; Max-Age=0");
  return response;
}
