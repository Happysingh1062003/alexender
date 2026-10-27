import { NextResponse, type NextRequest } from "next/server";
import { safeEqual, SESSION_COOKIE, sessionToken, sitePassword } from "@/lib/auth";

// The expected cookie only changes with the password, so it is worked out once per server.
let expected: { password: string; token: Promise<string> } | undefined;
const expectedToken = (password: string) => {
  if (expected?.password !== password) expected = { password, token: sessionToken(password) };
  return expected.token;
};

/** Blocks the whole site behind the password login when ALEXANDER_PASSWORD is set. */
export async function proxy(request: NextRequest) {
  const password = sitePassword();
  if (!password) return NextResponse.next();

  const cookie = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  if (safeEqual(cookie, await expectedToken(password))) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // Public-domain story pictures need no password, so they load straight from the CDN.
  matcher: ["/((?!_next/static|_next/image|login|api/auth|icon.svg|alexander.webp|stories/|manifest.webmanifest|favicon.ico).*)"],
};
