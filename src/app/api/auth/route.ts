import type { NextRequest } from "next/server";
import { safeEqual, SESSION_COOKIE, SESSION_MAX_AGE, sessionToken, sitePassword } from "@/lib/auth";

/** Whether the website password is switched on. */
export async function GET() {
  return Response.json({ enabled: !!sitePassword() });
}

/** Sign in with the website password. */
export async function POST(request: NextRequest) {
  const password = sitePassword();
  if (!password) return Response.json({ ok: true });

  const body = (await request.json().catch(() => ({}))) as { password?: string };
  const [given, expected] = await Promise.all([sessionToken(body.password ?? ""), sessionToken(password)]);

  if (!safeEqual(given, expected)) {
    // Slow down guessing.
    await new Promise((r) => setTimeout(r, 1000));
    return Response.json({ ok: false }, { status: 401 });
  }

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
