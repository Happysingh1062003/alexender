"use client";

import { ChevronLeft, ChevronRight, Flame, Target, Timer, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { TaskList } from "@/components/TaskList";
import { Button, Card, PageHeader, ProgressRing, SectionTitle } from "@/components/ui";
import { addDays, formatLong, fromKey, toKey, WEEKDAYS } from "@/lib/date";
import { bestStreak, currentStreak, dayResult, lastNDays, rangeSummary, weekdayAverages, type DayResult } from "@/lib/stats";
import { useClock, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const MOODS = ["😞", "😕", "😐", "🙂", "🔥"];

const heat = (p: number) => `color-mix(in oklab, var(--accent) ${Math.max(8, p * 0.55)}%, transparent)`;

export default function CalendarPage() {
  const today = useClock((s) => s.today);
  const days = useStore((s) => s.days);
  const threshold = useStore((s) => s.settings.winThreshold);
  const [cursor, setCursor] = useState(() => today.slice(0, 7));
  const [selected, setSelected] = useState(today);

  const [year, month] = cursor.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthDates = Array.from({ length: daysInMonth }, (_, i) => toKey(new Date(year, month - 1, i + 1)));
  const leading = first.getDay();
  const summary = rangeSummary(days, monthDates, today, threshold);

  const shift = (n: number) => {
    const d = new Date(year, month - 1 + n, 1);
    setCursor(toKey(d).slice(0, 7));
  };

  return (
    <div className="animate-rise">
      <PageHeader title="Calendar" subtitle="Every day is a battle. Here is the record." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="min-w-0 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-2xl">
              {first.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </h2>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => { setCursor(today.slice(0, 7)); setSelected(today); }}>
                Today
              </Button>
              <Button size="sm" variant="ghost" aria-label="Previous month" onClick={() => shift(-1)}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button size="sm" variant="ghost" aria-label="Next month" onClick={() => shift(1)}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium tracking-wider text-muted uppercase sm:gap-1.5">
            {WEEKDAYS.map((d) => (
              <div key={d} className="pb-1">{d}</div>
            ))}
            {Array.from({ length: leading }, (_, i) => <div key={`pad-${i}`} />)}
            {monthDates.map((date) => {
              const log = days[date];
              const r = dayResult(log, date, today, threshold);
              const has = log && log.total > 0;
              return (
                <button
                  key={date}
                  onClick={() => setSelected(date)}
                  className={cn(
                    "relative flex aspect-square flex-col items-center justify-center rounded-xl text-xs transition sm:text-sm",
                    selected === date ? "ring-2 ring-fg" : "hover:ring-1 hover:ring-line",
                    date === today && "font-bold",
                    date > today && "text-muted",
                  )}
                  style={{ background: has ? heat(log.pct) : "var(--surface-2)" }}
                >
                  <span className="normal-case">{fromKey(date).getDate()}</span>
                  {has && <span className="text-[9px] font-semibold tracking-normal normal-case sm:text-[10px]">{log.pct}%</span>}
                  <ResultBadge result={r} />
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid grid-cols-4 gap-2 text-center">
            <Stat label="Wins" value={summary.wins} tone="success" />
            <Stat label="Losses" value={summary.losses} tone="danger" />
            <Stat label="Average" value={`${summary.avg}%`} />
            <Stat label="Perfect" value={summary.perfect} />
          </div>
        </Card>

        <div className="min-w-0 lg:col-span-2">
          <DayPanel date={selected} />
        </div>
      </div>

      <Insights />
    </div>
  );
}

function ResultBadge({ result }: { result: DayResult }) {
  if (result !== "win" && result !== "loss") return null;
  return (
    <span
      className={cn(
        "absolute top-1 right-1 flex size-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white sm:size-4 sm:text-[9px]",
        result === "win" ? "bg-success" : "bg-danger",
      )}
    >
      {result === "win" ? "W" : "L"}
    </span>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "success" | "danger" }) {
  return (
    <div className="rounded-xl bg-surface-2 py-2.5">
      <p className={cn("text-lg font-semibold tabular-nums", tone === "success" && "text-success", tone === "danger" && "text-danger")}>
        {value}
      </p>
      <p className="text-[10px] tracking-wider text-muted uppercase">{label}</p>
    </div>
  );
}

function DayPanel({ date }: { date: string }) {
  const today = useClock((s) => s.today);
  const log = useStore((s) => s.days[date]);
  const threshold = useStore((s) => s.settings.winThreshold);
  const r = dayResult(log, date, today, threshold);
  const label = { win: "Won", loss: "Lost", live: "In progress", none: date > today ? "Plan ahead" : "No tasks" }[r];

  return (
    <Card>
      <div className="mb-4 flex items-center gap-4">
        <ProgressRing value={log?.pct ?? 0} size={56} stroke={5}>
          <span className="text-xs font-semibold">{log?.pct ?? 0}%</span>
        </ProgressRing>
        <div className="min-w-0">
          <p className="font-medium">{formatLong(date)}</p>
          <p className="text-xs text-muted">
            <span className={cn(r === "win" && "text-success", r === "loss" && "text-danger")}>{label}</span>
            {" · "}
            {log?.done ?? 0}/{log?.total ?? 0} tasks
            {log?.focusMin ? ` · ${log.focusMin}m focus` : ""}
            {log?.mood ? ` · ${MOODS[log.mood - 1]}` : ""}
          </p>
        </div>
      </div>
      <TaskList date={date} compact />
      {(log?.wins || log?.lesson) && (
        <div className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
          {log.wins && (
            <p>
              <span className="text-xs text-muted">Win · </span>
              {log.wins}
            </p>
          )}
          {log.lesson && (
            <p>
              <span className="text-xs text-muted">Lesson · </span>
              {log.lesson}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

function Insights() {
  const today = useClock((s) => s.today);
  const days = useStore((s) => s.days);
  const threshold = useStore((s) => s.settings.winThreshold);

  const stats = useMemo(() => {
    const last30 = rangeSummary(days, lastNDays(today, 30), today, threshold);
    const last7 = rangeSummary(days, lastNDays(today, 7), today, threshold);
    const all = Object.values(days);
    return {
      last7,
      last30,
      streak: currentStreak(days, today, threshold),
      best: bestStreak(days, today, threshold),
      weekdays: weekdayAverages(days, today),
      focusTotal: all.reduce((s, l) => s + (l.focusMin ?? 0), 0),
      tasksDone: all.reduce((s, l) => s + l.done, 0),
    };
  }, [days, today, threshold]);

  // 26 weeks heatmap, columns are weeks ending this week.
  const start = addDays(today, -(7 * 25 + fromKey(today).getDay()));
  const weeks = Array.from({ length: 26 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  const maxWeekday = Math.max(1, ...stats.weekdays.map((v) => v ?? 0));

  return (
    <div className="mt-6">
      <SectionTitle>Insights</SectionTitle>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <InsightTile icon={<Flame className="size-4" />} label="Current streak" value={`${stats.streak}d`} sub={`Best ${stats.best}d`} />
        <InsightTile icon={<Target className="size-4" />} label="7-day average" value={`${stats.last7.avg}%`} sub={`${stats.last7.wins}W · ${stats.last7.losses}L`} />
        <InsightTile icon={<Trophy className="size-4" />} label="30-day average" value={`${stats.last30.avg}%`} sub={`${stats.last30.wins}W · ${stats.last30.losses}L`} />
        <InsightTile
          icon={<Timer className="size-4" />}
          label="Deep focus"
          value={`${Math.floor(stats.focusTotal / 60)}h ${stats.focusTotal % 60}m`}
          sub={`${stats.tasksDone} tasks conquered`}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="min-w-0 lg:col-span-3">
          <SectionTitle>Last 6 months</SectionTitle>
          <div className="no-scrollbar overflow-x-auto">
            <div className="flex w-max gap-[3px]">
              {weeks.map((week) => (
                <div key={week[0]} className="flex flex-col gap-[3px]">
                  {week.map((date) => {
                    const log = days[date];
                    const has = log && log.total > 0 && date <= today;
                    return (
                      <div
                        key={date}
                        title={`${date}${has ? ` · ${log.pct}%` : ""}`}
                        className={cn("size-3 rounded-[3px] sm:size-3.5", date > today && "opacity-0")}
                        style={{ background: has ? heat(log.pct) : "var(--surface-2)" }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted">
            Less
            {[0, 30, 60, 100].map((p) => (
              <span key={p} className="size-3 rounded-[3px]" style={{ background: p ? heat(p) : "var(--surface-2)" }} />
            ))}
            More
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <SectionTitle>Best days of the week</SectionTitle>
          <div className="space-y-2">
            {stats.weekdays.map((v, i) => (
              <div key={WEEKDAYS[i]} className="flex items-center gap-3 text-xs">
                <span className="w-8 text-muted">{WEEKDAYS[i]}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${((v ?? 0) / maxWeekday) * 100}%` }} />
                </div>
                <span className="w-9 text-right tabular-nums">{v === null ? "–" : `${v}%`}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function InsightTile({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <span className="text-accent">{icon}</span>
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted">{sub}</p>
    </Card>
  );
}
