import type { NextRequest } from "next/server";
import { OWNER } from "@/lib/auth";
import { databaseError, signedIn } from "@/lib/server/guard";
import type { Tournament, TournamentGoal } from "@/lib/server/storage";

const GOALS: TournamentGoal[] = ["quest", "days", "tasks", "streak"];
const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);

/** Start a tournament. Anyone signed in can; the people in it are chosen from everyone on the site. */
export async function POST(request: NextRequest) {
  try {
    const ctx = await signedIn(request);
    if (ctx instanceof Response) return ctx;
    const { storage, viewer } = ctx;
    const body = (await request.json().catch(() => ({}))) as Partial<Tournament>;

    const name = typeof body.name === "string" ? body.name.trim().slice(0, 60) : "";
    const goal = GOALS.includes(body.goal as TournamentGoal) ? (body.goal as TournamentGoal) : null;
    // A quest: one main goal and the tasks that make it up — finishing them all first wins.
    const mainGoal = typeof body.mainGoal === "string" ? body.mainGoal.trim().slice(0, 120) : "";
    const tasks = (Array.isArray(body.tasks) ? body.tasks : [])
      .map((t) => (typeof t?.text === "string" ? t.text.trim().slice(0, 120) : ""))
      .filter(Boolean)
      .slice(0, 50)
      .map((text) => ({ id: newId(), text }));
    if (goal === "quest" && (!mainGoal || tasks.length === 0)) return Response.json({ error: "Write the main goal and add at least one task." }, { status: 400 });
    const target = goal === "quest" ? tasks.length : Math.round(Number(body.target));
    const line = Math.round(Number(body.line ?? 70));
    const start = typeof body.start === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.start) ? body.start : null;
    if (!name || !goal || !start) return Response.json({ error: "Give it a name, a goal and a start date." }, { status: 400 });
    if (!(target >= 1 && target <= (goal === "tasks" ? 10_000 : 365))) return Response.json({ error: "Choose a sensible number of steps." }, { status: 400 });
    if (!(line >= 10 && line <= 100)) return Response.json({ error: "The win line must be between 10% and 100%." }, { status: 400 });

    const known = new Set([OWNER, ...(await storage.listAccounts()).map((a) => a.id)]);
    const chosen = Array.isArray(body.participants) ? body.participants.filter((p): p is string => typeof p === "string" && known.has(p)) : [...known];
    const participants = [...new Set([viewer.id, ...chosen])];
    if (participants.length < 2) return Response.json({ error: "A tournament needs at least two people." }, { status: 400 });

    const tournament: Tournament = {
      id: newId(),
      name,
      goal,
      target,
      line,
      start,
      participants,
      createdBy: viewer.id,
      createdAt: Date.now(),
      ...(goal === "quest" && { mainGoal, tasks, progress: {} }),
    };
    await storage.saveTournament(tournament);
    return Response.json({ tournament });
  } catch (error) {
    return databaseError(error);
  }
}

/** Quest: tick or untick one of its tasks for yourself. */
export async function PATCH(request: NextRequest) {
  try {
    const ctx = await signedIn(request);
    if (ctx instanceof Response) return ctx;
    const body = (await request.json().catch(() => ({}))) as { id?: string; taskId?: string; done?: boolean };
    const t = (await ctx.storage.listTournaments()).find((x) => x.id === body.id);
    if (!t || t.goal !== "quest") return Response.json({ error: "Not found" }, { status: 404 });
    if (!t.participants.includes(ctx.viewer.id)) return Response.json({ error: "You're not in this tournament." }, { status: 403 });
    if (!t.tasks?.some((x) => x.id === body.taskId)) return Response.json({ error: "No such task" }, { status: 400 });
    // Finishing is final: once every task is ticked, the result can't be changed by unticking.
    const mine = t.progress?.[ctx.viewer.id] ?? {};
    if (!body.done && t.tasks.every((x) => mine[x.id])) return Response.json({ error: "You've finished — that's locked in." }, { status: 400 });
    const updated = await ctx.storage.markQuestTask(t.id, ctx.viewer.id, body.taskId!, body.done ? Date.now() : null);
    return Response.json({ tournament: updated });
  } catch (error) {
    return databaseError(error);
  }
}

/** End a tournament early — whoever started it, or the owner. */
export async function DELETE(request: NextRequest) {
  try {
    const ctx = await signedIn(request);
    if (ctx instanceof Response) return ctx;
    const id = request.nextUrl.searchParams.get("id");
    const t = (await ctx.storage.listTournaments()).find((x) => x.id === id);
    if (!t) return Response.json({ error: "Not found" }, { status: 404 });
    if (t.createdBy !== ctx.viewer.id && ctx.viewer.role !== "owner") return Response.json({ error: "Only whoever started it can end it." }, { status: 403 });
    await ctx.storage.deleteTournament(t.id);
    return Response.json({ ok: true });
  } catch (error) {
    return databaseError(error);
  }
}
