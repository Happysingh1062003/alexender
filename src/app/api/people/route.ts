import type { NextRequest } from "next/server";
import { hashPassword, sitePassword } from "@/lib/auth";
import { checkAccount as check, cleanName, newId, publicView } from "@/lib/server/accounts";
import { databaseError, signedIn } from "@/lib/server/guard";
import type { Account, Storage } from "@/lib/server/storage";

/*
 * People the owner invites. Only the owner can see this list, add someone, rename them, give them
 * a new password (which signs them out everywhere) or remove them with all their data.
 */


async function ownerOnly(request: NextRequest): Promise<Storage | Response> {
  const ctx = await signedIn(request);
  if (ctx instanceof Response) return ctx;
  if (ctx.viewer.role !== "owner") return Response.json({ error: "Only the owner can manage people." }, { status: 403 });
  if (!sitePassword()) return Response.json({ error: "Set ALEXANDER_PASSWORD first — people need it to sign in." }, { status: 400 });
  return ctx.storage;
}


export async function GET(request: NextRequest) {
  try {
    const storage = await ownerOnly(request);
    if (storage instanceof Response) return storage;
    const accounts = await storage.listAccounts();
    return Response.json({ people: accounts.sort((a, b) => a.createdAt - b.createdAt).map(publicView) });
  } catch (error) {
    return databaseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const storage = await ownerOnly(request);
    if (storage instanceof Response) return storage;
    const body = (await request.json().catch(() => ({}))) as { name?: string; password?: string };
    const name = cleanName(body.name);
    const password = typeof body.password === "string" ? body.password : "";
    const problem = check(name, password, await storage.listAccounts());
    if (problem) return Response.json({ error: problem }, { status: 400 });
    const account: Account = { id: newId(), name, ...(await hashPassword(password)), session: 1, createdAt: Date.now() };
    await storage.saveAccount(account);
    // Their name is already set, so they skip setup and land straight on Today.
    await storage.reset(account.id, { settings: { name, updatedAt: Date.now() } });
    return Response.json({ person: publicView(account) });
  } catch (error) {
    return databaseError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const storage = await ownerOnly(request);
    if (storage instanceof Response) return storage;
    const body = (await request.json().catch(() => ({}))) as { id?: string; name?: string; password?: string };
    const account = body.id ? await storage.getAccount(body.id) : null;
    if (!account) return Response.json({ error: "Not found" }, { status: 404 });
    const name = body.name === undefined ? account.name : cleanName(body.name);
    const password = typeof body.password === "string" ? body.password : undefined;
    const problem = check(name, password, await storage.listAccounts(), account.id);
    if (problem) return Response.json({ error: problem }, { status: 400 });
    const next: Account = { ...account, name, ...(password !== undefined && { ...(await hashPassword(password)), session: account.session + 1 }) };
    await storage.saveAccount(next);
    return Response.json({ person: publicView(next) });
  } catch (error) {
    return databaseError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const storage = await ownerOnly(request);
    if (storage instanceof Response) return storage;
    const id = request.nextUrl.searchParams.get("id");
    if (!id || !(await storage.getAccount(id))) return Response.json({ error: "Not found" }, { status: 404 });
    await storage.deleteAccount(id);
    // They leave every tournament too.
    for (const t of await storage.listTournaments())
      if (t.participants.includes(id)) await storage.saveTournament({ ...t, participants: t.participants.filter((p) => p !== id) });
    return Response.json({ ok: true });
  } catch (error) {
    return databaseError(error);
  }
}
