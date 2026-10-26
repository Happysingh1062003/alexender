import { sitePassword } from "../auth";
import { getStorage, type Storage } from "./storage";

/**
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
