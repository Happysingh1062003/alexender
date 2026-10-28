import type { NextRequest } from "next/server";
import { ACCOUNT_COOKIE, OWNER, readSession, safeEqual, SESSION_COOKIE, sessionToken, sitePassword, verifyPassword } from "@/lib/auth";
import { signIn } from "@/lib/server/accounts";
import { getStorage } from "@/lib/server/storage";

/** Whether the website password is switched on. */
export async function GET() {
  return Response.json({ enabled: !!sitePassword() });
}

// Wrong guesses per address. After MAX_FAILS within the window, that address waits out the
// lockout. Kept in memory: enough to stop rapid guessing against a small private site.
const MAX_FAILS = 5;
const WINDOW_MS = 10 * 60_000;
const fails = new Map<string, { count: number; first: number }>();

const clientAddress = (request: NextRequest) => request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

/**
 * Sign in. Someone you invited gives their name and password; you (the owner) give the site
 * password, with any other name or none.
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

  const body = (await request.json().catch(() => ({}))) as { name?: string; password?: string; verify?: boolean };
  const given = body.password ?? "";
  // Compared as signatures, so the time taken says nothing about how close a guess was.
  const isSitePassword = async () => safeEqual(await sessionToken(given), await sessionToken(password));
  const accounts = (await getStorage()?.listAccounts().catch(() => [])) ?? [];

  // "Prove it's you" (forgot passcode): checks the password of whoever is already signed in.
  if (body.verify) {
    const session = await readSession(password, request.cookies.get(SESSION_COOKIE)?.value ?? "");
    const mine = session && session.user !== OWNER ? accounts.find((a) => a.id === session.user) : undefined;
    const ok = !!session && (session.user === OWNER ? await isSitePassword() : !!mine && (await verifyPassword(given, mine)));
    if (!ok) fails.set(address, { count: (current?.count ?? 0) + 1, first: current?.first ?? now });
    return Response.json({ ok }, { status: ok ? 200 : 401 });
  }

  const name = (body.name ?? "").trim().toLowerCase();
  let user: string | null = null;
  let version = 0;
  const account = name ? accounts.find((a) => a.name.toLowerCase() === name) : undefined;
  if (account) {
    // A matching name means that person's password, never the owner's.
    if (await verifyPassword(given, account)) {
      user = account.id;
      version = account.session;
    }
  } else if (await isSitePassword()) {
    user = OWNER;
  }

  if (!user) {
    fails.set(address, { count: (current?.count ?? 0) + 1, first: current?.first ?? now });
    await new Promise((r) => setTimeout(r, 1000)); // slow down guessing
    return Response.json({ ok: false, error: account ? "Wrong password." : name ? "Wrong name or password." : "Wrong password." }, { status: 401 });
  }
  fails.delete(address);

  return signIn(Response.json({ ok: true }), request, user, version);
}

/** Sign out. */
export async function DELETE() {
  const response = Response.json({ ok: true });
  response.headers.append("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  response.headers.append("Set-Cookie", `${ACCOUNT_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0`);
  return response;
}
