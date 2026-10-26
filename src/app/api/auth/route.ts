import type { NextRequest } from "next/server";
import { safeEqual, SESSION_COOKIE, SESSION_MAX_AGE, sessionToken, sitePassword } from "@/lib/auth";

/** Whether the website password is switched on. */
export async function GET() {
  return Response.json({ enabled: !!sitePassword() });
}

// Wrong guesses per address. After MAX_FAILS within the window, that address waits out the
// lockout. Kept in memory: enough to stop rapid guessing against a single-user site.
const MAX_FAILS = 5;
const WINDOW_MS = 10 * 60_000;
const fails = new Map<string, { count: number; first: number }>();

const clientAddress = (request: NextRequest) => request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

/** Sign in with the website password. */
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

  const body = (await request.json().catch(() => ({}))) as { password?: string };
  const [given, expected] = await Promise.all([sessionToken(body.password ?? ""), sessionToken(password)]);

  if (!safeEqual(given, expected)) {
    fails.set(address, { count: (current?.count ?? 0) + 1, first: current?.first ?? now });
    // Slow down guessing.
    await new Promise((r) => setTimeout(r, 1000));
    return Response.json({ ok: false }, { status: 401 });
  }
  fails.delete(address);

  const response = Response.json({ ok: true });
  // Only mark the cookie Secure over https, or signing in breaks when self-hosted on plain http.
  const https = request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  const secure = https ? "; Secure" : "";
  response.headers.set(
    "Set-Cookie",
    `${SESSION_COOKIE}=${expected}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${secure}`,
  );
  return response;
}

/** Sign out. */
export async function DELETE() {
  const response = Response.json({ ok: true });
  response.headers.set("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return response;
}
