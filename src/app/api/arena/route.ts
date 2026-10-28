import type { NextRequest } from "next/server";
import { OWNER, sitePassword } from "@/lib/auth";
import { databaseError, signedIn } from "@/lib/server/guard";
import type { Data } from "@/lib/store";

/*
 * The arena: everyone's daily task completion, side by side, plus the tournaments you're in.
 * Only numbers are shared — how many tasks each person had and finished each day — never what
 * the tasks were.
 */

const KEEP_DAYS = 130;

export async function GET(request: NextRequest) {
  try {
    const ctx = await signedIn(request);
    if (ctx instanceof Response) return ctx;
    const { storage, viewer } = ctx;
    const since = new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString().slice(0, 10);

    const accounts = await storage.listAccounts();
    const everyone = [{ id: OWNER, login: "" }, ...accounts.map((a) => ({ id: a.id, login: a.name }))];
    const people = await Promise.all(
      everyone.map(async ({ id, login }) => {
        const data = ((await storage.getDoc(id))?.data ?? {}) as Partial<Data>;
        const days: Record<string, [total: number, done: number]> = {};
        for (const [date, log] of Object.entries(data.days ?? {})) if (date >= since && log.total > 0) days[date] = [log.total, log.done];
        return { id, name: data.settings?.name?.trim() || login || "Owner", days };
      }),
    );

    const tournaments = (await storage.listTournaments())
      .filter((t) => t.participants.includes(viewer.id) || t.createdBy === viewer.id || viewer.role === "owner")
      .sort((a, b) => b.createdAt - a.createdAt);

    return Response.json({ me: viewer.id, role: viewer.role, shared: !!sitePassword(), people, tournaments });
  } catch (error) {
    return databaseError(error);
  }
}
