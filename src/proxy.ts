import { NextResponse, type NextRequest } from "next/server";
import { isSession, SESSION_COOKIE, sitePassword } from "@/lib/auth";

// Sessions already checked by this server, so each page load doesn't re-verify the signature.
const verified = new Map<string, number>();
const REMEMBER_MS = 5 * 60_000;

async function isSignedIn(password: string, cookie: string) {
  const key = `${password.length}:${cookie}`;
  const until = verified.get(key);
  if (until && until > Date.now()) return true;
  if (!(await isSession(password, cookie))) return false;
  if (verified.size > 500) verified.clear();
  verified.set(key, Date.now() + REMEMBER_MS);
  return true;
}

/** Blocks the whole site behind sign-in when ALEXANDER_PASSWORD is set. */
export async function proxy(request: NextRequest) {
  const password = sitePassword();
  if (!password) return NextResponse.next();

  if (await isSignedIn(password, request.cookies.get(SESSION_COOKIE)?.value ?? "")) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // Public-domain story pictures need no password, so they load straight from the CDN.
  matcher: ["/((?!_next/static|_next/image|login|api/auth|icon.svg|icons/|apple-icon.png|sw.js|alexander.webp|stories/|manifest.webmanifest|favicon.ico).*)"],
};
