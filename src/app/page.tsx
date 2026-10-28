"use client";

import { ArrowRight, ChevronDown, X } from "lucide-react";
import { useState } from "react";
import { Statue } from "@/components/brand";
import { TaskList } from "@/components/TaskList";
import { SectionTop, Segmented } from "@/components/ui";
import { addDays, fromKey } from "@/lib/date";
import { useClock, useStore } from "@/lib/store";
import type { Task } from "@/lib/types";
import { cn, parseQuickTask } from "@/lib/utils";

type Day = "today" | "tomorrow";

/** Yesterday's unfinished tasks: the day is over, so they stay not done — but each is one tap from today. */
function Missed({ tasks, left, today, onAll }: { tasks: Task[]; left: number; today: string; onAll: () => void }) {
  const carryTask = useStore((s) => s.carryTask);
  const [open, setOpen] = useState(left > 0);
  return (
    <section className="mb-6 rounded-2xl bg-surface px-4 py-3">
      <div className="flex items-center gap-3">
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left text-[13px]">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-danger/15 text-danger">
            <X className="size-3" strokeWidth={3} />
          </span>
          <span className="text-muted">
            {tasks.length} not done yesterday{left > 0 && left < tasks.length ? ` · ${left} left` : left === 0 ? " · all moved to today" : ""}
          </span>
          <ChevronDown className={cn("size-3.5 shrink-0 text-faint transition-transform", open && "rotate-180")} />
        </button>
        {left > 1 && (
          <button onClick={onAll} className="shrink-0 rounded-full px-2.5 py-1.5 text-[12px] font-medium text-crystal transition-colors hover:bg-crystal-soft">
            Do all today
          </button>
        )}
      </div>
      {open && (
        <ul className="animate-fade mt-1">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1 text-[14px] leading-snug break-words text-faint">{t.title}</span>
              {t.carriedTo ? (
                <span className="shrink-0 text-[11.5px] text-faint">{t.carriedTo === today ? "Moved to today" : "Moved"}</span>
              ) : (
                <button
                  onClick={() => carryTask(t.id, today)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line-strong px-3 py-1.5 text-[12px] text-muted transition-colors hover:border-faint hover:text-fg"
                >
                  Do today <ArrowRight className="size-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function TodayPage() {
  const today = useClock((s) => s.today);
  const threshold = useStore((s) => s.settings.winThreshold);
  const days = useStore((s) => s.days);
  const tasks = useStore((s) => s.tasks);
  const { addTask, carryOver } = useStore.getState();
  const [day, setDay] = useState<Day>("today");

  const date = day === "today" ? today : addDays(today, 1);
  const yesterday = addDays(today, -1);
  const log = days[date];
  const total = log?.total ?? 0;
  const done = log?.done ?? 0;
  const pct = log?.pct ?? 0;
  const won = total > 0 && pct >= threshold;
  const toWin = Math.max(0, Math.ceil((threshold / 100) * total) - done);
  const missed = tasks.filter((t) => t.date === yesterday && !t.done);
  const leftover = missed.filter((t) => !t.carriedTo).length;

  return (
    <div className="mx-auto max-w-xl">
      <SectionTop
        actions={[
          {
            label: "Add task",
            placeholder: day === "today" ? "What needs doing?" : "What needs doing tomorrow?",
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

      {day === "today" ? (
        <header className="mx-auto mb-10 flex max-w-sm items-center gap-5 sm:gap-7">
          {/* Alexander, every day — small, beside the numbers, never over them. */}
          <Statue priority className="h-[132px] w-auto shrink-0 sm:h-[150px]" />
          <div className="min-w-0 flex-1">
            <p className={cn("text-[44px] leading-none font-semibold tracking-[-0.03em] tabular-nums transition-colors duration-500", won && "text-crystal")}>
              {pct}
              <span className="ml-0.5 text-[20px] font-medium text-faint">%</span>
            </p>
            <div className="relative mt-4 h-[3px] w-full max-w-[200px] rounded-full bg-surface-3">
              <div
                className={cn("h-full rounded-full transition-[width,background-color] duration-700 ease-[var(--ease-out)]", won ? "bg-crystal" : "bg-fg")}
                style={{ width: `${pct}%` }}
              />
              {/* The success line. */}
              <span className="absolute -top-[3px] h-[9px] w-px bg-crystal/80" style={{ left: `${threshold}%` }} />
            </div>
            <p className="mt-3 text-[13px] leading-snug text-muted">
              {total === 0 ? "No tasks yet" : won ? <span className="text-crystal">Day won</span> : `${done} of ${total} · ${toWin} more to win`}
            </p>
          </div>
        </header>
      ) : (
        <p className="mb-10 text-center text-[13px] text-muted">
          {fromKey(date).toLocaleDateString(undefined, {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
          {total > 0 && <span className="text-faint"> · {total} planned</span>}
        </p>
      )}

      {day === "today" && missed.length > 0 && <Missed tasks={missed} left={leftover} onAll={() => carryOver(yesterday, today)} today={today} />}

      <TaskList
        date={date}
        emptyText={
          day === "today"
            ? "Add the one task that matters most."
            : "Plan tomorrow tonight."
        }
      />
    </div>
  );
}
