import type { NextRequest } from "next/server";
import { sitePassword } from "@/lib/auth";
import { newId } from "@/lib/server/accounts";
import { databaseError, signedIn } from "@/lib/server/guard";
import type { Invite, Storage } from "@/lib/server/storage";

/*
 * Invite links. The owner makes one in a tap and shares it; whoever opens it picks their own
 * name and password. Each link works once, for a week.
 */

const WEEK = 7 * 86_400_000;

async function ownerOnly(request: NextRequest): Promise<Storage | Response> {
  const ctx = await signedIn(request);
  if (ctx instanceof Response) return ctx;
  if (ctx.viewer.role !== "owner") return Response.json({ error: "Only the owner can invite people." }, { status: 403 });
  if (!sitePassword()) return Response.json({ error: "Set ALEXANDER_PASSWORD first." }, { status: 400 });
  return ctx.storage;
}

/** Open invites, newest first. Expired ones are cleared away. */
export async function GET(request: NextRequest) {
  try {
    const storage = await ownerOnly(request);
    if (storage instanceof Response) return storage;
    const now = Date.now();
    const all = await storage.listInvites();
    for (const i of all) if (i.expiresAt < now) await storage.deleteInvite(i.id);
    return Response.json({ invites: all.filter((i) => i.expiresAt >= now).sort((a, b) => b.createdAt - a.createdAt) });
  } catch (error) {
    return databaseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const storage = await ownerOnly(request);
    if (storage instanceof Response) return storage;
    const now = Date.now();
    // 24 random hex characters: impossible to guess.
    const invite: Invite = { id: newId(24), createdBy: "owner", createdAt: now, expiresAt: now + WEEK };
    await storage.saveInvite(invite);
    return Response.json({ invite });
  } catch (error) {
    return databaseError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const storage = await ownerOnly(request);
    if (storage instanceof Response) return storage;
    await storage.deleteInvite(request.nextUrl.searchParams.get("id") ?? "");
    return Response.json({ ok: true });
  } catch (error) {
    return databaseError(error);
  }
}
