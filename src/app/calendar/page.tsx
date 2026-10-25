"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TaskList } from "@/components/TaskList";
import { SectionTop } from "@/components/ui";
import { addDays, formatShort, fromKey, toKey, WEEKDAYS } from "@/lib/date";
import { currentStreak, dayResult, lastNDays, rangeSummary, type DayResult } from "@/lib/stats";
import { useClock, useStore } from "@/lib/store";
import { cn, formatMinutes, parseQuickTask } from "@/lib/utils";

/** Day colour: green for a successful day, grey otherwise — stronger the more you finished. */
const dayFill = (pct: number, win: boolean) =>
  `color-mix(in oklab, ${win ? "var(--success)" : "var(--fg)"} ${win ? 14 + pct * 0.16 : 4 + pct * 0.1}%, transparent)`;

const RESULT_TEXT: Record<DayResult, string> = {
  win: "text-success",
  loss: "text-danger",
  live: "text-muted",
  none: "text-faint",
};

export default function CalendarPage() {
  const today = useClock((s) => s.today);
  const days = useStore((s) => s.days);
  const tasks = useStore((s) => s.tasks);
  const threshold = useStore((s) => s.settings.winThreshold);
  const addTask = useStore((s) => s.addTask);
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const touchX = useRef<number | null>(null);

  const shift = useCallback((dir: number) => {
    setMonth((m) => {
      const [y, mo] = m.split("-").map(Number);
      return toKey(new Date(y, mo - 1 + dir, 1)).slice(0, 7);
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.key === "ArrowLeft") shift(-1);
      if (e.key === "ArrowRight") shift(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shift]);

  const [y, mo] = month.split("-").map(Number);
  const first = toKey(new Date(y, mo - 1, 1));
  const start = addDays(first, -fromKey(first).getDay());
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));

  const selLog = days[selected];
  const selResult = dayResult(selLog, selected, today, threshold);
  const selSpent = tasks.reduce((s, t) => s + (t.date === selected && t.done ? (t.spentMin ?? 0) : 0), 0);
  const sel = fromKey(selected);

  const stats = useMemo(() => {
    const dates = lastNDays(today, 30);
    const summary = rangeSummary(days, dates, today, threshold);
    const bars = dates.map((date) => ({ date, log: days[date], result: dayResult(days[date], date, today, threshold) }));
    return { ...summary, bars, streak: currentStreak(days, today, threshold) };
  }, [days, today, threshold]);

  return (
    <div className="mx-auto max-w-xl">
      <SectionTop
        label="Calendar"
        actions={[
          {
            label: selected === today ? "Add task" : `Add task · ${formatShort(selected)}`,
            placeholder: `Task for ${formatShort(selected)}`,
            keepOpen: true,
            onAdd: (text) => {
              const parsed = parseQuickTask(text, selected);
              if (parsed.title) addTask(parsed);
            },
          },
        ]}
      />

      <div className="mb-5 flex items-center justify-center gap-4">
        <button aria-label="Previous month" onClick={() => shift(-1)} className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-fg">
          <ChevronLeft className="size-4" />
        </button>
        <button
          onClick={() => {
            setMonth(today.slice(0, 7));
            setSelected(today);
          }}
          title="Back to today"
          className="min-w-40 text-[17px] font-semibold"
        >
          {new Date(y, mo - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </button>
        <button aria-label="Next month" onClick={() => shift(1)} className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-fg">
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div
        className="mx-auto max-w-md"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 60) shift(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        <div className="grid grid-cols-7 pb-2 text-center text-[11px] text-faint">
          {WEEKDAYS.map((w) => (
            <span key={w}>{w[0]}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((date) => {
            const log = days[date];
            const has = !!log && log.total > 0 && date <= today;
            const planned = !!log && log.total > 0 && date > today;
            const r = dayResult(log, date, today, threshold);
            return (
              <button
                key={date}
                onClick={() => setSelected(date)}
                title={has ? `${log.pct}% · ${log.done}/${log.total}` : undefined}
                style={has ? { background: dayFill(log.pct, r === "win") } : undefined}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl transition-[box-shadow,background-color]",
                  !has && "hover:bg-surface",
                  date === selected && "ring-1 ring-fg/70",
                  fromKey(date).getMonth() !== mo - 1 && "opacity-25",
                )}
              >
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-[14px] tabular-nums",
                    date === today ? "bg-fg font-semibold text-bg" : "text-fg",
                  )}
                >
                  {fromKey(date).getDate()}
                </span>
                <span className={cn("flex h-3 items-center font-mono text-[10px] leading-3 tabular-nums", r === "win" ? "text-success" : "text-muted")}>
                  {has ? `${log.pct}%` : planned ? <span className="size-1 rounded-full bg-muted" title={`${log.total} planned`} /> : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <section className="mt-12">
        <div className="mb-5 text-center">
          <p className="text-[12px] text-faint">{sel.toLocaleDateString(undefined, { weekday: "long" })}</p>
          <p className="text-[20px] font-semibold">{sel.toLocaleDateString(undefined, { month: "long", day: "numeric" })}</p>
          {selLog && selLog.total > 0 && (
            <p className={cn("mt-1 font-mono text-[12px] tabular-nums", RESULT_TEXT[selResult])}>
              {selected > today ? (
                `${selLog.total} planned`
              ) : (
                <>
                  {selLog.pct}% · {selLog.done}/{selLog.total}
                  {selSpent > 0 && ` · ${formatMinutes(selSpent)}`}
                </>
              )}
            </p>
          )}
        </div>
        <TaskList date={selected} emptyText="Nothing on this day." />
      </section>

      <section className="mt-16 border-t border-line pt-8">
        <p className="mb-4 text-center text-[11px] font-medium tracking-[0.2em] text-faint uppercase">Last 30 days</p>
        <div className="mx-auto flex h-16 max-w-md items-end gap-[3px]" aria-label="Daily completion, last 30 days">
          {stats.bars.map(({ date, log, result }) => (
            <button
              key={date}
              onClick={() => {
                setSelected(date);
                setMonth(date.slice(0, 7));
              }}
              title={`${formatShort(date)} · ${log && log.total ? `${log.pct}%` : "no tasks"}`}
              className="flex h-full flex-1 items-end"
            >
              <span
                className={cn("block w-full rounded-[2px]", result === "win" ? "bg-success" : log && log.total ? "bg-muted" : "bg-surface-3")}
                style={{ height: log && log.total ? `${Math.max(6, log.pct)}%` : "6%" }}
              />
            </button>
          ))}
        </div>
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <Stat value={`${stats.avg}%`} label="average" />
          <Stat value={`${stats.wins}/${stats.wins + stats.losses}`} label="successful days" />
          <Stat value={`${stats.streak}d`} label="streak" />
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-mono text-[22px] font-medium tabular-nums">{value}</p>
      <p className="mt-1 text-[11px] text-faint">{label}</p>
    </div>
  );
}
