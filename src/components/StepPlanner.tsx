"use client";

import { CalendarDays, CalendarPlus, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { daysBetween, formatShort } from "@/lib/date";
import { useClock, useStore } from "@/lib/store";
import type { PlanStep } from "@/lib/types";
import { cn, uid } from "@/lib/utils";
import { SortableList } from "./Sortable";
import { Checkbox, IconButton, ProgressBar, toast } from "./ui";

/** "Today", "Tomorrow", "3 days late", "Due 4 Nov" — and how urgent it is. */
export function dueLabel(due: string, today: string) {
  const d = daysBetween(today, due);
  if (d < 0) return { text: `${-d} day${d === -1 ? "" : "s"} late`, tone: "late" as const };
  if (d === 0) return { text: "Today", tone: "soon" as const };
  if (d === 1) return { text: "Tomorrow", tone: "soon" as const };
  return { text: `Due ${formatShort(due)}`, tone: "later" as const };
}

export function DueChip({ due, today, className }: { due: string; today: string; className?: string }) {
  const { text, tone } = dueLabel(due, today);
  return (
    <span
      className={cn(
        "shrink-0 rounded-md px-1.5 py-0.5 text-[11px] tabular-nums",
        tone === "late" ? "bg-danger/15 text-danger" : tone === "soon" ? "bg-crystal-soft text-crystal" : "bg-surface-2 text-faint",
        className,
      )}
    >
      {text}
    </span>
  );
}

/** A step ticked or unticked, stamped with when it was finished. */
const toggled = (step: PlanStep): Partial<PlanStep> => ({ done: !step.done, doneAt: step.done ? undefined : Date.now() });

export const stepProgress = (steps: PlanStep[] = []) => {
  const done = steps.filter((s) => s.done).length;
  return { done, total: steps.length, pct: steps.length ? Math.round((done / steps.length) * 100) : 0, next: steps.find((s) => !s.done) };
};

/**
 * The plan behind a mission, goal or plan: ordered steps with due dates, overall progress, the
 * next step in view, and one tap to put any step on Today.
 */
export function StepPlanner({ steps = [], onChange, emptyHint = "Break it into steps — the smaller, the better." }: { steps?: PlanStep[]; onChange: (steps: PlanStep[]) => void; emptyHint?: string }) {
  const today = useClock((s) => s.today);
  const addTask = useStore((s) => s.addTask);
  const reorder = (ids: string[]) => onChange([...ids.map((id) => steps.find((s) => s.id === id)!), ...steps.filter((s) => s.done)]);
  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const open = steps.filter((s) => !s.done);
  const done = steps.filter((s) => s.done);
  const { pct, next } = stepProgress(steps);

  const patch = (id: string, change: Partial<PlanStep>) => onChange(steps.map((s) => (s.id === id ? { ...s, ...change } : s)));
  const toggle = (step: PlanStep) => patch(step.id, toggled(step));
  const toToday = (step: PlanStep) => {
    addTask({ title: step.text, date: today });
    toast("Added to Today");
  };

  return (
    <div>
      {steps.length > 0 && (
        <div className="mb-5">
          <div className="flex items-baseline justify-between text-[12px] text-faint">
            <span>
              <span className="text-[20px] font-semibold text-fg tabular-nums">{pct}%</span> complete
            </span>
            <span className="tabular-nums">
              {done.length}/{steps.length} steps
            </span>
          </div>
          <ProgressBar value={pct} tone="crystal" className="mt-2" />
        </div>
      )}

      {next && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-crystal/35 bg-crystal-soft px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-faint">Next step</p>
            <p className="mt-0.5 text-[14.5px] leading-snug font-medium">{next.text}</p>
          </div>
          {next.due && <DueChip due={next.due} today={today} />}
          <button
            onClick={() => toToday(next)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line-strong bg-bg px-3 py-1.5 text-[12px] font-medium transition-colors hover:border-faint"
          >
            <CalendarPlus className="size-3.5" /> Today
          </button>
        </div>
      )}

      {steps.length === 0 && <p className="mb-3 text-[13px] text-faint">{emptyHint}</p>}

      <SortableList items={open} onReorder={reorder}>
        {(step, handle) => (
          <div className="group -mx-2 rounded-xl px-2 transition-colors hover:bg-surface">
            <div className="flex min-h-11 items-center gap-2.5">
              <div className="flex w-6 shrink-0 justify-center pointer-coarse:hidden pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100">{handle}</div>
              <Checkbox size="sm" checked={false} label={step.text} onChange={() => toggle(step)} />
              <button onClick={() => setOpenId(openId === step.id ? null : step.id)} className="min-w-0 flex-1 py-2 text-left text-[14px] leading-snug">
                {step.text}
              </button>
              {step.due && <DueChip due={step.due} today={today} />}
            </div>
            {openId === step.id && (
              <div className="animate-fade mb-2 ml-0 flex flex-wrap items-center gap-2 pb-1 pl-0 sm:pl-9">
                <input
                  value={step.text}
                  onChange={(e) => patch(step.id, { text: e.target.value })}
                  aria-label="Step"
                  className="h-9 min-w-0 flex-1 basis-full rounded-lg bg-surface-2 px-3 text-[13.5px] outline-none sm:basis-auto"
                />
                <label className="flex items-center gap-1.5 text-[12px] text-faint">
                  Due
                  <input
                    type="date"
                    value={step.due ?? ""}
                    onChange={(e) => patch(step.id, { due: e.target.value || undefined })}
                    className="h-9 rounded-lg border border-line bg-surface px-2 text-[12.5px] text-fg outline-none"
                  />
                </label>
                <span className="flex-1" />
                <IconButton label="Add to Today" onClick={() => toToday(step)} className="size-9">
                  <CalendarPlus className="size-4" />
                </IconButton>
                <IconButton
                  label="Delete step"
                  onClick={() => {
                    onChange(steps.filter((s) => s.id !== step.id));
                    setOpenId(null);
                  }}
                  className="size-9 hover:text-danger"
                >
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
            )}
          </div>
        )}
      </SortableList>

      <form
        className="mt-1 flex items-center gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          onChange([...open, { id: uid(), text: text.trim(), done: false, ...(due && { due }) }, ...done]);
          setText("");
          setDue("");
        }}
      >
        <Plus className="size-4 shrink-0 text-faint" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a step"
          enterKeyHint="done"
          className="h-11 min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-faint"
        />
        {/* A date only if you want one: the calendar opens the picker. */}
        <label className="relative flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-faint transition-colors hover:bg-surface-2 hover:text-fg">
          <CalendarDays className="size-4" />
          {due && <DueChip due={due} today={today} />}
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            onClick={(e) => e.currentTarget.showPicker?.()}
            aria-label="Due date for the new step"
            className="absolute inset-0 cursor-pointer opacity-0 [color-scheme:dark]"
          />
        </label>
      </form>

      {done.length > 0 && (
        <div className="mt-4">
          <button onClick={() => setShowDone((v) => !v)} aria-expanded={showDone} className="flex items-center gap-1.5 text-[12px] text-faint transition-colors hover:text-fg">
            Done {done.length}
            <ChevronDown className={cn("size-3.5 transition-transform", showDone && "rotate-180")} />
          </button>
          {showDone && (
            <ul className="animate-fade mt-1">
              {done.map((step) => (
                <li key={step.id} className="flex min-h-10 items-center gap-2.5 pl-0 sm:pl-[34px]">
                  <Checkbox size="sm" checked label={step.text} onChange={() => toggle(step)} />
                  <span className="min-w-0 flex-1 text-[13.5px] text-faint line-through">{step.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
