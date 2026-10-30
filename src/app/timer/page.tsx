"use client";

import { Play, Square, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { confirmDialog } from "@/components/dialog";
import { ProgressBar } from "@/components/ui";
import { addDays, fromKey } from "@/lib/date";
import { byOrder, useClock, useStore } from "@/lib/store";
import { formatClock, isRunning, sessionMinutes, totalsByTask } from "@/lib/timer";
import type { TimerSession } from "@/lib/types";
import { cn, formatMinutes } from "@/lib/utils";

const PRESETS = [15, 25, 45, 60, 90];

/** Start timing now. "Until" wins when set: today at that time, or tomorrow if it has passed. */
function begin(title: string, minutes: number, until: string) {
  const { addTimerTask, startTimer } = useStore.getState();
  const start = Date.now();
  let end = start + minutes * 60_000;
  if (until) {
    const [h, m] = until.split(":").map(Number);
    const at = new Date(start);
    at.setHours(h, m, 0, 0);
    if (at.getTime() <= start) at.setDate(at.getDate() + 1);
    end = at.getTime();
  }
  startTimer(addTimerTask(title), end);
}

const clockTime = (ms: number) => new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

/** The clock every second, only while something is running. */
function useTicking(active: boolean) {
  const base = useClock((s) => s.now);
  const [now, setNow] = useState(base);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return Math.max(now, base);
}

/** Timer — pick a task, choose when it ends, and see where your time goes each day. */
export default function TimerPage() {
  const today = useClock((s) => s.today);
  const sessions = useStore((s) => s.timerSessions);
  const hasRunning = sessions.some((s) => !s.endedAt);
  const now = useTicking(hasRunning);
  const running = sessions.find((s) => isRunning(s, now));

  return (
    <div className="mx-auto max-w-xl">
      <header className="mb-8">
        <h1 className="text-[26px] leading-tight font-semibold tracking-tight">Timer</h1>
      </header>

      {running ? <Running session={running} now={now} /> : <StartForm />}

      <Today sessions={sessions} today={today} now={now} />
      <LastWeek sessions={sessions} today={today} now={now} />
    </div>
  );
}

function Running({ session, now }: { session: TimerSession; now: number }) {
  const stopTimer = useStore((s) => s.stopTimer);
  const total = session.endsAt - session.startedAt;
  const left = session.endsAt - now;
  return (
    <section className="animate-fade text-center">
      {/* The ring empties as time runs out; it breathes slowly while you work. */}
      <div className="relative mx-auto aspect-square w-[min(78vw,300px)]">
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r="46" fill="none" stroke="var(--surface-3)" strokeWidth="1.6" />
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="var(--crystal)"
            strokeWidth="1.8"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="100"
            strokeDashoffset={100 - Math.max(0, Math.min(100, (left / total) * 100))}
            className="breathe transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
          <p className="max-w-full truncate text-[13px] text-muted">{session.title}</p>
          <p className="mt-1 text-[52px] leading-none font-semibold tracking-[-0.04em] tabular-nums sm:text-[60px]">{formatClock(left)}</p>
          <p className="mt-2 text-[12px] text-faint tabular-nums">ends {clockTime(session.endsAt)}</p>
        </div>
      </div>
      <button
        onClick={() => stopTimer(session.id)}
        className="mt-8 inline-flex h-11 items-center gap-2 rounded-full border border-line-strong px-6 text-[14px] font-medium text-muted transition-colors hover:border-faint hover:text-fg active:scale-95"
      >
        <Square className="size-3.5" fill="currentColor" /> Stop
      </button>
    </section>
  );
}

function StartForm() {
  const tasks = useStore((s) => s.timerTasks);
  const deleteTimerTask = useStore((s) => s.deleteTimerTask);
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState<number | null>(25);
  const [until, setUntil] = useState("");
  const list = useMemo(() => [...tasks].sort(byOrder), [tasks]);

  const ready = title.trim() && (until || minutes);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        begin(title.trim(), minutes ?? 25, until);
      }}
      className="animate-fade"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What are you working on?"
        aria-label="Task"
        className="h-12 w-full border-b border-line bg-transparent text-[16px] outline-none placeholder:text-faint focus:border-line-strong"
      />
      {list.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {list.map((t) => (
            <span
              key={t.id}
              className={cn(
                "group inline-flex h-9 items-center rounded-full border text-[13px] transition-colors",
                title.trim().toLowerCase() === t.title.toLowerCase() ? "border-crystal/60 text-fg" : "border-line text-muted hover:border-line-strong",
              )}
            >
              <button type="button" onClick={() => setTitle(t.title)} className="h-full pr-1 pl-3">
                {t.title}
              </button>
              <button
                type="button"
                aria-label={`Remove ${t.title}`}
                onClick={async () => (await confirmDialog(`Remove “${t.title}” from your tasks?`, { detail: "Time already recorded stays.", danger: true, confirmLabel: "Remove" })) && deleteTimerTask(t.id)}
                className="flex h-full w-8 items-center justify-center text-faint opacity-60 hover:text-danger hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <p className="mt-7 mb-2 text-[12px] text-faint">Ends after</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMinutes(m);
              setUntil("");
            }}
            aria-pressed={!until && minutes === m}
            className={cn(
              "h-9 rounded-full px-3.5 text-[13px] font-medium tabular-nums transition-colors",
              !until && minutes === m ? "bg-surface-3 text-fg" : "text-muted hover:text-fg",
            )}
          >
            {m < 60 ? `${m}m` : formatMinutes(m)}
          </button>
        ))}
        <label className={cn("ml-1 inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[13px]", until ? "border-crystal/60 text-fg" : "border-line text-muted")}>
          Until
          <input type="time" value={until} onChange={(e) => setUntil(e.target.value)} aria-label="End at" className="h-full bg-transparent text-[13px] text-fg outline-none [color-scheme:dark]" />
        </label>
      </div>

      <button
        type="submit"
        disabled={!ready}
        className="mt-8 inline-flex h-11 items-center gap-2 rounded-full bg-fg px-6 text-[14px] font-medium text-bg transition-[transform,opacity] active:scale-95 disabled:opacity-30"
      >
        <Play className="size-3.5" fill="currentColor" /> Start
      </button>
    </form>
  );
}

function Today({ sessions, today, now }: { sessions: TimerSession[]; today: string; now: number }) {
  const deleteSession = useStore((s) => s.deleteSession);
  const totals = totalsByTask(sessions, today, now);
  const sum = totals.reduce((n, t) => n + t.minutes, 0);
  const todays = sessions.filter((s) => s.date === today).sort((a, b) => b.startedAt - a.startedAt);
  if (!todays.length) return null;
  return (
    <section className="mt-14">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-[13px] font-medium text-muted">Today</h2>
        <p className="text-[15px] font-semibold tabular-nums">{formatMinutes(sum)}</p>
      </div>
      <ul className="space-y-3">
        {totals.map((t) => (
          <li key={t.title}>
            <div className="mb-1.5 flex justify-between text-[14px]">
              <span className="min-w-0 break-words">{t.title}</span>
              <span className="text-muted tabular-nums">{formatMinutes(t.minutes)}</span>
            </div>
            <ProgressBar value={sum ? (t.minutes / sum) * 100 : 0} />
          </li>
        ))}
      </ul>

      <ul className="mt-6 space-y-0.5 text-[12.5px] text-faint">
        {todays.map((s) => (
          <li key={s.id} className="group flex items-center gap-3 tabular-nums">
            <span className="w-32 shrink-0">
              {clockTime(s.startedAt)} – {s.endedAt || now >= s.endsAt ? clockTime(s.endedAt ?? s.endsAt) : "now"}
            </span>
            <span className="min-w-0 flex-1 break-words text-muted">{s.title}</span>
            <span>{formatMinutes(sessionMinutes(s, now))}</span>
            <button
              aria-label="Delete this session"
              onClick={async () => (await confirmDialog("Delete this session?", { danger: true })) && deleteSession(s.id)}
              className="flex size-7 items-center justify-center rounded-full opacity-60 hover:text-danger hover:opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The last seven days: how long, and on what. */
function LastWeek({ sessions, today, now }: { sessions: TimerSession[]; today: string; now: number }) {
  const days = Array.from({ length: 6 }, (_, i) => addDays(today, -(i + 1)));
  const rows = days.map((date) => {
    const totals = totalsByTask(sessions, date, now);
    return { date, totals, sum: totals.reduce((n, t) => n + t.minutes, 0) };
  });
  const max = Math.max(1, ...rows.map((r) => r.sum));
  if (!rows.some((r) => r.sum > 0)) return null;
  return (
    <section className="mt-14">
      <h2 className="mb-4 text-[13px] font-medium text-muted">Earlier this week</h2>
      <ul className="space-y-4">
        {rows.map((r) => (
          <li key={r.date}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
              <span className="text-muted">{fromKey(r.date).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}</span>
              <span className="font-medium tabular-nums">{r.sum ? formatMinutes(r.sum) : "—"}</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-fg/60" style={{ width: `${(r.sum / max) * 100}%` }} />
            </div>
            {r.totals.length > 0 && (
              <p className="mt-1.5 text-[12px] leading-relaxed text-faint">{r.totals.map((t) => `${t.title} ${formatMinutes(t.minutes)}`).join(" · ")}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
