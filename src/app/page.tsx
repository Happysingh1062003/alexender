"use client";

import { useState } from "react";
import { Statue } from "@/components/brand";
import { TaskList } from "@/components/TaskList";
import { SectionTop, Segmented } from "@/components/ui";
import { addDays, fromKey } from "@/lib/date";
import { useClock, useStore } from "@/lib/store";
import { cn, parseQuickTask } from "@/lib/utils";

type Day = "today" | "tomorrow";

export default function TodayPage() {
  const today = useClock((s) => s.today);
  const threshold = useStore((s) => s.settings.winThreshold);
  const days = useStore((s) => s.days);
  const tasks = useStore((s) => s.tasks);
  const addTask = useStore((s) => s.addTask);
  const [day, setDay] = useState<Day>("today");

  const date = day === "today" ? today : addDays(today, 1);
  const log = days[date];
  const total = log?.total ?? 0;
  const done = log?.done ?? 0;
  const pct = log?.pct ?? 0;
  const won = total > 0 && pct >= threshold;
  const toWin = Math.max(0, Math.ceil((threshold / 100) * total) - done);
  const dayTasks = tasks.filter((t) => t.date === date);
  const notDone = dayTasks.filter((t) => t.failed).length;
  const open = dayTasks.filter((t) => !t.done && !t.failed).length;

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
              {total === 0 ? (
                "No tasks yet"
              ) : won ? (
                <span className="text-crystal">Day won</span>
              ) : (
                `${done} of ${total} · ${toWin > open ? "can't be won today" : `${toWin} more to win`}`
              )}
              {notDone > 0 && <span className="text-danger/80"> · {notDone} not done</span>}
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
