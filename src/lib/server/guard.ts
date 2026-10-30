import { unstable_rethrow } from "next/navigation";
import type { NextRequest } from "next/server";
import { isSession, SESSION_COOKIE, sitePassword } from "../auth";
import { getStorage, type Storage } from "./storage";

/*
 * Sync is only served when it is safe: on a live site a website password is required (the proxy
 * checks it on every request), and there must be somewhere to keep the data.
 */

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

/** Storage, if you're signed in (or no password is set — your own computer); otherwise the response to send. */
export async function signedIn(request: NextRequest): Promise<Storage | Response> {
  const storage = syncStorage();
  if (storage instanceof Response) return storage;
  const password = sitePassword();
  if (password && !(await isSession(password, request.cookies.get(SESSION_COOKIE)?.value ?? ""))) {
    return Response.json({ code: "signed-out", error: "Signed out — sign in again." }, { status: 401 });
  }
  return storage;
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
