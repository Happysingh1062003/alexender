"use client";

import { useEffect, useState } from "react";
import { AsciiStatue } from "@/components/AsciiStatue";
import { Statue } from "@/components/brand";
import { TaskList } from "@/components/TaskList";
import { AnimatedNumber, SectionTop, Segmented, toast } from "@/components/ui";
import { addDays, fromKey } from "@/lib/date";
import { tap } from "@/lib/motion";
import { useClock, useStore } from "@/lib/store";
import { cn, parseQuickTask } from "@/lib/utils";

type Day = "today" | "tomorrow";

const SPARKS = Array.from({ length: 12 }, (_, i) => i * 30);

/**
 * The moment a day is won: sparks around the statue, a small buzz and a word of praise. Fires
 * only when the line is crossed while you're here — not every time the page opens.
 */
function useDayWon(today: string, threshold: number) {
  const [burst, setBurst] = useState(0);
  useEffect(
    () =>
      useStore.subscribe((s, prev) => {
        const now = s.days[today];
        const before = prev.days[today];
        const won = (l?: { total: number; pct: number }) => !!l && l.total > 0 && l.pct >= threshold;
        if (won(now) && !won(before)) {
          setBurst(Date.now());
          tap(24);
          toast(now!.pct >= 100 ? "Every task done. A perfect day." : "Day won. Well fought.");
        } else if (now?.pct === 100 && (before?.pct ?? 0) < 100) {
          setBurst(Date.now());
          toast("Every task done. A perfect day.");
        }
      }),
    [today, threshold],
  );
  return burst;
}

export default function TodayPage() {
  const today = useClock((s) => s.today);
  const threshold = useStore((s) => s.settings.winThreshold);
  const days = useStore((s) => s.days);
  const tasks = useStore((s) => s.tasks);
  const addTask = useStore((s) => s.addTask);
  const [day, setDay] = useState<Day>("today");
  const burst = useDayWon(today, threshold);
  const ascii = useStore((s) => s.settings.statueStyle === "ascii");
  const updateSettings = useStore((s) => s.updateSettings);

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
          <div className="relative shrink-0">
            {/* Tap the statue to switch between the photo and the statue drawn in characters. */}
            <button
              type="button"
              aria-label={ascii ? "Show the statue as a photo" : "Show the statue in characters"}
              onClick={() => {
                tap(8);
                updateSettings({ statueStyle: ascii ? "photo" : "ascii" });
              }}
              className={cn("block transition-transform active:scale-[0.97]", pct >= 100 && "statue-glow")}
            >
              {ascii ? (
                <span className="flex min-h-[132px] items-center sm:min-h-[150px]">
                  <AsciiStatue size={4.5} />
                </span>
              ) : (
                <Statue priority className="h-[132px] w-auto sm:h-[150px]" />
              )}
            </button>
            {burst > 0 && (
              <div key={burst} aria-hidden className="burst pointer-events-none absolute inset-0">
                {SPARKS.map((a) => (
                  <i key={a} style={{ ["--a" as string]: `${a}deg`, animationDelay: `${(a % 60) * 2}ms` }} />
                ))}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn("text-[44px] leading-none font-semibold tracking-[-0.03em] tabular-nums transition-colors duration-500", won && "text-crystal")}>
              <AnimatedNumber value={pct} from={0} />
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
