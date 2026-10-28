import type { NextRequest } from "next/server";
import { hashPassword, OWNER, sitePassword } from "@/lib/auth";
import { checkAccount, cleanName, newId, signIn } from "@/lib/server/accounts";
import { databaseError } from "@/lib/server/guard";
import { getStorage, type Account, type Invite } from "@/lib/server/storage";
import type { Data } from "@/lib/store";

/*
 * Joining with an invite link — no sign-in needed to reach it. The link's id is the only key:
 * 24 random characters, good once, for a week.
 */

async function findInvite(token: string | null): Promise<{ invite: Invite | null; storage: ReturnType<typeof getStorage> }> {
  const storage = getStorage();
  if (!storage || !sitePassword() || !token || !/^[a-f0-9]{24}$/.test(token)) return { invite: null, storage };
  const invite = (await storage.listInvites()).find((i) => i.id === token) ?? null;
  return { invite: invite && invite.expiresAt >= Date.now() ? invite : null, storage };
}

/** Is this link still good, and who sent it? */
export async function GET(request: NextRequest) {
  try {
    const { invite, storage } = await findInvite(request.nextUrl.searchParams.get("token"));
    if (!invite || !storage) return Response.json({ ok: false, error: "This invite has been used or has expired. Ask for a new one." }, { status: 404 });
    const owner = ((await storage.getDoc(OWNER))?.data ?? {}) as Partial<Data>;
    return Response.json({ ok: true, from: owner.settings?.name?.trim() || null });
  } catch (error) {
    return databaseError(error);
  }
}

/** Create your account from the link, and you're signed in. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { token?: string; name?: string; password?: string };
    const { invite, storage } = await findInvite(body.token ?? null);
    if (!invite || !storage) return Response.json({ error: "This invite has been used or has expired. Ask for a new one." }, { status: 404 });

    const name = cleanName(body.name);
    const password = typeof body.password === "string" ? body.password : "";
    const problem = checkAccount(name, password, await storage.listAccounts());
    if (problem) return Response.json({ error: problem }, { status: 400 });

    // Claim the link first, so two people opening it at once can't both join.
    if (!(await storage.deleteInvite(invite.id))) return Response.json({ error: "This invite was just used. Ask for a new one." }, { status: 409 });

    const account: Account = { id: newId(), name, ...(await hashPassword(password)), session: 1, createdAt: Date.now() };
    await storage.saveAccount(account);
    // Start them with their name already set, so they land straight on Today.
    await storage.reset(account.id, { settings: { name, updatedAt: Date.now() } });
    return signIn(Response.json({ ok: true }), request, account.id, account.session);
  } catch (error) {
    return databaseError(error);
  }
}
