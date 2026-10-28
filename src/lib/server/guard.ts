import { unstable_rethrow } from "next/navigation";
import type { NextRequest } from "next/server";
import { OWNER, readSession, SESSION_COOKIE, sitePassword } from "../auth";
import { getStorage, type Account, type Storage } from "./storage";

/*
 * Sync is only served when it is safe: on a live site a website password is required (the proxy
 * checks it on every request), and there must be somewhere to keep the data. Every request is
 * answered for the account it is signed in as — never anyone else's.
 */

export type Viewer = { id: string; role: "owner" | "member"; account?: Account };

export function syncStorage(): Storage | Response {
  if (process.env.NODE_ENV === "production" && !sitePassword()) {
    return Response.json({ code: "no-password", error: "Set ALEXANDER_PASSWORD to turn on sync." }, { status: 403 });
  }
  const storage = getStorage();
  if (!storage) {
    return Response.json({ code: "no-storage", error: "Connect a database (DATABASE_URL) to turn on sync." }, { status: 503 });
  }
  return storage;
}

/**
 * Who is asking. Without a site password (your own computer) there is only the owner. A removed
 * account, or one whose password was changed since, no longer counts.
 */
export async function viewer(request: NextRequest, storage: Storage | null = getStorage()): Promise<Viewer | null> {
  const password = sitePassword();
  if (!password) return { id: OWNER, role: "owner" };
  const session = await readSession(password, request.cookies.get(SESSION_COOKIE)?.value ?? "");
  if (!session) return null;
  if (session.user === OWNER) return { id: OWNER, role: "owner" };
  const account = storage ? await storage.getAccount(session.user) : null;
  return account && account.session === session.version ? { id: account.id, role: "member", account } : null;
}

const signedOut = () => Response.json({ code: "signed-out", error: "Signed out — sign in again." }, { status: 401 });

/** Storage and the signed-in account, or the response to send instead. */
export async function signedIn(request: NextRequest): Promise<{ storage: Storage; viewer: Viewer } | Response> {
  const storage = syncStorage();
  if (storage instanceof Response) return storage;
  const who = await viewer(request, storage);
  return who ? { storage, viewer: who } : signedOut();
}

/**
 * A database call failed (unreachable, wrong credentials). Reported plainly so Settings can show
 * it, without echoing the driver's message — that can contain connection details.
 */
export function databaseError(error: unknown) {
  // Next's own signals (e.g. "this route reads cookies, so it can't be pre-built") pass through.
  unstable_rethrow(error);
  console.error("Alexander sync: database error", error);
  return Response.json({ code: "db-error", error: "Couldn't reach the database — retrying. Check the database connection in Vercel if this lasts." }, { status: 503 });
}
