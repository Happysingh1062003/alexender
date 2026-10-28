import type { NextRequest } from "next/server";
import { createSession, hashPassword, SESSION_COOKIE, SESSION_MAX_AGE, sitePassword, verifyPassword } from "@/lib/auth";
import { databaseError, signedIn } from "@/lib/server/guard";

/**
 * Change your own password (people the owner invited; the owner's is the site password). Every
 * other device is signed out; this one stays signed in.
 */
export async function PATCH(request: NextRequest) {
  try {
    const ctx = await signedIn(request);
    if (ctx instanceof Response) return ctx;
    const account = ctx.viewer.account;
    if (!account) return Response.json({ error: "Your password is the site password — change ALEXANDER_PASSWORD in Vercel." }, { status: 400 });

    const body = (await request.json().catch(() => ({}))) as { current?: string; next?: string };
    if (!(await verifyPassword(body.current ?? "", account))) return Response.json({ error: "Your current password isn't right." }, { status: 400 });
    if ((body.next ?? "").length < 6) return Response.json({ error: "Use a new password of at least 6 characters." }, { status: 400 });

    const session = account.session + 1;
    await ctx.storage.saveAccount({ ...account, ...(await hashPassword(body.next!)), session });

    const response = Response.json({ ok: true });
    const https = request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
    const token = await createSession(sitePassword(), account.id, session);
    response.headers.set("Set-Cookie", `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${https ? "; Secure" : ""}`);
    return response;
  } catch (error) {
    return databaseError(error);
  }
}
