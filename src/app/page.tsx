"use client";

import Link from "next/link";
import { useState } from "react";
import { TaskList } from "@/components/TaskList";
import { ProgressRing, SectionTop, Segmented } from "@/components/ui";
import { addDays, fromKey } from "@/lib/date";
import { computeLife, expectancyFor, formatNumber } from "@/lib/life";
import { useClock, useStore } from "@/lib/store";
import { cn, formatMinutes, parseQuickTask } from "@/lib/utils";

type Day = "today" | "tomorrow";

export default function TodayPage() {
  const today = useClock((s) => s.today);
  const now = useClock((s) => s.now);
  const settings = useStore((s) => s.settings);
  const days = useStore((s) => s.days);
  const tasks = useStore((s) => s.tasks);
  const { addTask, carryOver } = useStore.getState();
  const [day, setDay] = useState<Day>("today");

  const date = day === "today" ? today : addDays(today, 1);
  const yesterday = addDays(today, -1);
  const d = fromKey(date);
  const log = days[date];
  const total = log?.total ?? 0;
  const done = log?.done ?? 0;
  const pct = log?.pct ?? 0;
  const won = total > 0 && pct >= settings.winThreshold;
  const leftover = tasks.filter((t) => t.date === yesterday && !t.done).length;
  const spent = tasks.reduce((sum, t) => sum + (t.date === date && t.done ? (t.spentMin ?? 0) : 0), 0);
  const life = computeLife(settings.birthDate, expectancyFor(settings.country, settings.lifeExpectancy), now);

  return (
    <div className="mx-auto max-w-xl">
      <SectionTop
        actions={[
          {
            label: "Add task",
            placeholder: day === "today" ? "Task — e.g. Gym @6pm" : "Task for tomorrow — e.g. Gym @6pm",
            keepOpen: true,
            onAdd: (text) => {
              const parsed = parseQuickTask(text, date);
              if (parsed.title) addTask(parsed);
            },
          },
        ]}
      >
        <Segmented<Day>
          value={day}
          onChange={setDay}
          options={[
            { value: "today", label: "Today" },
            { value: "tomorrow", label: "Tomorrow" },
          ]}
        />
      </SectionTop>

      <header className="mb-12 flex flex-col items-center text-center">
        <p className="text-[13px] text-muted">
          {d.toLocaleDateString(undefined, { weekday: "long" })} · {d.toLocaleDateString(undefined, { month: "long", day: "numeric" })}
        </p>

        {day === "today" ? (
          <>
            <div className="mt-6">
              <ProgressRing value={pct} target={settings.winThreshold} success={won}>
                <p className={cn("font-mono text-[44px] leading-none font-medium tabular-nums", won && "text-success")}>
                  {pct}
                  <span className="text-xl text-faint">%</span>
                </p>
                <p className="mt-2 text-[12px] text-faint">{total ? `${done} of ${total} done` : "no tasks yet"}</p>
              </ProgressRing>
            </div>
            <p className="mt-5 h-5 text-[13px] text-muted">
              {won ? <span className="text-success">Day won</span> : total > 0 && `${Math.max(0, Math.ceil((settings.winThreshold / 100) * total) - done)} more to win the day`}
              {spent > 0 && <span className="text-faint"> · {formatMinutes(spent)} focused</span>}
            </p>
          </>
        ) : (
          <p className="mt-2 text-[28px] font-semibold tracking-tight">{total ? `${total} planned` : "Plan tomorrow"}</p>
        )}
      </header>

      {day === "today" && leftover > 0 && (
        <p className="mb-4 text-center">
          <button onClick={() => carryOver(yesterday, today)} className="text-[13px] text-faint transition-colors hover:text-fg">
            {leftover} unfinished from yesterday · <span className="underline underline-offset-4">bring forward</span>
          </button>
        </p>
      )}

      <TaskList date={date} emptyText={day === "today" ? "Add the one task that matters most." : "Nothing planned yet — add tomorrow's first task above."} />

      {day === "today" && (
        <Link href="/life" className="mt-16 block text-center text-[12px] text-faint transition-colors hover:text-muted">
          About {formatNumber(life.daysLeft)} days left. Make this one count.
        </Link>
      )}
    </div>
  );
}
