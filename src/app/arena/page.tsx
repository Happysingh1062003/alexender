"use client";

import { Crown, Flag, Plus, Target, Trash2, Trophy, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { confirmDialog } from "@/components/dialog";
import { Button, Checkbox, Input, Modal, Segmented, toast } from "@/components/ui";
import { addDays, fromKey } from "@/lib/date";
import { useClock, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/*
 * The Arena — everyone you invited, racing on one thing: finishing today's tasks.
 * Today is a chariot race; the week is a leaderboard; tournaments are a road of steps, and the
 * first to the end wins. Only numbers are shared, never what the tasks are.
 */

type Goal = "quest" | "days" | "tasks" | "streak";
interface Tournament {
  id: string;
  name: string;
  goal: Goal;
  target: number;
  line: number;
  start: string;
  participants: string[];
  createdBy: string;
  createdAt: number;
  mainGoal?: string;
  tasks?: { id: string; text: string }[];
  progress?: Record<string, Record<string, number>>;
}
interface Racer {
  id: string;
  name: string;
  days: Record<string, [total: number, done: number]>;
}
interface Arena {
  me: string;
  role: "owner" | "member";
  shared: boolean;
  people: Racer[];
  tournaments: Tournament[];
}

const WIN_LINE = 70; // a day counts as won at 70% — the same line for everyone, so it's fair
const pctOf = (log?: [number, number]) => (log && log[0] > 0 ? Math.round((log[1] / log[0]) * 100) : 0);
const first = (name: string) => name.trim().slice(0, 1).toUpperCase() || "?";

/** Everyone's numbers, refreshed every 20 seconds while you watch. */
function useArena() {
  const [arena, setArena] = useState<Arena | null>(null);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    fetch("/api/arena", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Arena>) : Promise.reject(r.status)))
      .then((a) => alive && (setArena(a), setFailed(false)))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [tick]);
  useEffect(() => {
    const refresh = () => !document.hidden && setTick((t) => t + 1);
    const id = setInterval(refresh, 20_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return { arena, failed, reload: () => setTick((t) => t + 1) };
}

export default function ArenaPage() {
  const today = useClock((s) => s.today);
  const myDays = useStore((s) => s.days);
  const myName = useStore((s) => s.settings.name);
  const { arena, failed, reload } = useArena();
  const [creating, setCreating] = useState(false);

  // Your own row comes straight from this device, so it moves the moment you tick a task.
  const people = useMemo<Racer[]>(() => {
    const mine: Racer["days"] = {};
    for (const [d, log] of Object.entries(myDays)) if (log.total > 0) mine[d] = [log.total, log.done];
    if (!arena) return [{ id: "me", name: myName || "You", days: mine }];
    return arena.people.map((p) => (p.id === arena.me ? { ...p, name: myName || p.name, days: mine } : p));
  }, [arena, myDays, myName]);
  const me = arena?.me ?? "me";

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-8 flex items-end justify-between gap-4">
        <h1 className="text-[26px] leading-tight font-semibold tracking-tight">Arena</h1>
        {arena && people.length > 1 && (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line-strong px-4 text-[13px] font-medium text-muted transition-colors hover:border-faint hover:text-fg"
          >
            <Plus className="size-3.5" /> Tournament
          </button>
        )}
      </header>

      {failed && !arena && <p className="mb-6 text-[13px] text-faint">The arena needs sync — open Settings → Sync across devices to see why it&apos;s off.</p>}

      <Race people={people} me={me} today={today} />
      {people.length === 1 && (
        <p className="mt-6 text-[13px] leading-relaxed text-faint">
          You&apos;re racing yourself today.{" "}
          {arena?.role === "owner" || !arena ? (
            <>
              Invite people in{" "}
              <Link href="/settings" className="text-muted underline underline-offset-4">
                Settings → People
              </Link>{" "}
              and race them here.
            </>
          ) : null}
        </p>
      )}

      {people.length > 1 && <Week people={people} me={me} today={today} />}

      {arena && arena.tournaments.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-[13px] font-medium text-muted">Tournaments</h2>
          <div className="space-y-8">
            {arena.tournaments.map((t) => (
              <TournamentCard key={t.id} t={t} people={people} me={me} canEnd={t.createdBy === me || arena.role === "owner"} today={today} onEnded={reload} />
            ))}
          </div>
        </section>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="New tournament">
        {creating && arena && (
          <NewTournament
            people={people}
            me={me}
            today={today}
            onDone={() => {
              setCreating(false);
              reload();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

// ---------- Today: the chariot race ----------

function Race({ people, me, today }: { people: Racer[]; me: string; today: string }) {
  const lanes = people
    .map((p) => {
      const log = p.days[today];
      return { ...p, total: log?.[0] ?? 0, done: log?.[1] ?? 0, pct: pctOf(log) };
    })
    .sort((a, b) => b.pct - a.pct || b.done - a.done || a.name.localeCompare(b.name));
  const lead = lanes[0];
  const mine = lanes.find((l) => l.id === me);
  const leaders = lanes.filter((l) => l.pct === lead.pct && l.pct > 0);

  // One line of commentary, like a herald at the games.
  let call = "The gates are open. The first task takes the lead.";
  if (mine && mine.total === 0) call = "Add tasks on Today to enter the race.";
  else if (lead.pct === 100 && leaders.length === 1) call = lead.id === me ? "You crossed the line first. Glory." : `${lead.name} has crossed the line.`;
  else if (leaders.length > 1 && leaders.some((l) => l.id === me)) call = "Neck and neck — you're tied for the lead.";
  else if (lead.pct > 0 && lead.id === me) {
    const second = lanes[1];
    call = second ? `You lead by ${lead.pct - second.pct} points. Keep the whip up.` : "You lead.";
  } else if (lead.pct > 0 && mine && mine.total > 0) {
    // Passing means a higher %; against someone at 100%, the best is to finish too.
    const goal = lead.pct >= 100 ? mine.total : Math.min(mine.total, Math.floor((lead.pct * mine.total) / 100) + 1);
    const need = Math.max(1, goal - mine.done);
    call = lead.pct >= 100 ? `${lead.name} has finished. ${need} more to finish too.` : `${lead.name} leads. ${need} more task${need === 1 ? "" : "s"} to pass them.`;
  }

  return (
    <section>
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h2 className="text-[13px] font-medium text-muted">Today&apos;s race</h2>
        <span className="text-[11.5px] text-faint">to 100% of the day&apos;s tasks</span>
      </div>
      <p className="mb-6 text-[15px] leading-snug">{call}</p>
      <ol className="space-y-5">
        {lanes.map((l, i) => {
          const you = l.id === me;
          const leading = l.pct > 0 && l.pct === lead.pct;
          const finished = l.pct >= 100;
          return (
            <li key={l.id}>
              <div className="mb-2 flex items-baseline gap-2 text-[13px]">
                <span className="w-4 shrink-0 text-faint tabular-nums">{i + 1}</span>
                <span className={cn("min-w-0 flex-1 break-words", you && "font-medium text-crystal")}>
                  {l.name}
                  {you && <span className="text-faint"> · you</span>}
                </span>
                <span className="shrink-0 text-faint tabular-nums">
                  {l.total ? `${l.done}/${l.total} · ` : ""}
                  <span className={cn("font-semibold", finished ? "text-crystal" : "text-fg")}>{l.pct}%</span>
                </span>
              </div>
              {/* The track: the token rides to the flag at 100%. */}
              <div className="relative ml-6 h-8">
                <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-surface-3" />
                <div className={cn("absolute top-1/2 left-0 h-[3px] -translate-y-1/2 rounded-full transition-[width] duration-700 ease-[var(--ease-out)]", you ? "bg-crystal/70" : "bg-fg/35")} style={{ width: `${l.pct}%` }} />
                <Flag className="absolute top-1/2 right-0 size-3.5 -translate-y-full text-faint" />
                <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-700 ease-[var(--ease-out)]" style={{ left: `clamp(14px, ${l.pct}%, calc(100% - 14px))` }}>
                  {leading && <Crown className="absolute -top-3.5 left-1/2 size-3.5 -translate-x-1/2 text-crystal" strokeWidth={2} />}
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full text-[12px] font-semibold",
                      you ? "bg-crystal text-bg" : "bg-surface-3 text-fg ring-1 ring-line-strong",
                      finished && "shadow-[0_0_0_4px_color-mix(in_oklab,var(--crystal)_25%,transparent)]",
                    )}
                  >
                    {first(l.name)}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ---------- This week: the leaderboard ----------

function Week({ people, me, today }: { people: Racer[]; me: string; today: string }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const rows = people
    .map((p) => {
      const pcts = days.map((d) => (p.days[d] ? pctOf(p.days[d]) : null));
      let streak = 0;
      for (let d = pctOf(p.days[today]) >= WIN_LINE ? today : addDays(today, -1); pctOf(p.days[d]) >= WIN_LINE; d = addDays(d, -1)) streak++;
      return { ...p, pcts, points: pcts.reduce<number>((n, v) => n + (v ?? 0), 0), won: pcts.filter((v) => v !== null && v >= WIN_LINE).length, streak };
    })
    .sort((a, b) => b.points - a.points || b.won - a.won);

  return (
    <section className="mt-14">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-[13px] font-medium text-muted">This week</h2>
        <span className="text-[11.5px] text-faint">a point for every % · won at {WIN_LINE}%</span>
      </div>
      <ol className="divide-y divide-line">
        {rows.map((r, i) => (
          <li key={r.id} className="flex items-center gap-3 py-3">
            <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums", i === 0 ? "bg-crystal text-bg" : "text-faint")}>
              {i === 0 ? <Trophy className="size-3.5" strokeWidth={2.2} /> : i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn("block text-[14px] break-words", r.id === me && "font-medium text-crystal")}>{r.name}</span>
              <span className="mt-1 flex gap-1">
                {r.pcts.map((v, j) => (
                  <span
                    key={j}
                    title={v === null ? "no tasks" : `${v}%`}
                    className={cn("h-1.5 w-3 rounded-full", v === null ? "bg-surface-2" : v >= WIN_LINE ? "bg-crystal" : v > 0 ? "bg-fg/35" : "bg-danger/35")}
                  />
                ))}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-[15px] font-semibold tabular-nums">{r.points}</span>
              <span className="block text-[11px] text-faint tabular-nums">
                {r.won} won{r.streak > 1 ? ` · ${r.streak}-day streak` : ""}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ---------- Tournaments: first to the end of the road ----------

const GOAL_TEXT: Record<Goal, (n: number, line: number) => string> = {
  quest: (n) => `First to finish all ${n} task${n === 1 ? "" : "s"}`,
  days: (n, line) => `First to ${n} winning day${n === 1 ? "" : "s"} (${line}%+)`,
  tasks: (n) => `First to ${n} task${n === 1 ? "" : "s"} done`,
  streak: (n, line) => `First to a ${n}-day streak (${line}%+)`,
};

/** A tick stamped with the moment it happened (until the server's own time replaces it). */
const ticked = (mine: Record<string, number>, taskId: string, done: boolean) => ({ ...mine, [taskId]: done ? Date.now() : 0 });

const dayOf = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** How far someone is, and when they reached the end (if they have). */
function progressOf(t: Tournament, days: Racer["days"], today: string, who: string): { value: number; reachedOn?: string; at?: number } {
  if (t.goal === "quest") {
    // Finished when every task is ticked; the moment of the last tick decides who was first.
    const mine = t.progress?.[who] ?? {};
    const ticks = (t.tasks ?? []).map((x) => mine[x.id]).filter((v): v is number => !!v);
    const done = ticks.length === t.target && t.target > 0;
    const at = done ? Math.max(...ticks) : undefined;
    return { value: ticks.length, at, reachedOn: at ? dayOf(at) : undefined };
  }
  let value = 0;
  let run = 0;
  let reachedOn: string | undefined;
  for (let d = t.start, i = 0; d <= today && i < 400; d = addDays(d, 1), i++) {
    const log = days[d];
    const won = !!log && pctOf(log) >= t.line;
    if (t.goal === "days") value += won ? 1 : 0;
    else if (t.goal === "tasks") value += log?.[1] ?? 0;
    else {
      // Today is still open: not having won it yet doesn't break the streak.
      run = won ? run + 1 : d === today ? run : 0;
      value = run;
    }
    if (!reachedOn && value >= t.target) reachedOn = d;
  }
  return { value: reachedOn ? t.target : Math.min(value, t.target), reachedOn };
}

function TournamentCard({ t: shared, people, me, canEnd, today, onEnded }: { t: Tournament; people: Racer[]; me: string; canEnd: boolean; today: string; onEnded: () => void }) {
  // Your own ticks show at once; the server's copy replaces this on the next refresh.
  const [t, setT] = useState(shared);
  const [seen, setSeen] = useState(shared);
  if (seen !== shared) {
    setSeen(shared);
    setT(shared);
  }
  const quest = t.goal === "quest";
  const entrants = t.participants
    .map((id) => people.find((p) => p.id === id))
    .filter((p): p is Racer => !!p)
    .map((p) => ({ ...p, ...progressOf(t, p.days, today, p.id) }))
    .sort((a, b) => (a.at ?? Infinity) - (b.at ?? Infinity) || (a.reachedOn ?? "9999").localeCompare(b.reachedOn ?? "9999") || b.value - a.value);
  // Quests are decided to the moment; the other races by the day.
  const best = entrants[0];
  const winners = quest ? (best?.at ? entrants.filter((e) => e.at === best.at) : []) : best?.reachedOn ? entrants.filter((e) => e.reachedOn === best.reachedOn) : [];
  const finishDay = winners[0]?.reachedOn;
  const mine = t.progress?.[me] ?? {};
  const inIt = t.participants.includes(me);
  const finished = quest && (t.tasks ?? []).every((x) => mine[x.id]);

  const tick = async (taskId: string, done: boolean) => {
    const before = t;
    setT({ ...t, progress: { ...t.progress, [me]: ticked(mine, taskId, done) } });
    const res = await fetch("/api/tournaments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: t.id, taskId, done }) }).catch(() => null);
    const data = (res ? await res.json().catch(() => ({})) : { error: "You're offline." }) as { tournament?: Tournament; error?: string };
    if (!res?.ok || !data.tournament) {
      setT(before);
      return toast(data.error ?? "Couldn't save that");
    }
    setT(data.tournament);
    const all = (data.tournament.tasks ?? []).every((x) => data.tournament!.progress?.[me]?.[x.id]);
    if (done && all) toast(winners.length === 0 ? "Every task done — you finished first!" : "Every task done — you finished!");
  };
  const started = t.start <= today;
  const stones = t.target <= 21;

  return (
    <article className="rounded-2xl bg-surface p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] leading-snug font-semibold break-words">{t.name}</h3>
          <p className="mt-0.5 text-[12px] text-faint">
            {GOAL_TEXT[t.goal](t.target, t.line)}
            {!quest && ` · ${started ? "since" : "starts"} ${fromKey(t.start).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`}
          </p>
        </div>
        {canEnd && (
          <button
            aria-label="End this tournament"
            onClick={async () => {
              if (!(await confirmDialog(`End “${t.name}”?`, { detail: "It disappears for everyone in it.", danger: true, confirmLabel: "End it" }))) return;
              const res = await fetch(`/api/tournaments?id=${encodeURIComponent(t.id)}`, { method: "DELETE" }).catch(() => null);
              if (!res?.ok) return toast("Couldn't end it");
              onEnded();
            }}
            className="hit -mr-1 flex size-8 shrink-0 items-center justify-center rounded-full text-faint transition-colors hover:text-danger"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>

      {winners.length > 0 && (
        <p className="animate-fade mt-3 flex items-center gap-2 rounded-xl bg-crystal-soft px-3 py-2 text-[13px] text-crystal">
          <Crown className="size-4 shrink-0" strokeWidth={2} />
          {winners.map((w) => (w.id === me ? "You" : w.name)).join(" & ")} won on {fromKey(finishDay!).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
          {quest && winners[0]?.at ? ` at ${new Date(winners[0].at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}` : ""}
        </p>
      )}

      {quest && (
        <div className="mt-4">
          <p className="flex items-start gap-2 text-[15px] leading-snug font-medium">
            <Target className="mt-0.5 size-4 shrink-0 text-crystal" />
            <span className="break-words">{t.mainGoal}</span>
          </p>
          {/* Your checklist: tick as you go. Finishing every task locks it in. */}
          <ul className="mt-3 space-y-0.5">
            {(t.tasks ?? []).map((task) => {
              const done = !!mine[task.id];
              return (
                <li key={task.id} className="flex min-h-10 items-center gap-3">
                  {inIt ? (
                    <Checkbox size="sm" checked={done} label={task.text} onChange={() => !finished && tick(task.id, !done)} />
                  ) : (
                    <span className="size-4 shrink-0 rounded-full border-[1.5px] border-line-strong" />
                  )}
                  <span className={cn("min-w-0 flex-1 text-[14px] leading-snug break-words", done && "text-faint line-through")}>{task.text}</span>
                </li>
              );
            })}
          </ul>
          {finished && <p className="mt-1 text-[12px] text-faint">You finished — locked in.</p>}
        </div>
      )}

      <ul className="mt-4 space-y-3.5">
        {entrants.map((e) => {
          const you = e.id === me;
          return (
            <li key={e.id}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
                <span className={cn("min-w-0 break-words", you && "font-medium text-crystal")}>
                  {e.name}
                  {winners.some((w) => w.id === e.id) && <Crown className="ml-1.5 inline size-3.5 align-[-2px] text-crystal" strokeWidth={2} />}
                </span>
                <span className="shrink-0 text-faint tabular-nums">
                  {e.value}/{t.target}
                </span>
              </div>
              {stones ? (
                // The road: one stone per step.
                <div className="flex gap-1">
                  {Array.from({ length: t.target }, (_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-2 flex-1 rounded-full transition-colors duration-500",
                        i < e.value ? (you ? "bg-crystal" : "bg-fg/55") : "bg-surface-3",
                        i === t.target - 1 && "ring-1 ring-crystal/40",
                      )}
                    />
                  ))}
                </div>
              ) : (
                <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                  <div className={cn("h-full rounded-full transition-[width] duration-700", you ? "bg-crystal" : "bg-fg/55")} style={{ width: `${(e.value / t.target) * 100}%` }} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </article>
  );
}

function NewTournament({ people, me, today, onDone }: { people: Racer[]; me: string; today: string; onDone: () => void }) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState<Goal>("quest");
  const [mainGoal, setMainGoal] = useState("");
  const [tasks, setTasks] = useState<string[]>([]);
  const [taskText, setTaskText] = useState("");
  const [target, setTarget] = useState("7");
  const [line, setLine] = useState(70);
  const [start, setStart] = useState(today);
  const [who, setWho] = useState<string[]>(people.map((p) => p.id));
  const [error, setError] = useState("");
  const n = goal === "quest" ? tasks.length : Math.round(Number(target)) || 0;
  const addTask = () => {
    const text = taskText.trim();
    if (!text) return;
    setTasks((list) => [...list, text]);
    setTaskText("");
  };

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        const res = await fetch("/api/tournaments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, goal, target: n, line, start, participants: who, ...(goal === "quest" && { mainGoal, tasks: tasks.map((text) => ({ text })) }) }),
        }).catch(() => null);
        const data = (res ? await res.json().catch(() => ({})) : { error: "You're offline." }) as { error?: string };
        if (!res?.ok) return setError(data.error ?? "Couldn't start it.");
        toast("Tournament started");
        onDone();
      }}
      className="space-y-5"
    >
      <label className="block">
        <span className="mb-1.5 block text-[12px] text-faint">Name</span>
        <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={goal === "quest" ? "Fit by December" : "The November Olympiad"} />
      </label>

      <div>
        <span className="mb-1.5 block text-[12px] text-faint">How to win</span>
        <Segmented
          value={goal}
          onChange={(g) => {
            setGoal(g);
            setTarget(g === "tasks" ? "50" : g === "streak" ? "5" : "7");
          }}
          options={[
            { value: "quest", label: "Goal" },
            { value: "days", label: "Days" },
            { value: "tasks", label: "Tasks" },
            { value: "streak", label: "Streak" },
          ]}
        />
      </div>

      {goal === "quest" && (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-[12px] text-faint">Main goal</span>
            <Input value={mainGoal} onChange={(e) => setMainGoal(e.target.value)} placeholder="Run 5 km without stopping" />
          </label>
          <div>
            <span className="mb-1.5 block text-[12px] text-faint">Tasks to get there · whoever finishes them all first wins</span>
            {tasks.length > 0 && (
              <ol className="mb-2 space-y-1">
                {tasks.map((text, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg bg-surface-2 py-1 pr-1 pl-3 text-[13.5px]">
                    <span className="w-4 shrink-0 text-faint tabular-nums">{i + 1}</span>
                    <span className="min-w-0 flex-1 break-words">{text}</span>
                    <button type="button" aria-label={`Remove ${text}`} onClick={() => setTasks((list) => list.filter((_, j) => j !== i))} className="flex size-8 items-center justify-center text-faint hover:text-danger">
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ol>
            )}
            <div className="flex gap-2">
              <Input
                value={taskText}
                onChange={(e) => setTaskText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  addTask();
                }}
                placeholder={tasks.length ? "Add another task" : "Run 1 km"}
                enterKeyHint="next"
              />
              <Button type="button" variant="outline" onClick={addTask} disabled={!taskText.trim()}>
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {goal !== "quest" && (
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-[12px] text-faint">Steps to the finish</span>
          <Input inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value.replace(/\D/g, ""))} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] text-faint">Starts</span>
          <Input type="date" value={start} onChange={(e) => e.target.value && setStart(e.target.value)} />
        </label>
      </div>
      )}

      {goal !== "tasks" && goal !== "quest" && (
        <label className="block">
          <span className="mb-1 flex justify-between text-[12px] text-faint">
            A day is won at <span className="font-mono text-fg">{line}%</span>
          </span>
          <input type="range" min={50} max={100} step={5} value={line} onChange={(e) => setLine(Number(e.target.value))} className="h-8 w-full accent-[var(--crystal)]" />
        </label>
      )}

      <div>
        <span className="mb-1.5 block text-[12px] text-faint">Who&apos;s in</span>
        <div className="flex flex-wrap gap-1.5">
          {people.map((p) => {
            const on = who.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                disabled={p.id === me}
                aria-pressed={on}
                onClick={() => setWho((w) => (on ? w.filter((x) => x !== p.id) : [...w, p.id]))}
                className={cn("h-9 rounded-full border px-3.5 text-[13px] transition-colors", on ? "border-crystal/60 text-fg" : "border-line text-faint", p.id === me && "opacity-80")}
              >
                {p.id === me ? "You" : p.name}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-[12.5px] text-muted">
        {n > 0 ? `${GOAL_TEXT[goal](n, line)}. The first to get there wins.` : goal === "quest" ? "Add the tasks that make up the goal." : "Choose how many steps to the finish."}
      </p>
      {error && <p className="text-[12px] text-danger">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={!name.trim() || n < 1 || who.length < 2 || (goal === "quest" && !mainGoal.trim())}>
          Start the tournament
        </Button>
      </div>
    </form>
  );
}
