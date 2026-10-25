"use client";

import { ArrowRight, Play, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { addDays, formatTime12 } from "@/lib/date";
import { useClock, useStore } from "@/lib/store";
import type { Task } from "@/lib/types";
import { cn, formatMinutes, parseQuickTask, PRIORITY_ORDER } from "@/lib/utils";
import { Checkbox, IconButton } from "./ui";

export const sortTasks = (a: Task, b: Task) =>
  Number(a.done) - Number(b.done) ||
  (a.time ?? "99").localeCompare(b.time ?? "99") ||
  PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
  a.createdAt - b.createdAt;

/** The tasks of one day. Adding happens in the section's top bar. */
export function TaskList({ date, emptyText }: { date: string; emptyText?: string }) {
  const allTasks = useStore((s) => s.tasks);
  const today = useClock((s) => s.today);
  const tasks = useMemo(() => allTasks.filter((t) => t.date === date).sort(sortTasks), [allTasks, date]);

  if (tasks.length === 0) return emptyText ? <p className="py-6 text-center text-[14px] text-faint">{emptyText}</p> : null;
  return (
    <ul>
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} isToday={date === today} />
      ))}
    </ul>
  );
}

function TaskRow({ task, isToday }: { task: Task; isToday: boolean }) {
  const { toggleTask, deleteTask, updateTask, startTask } = useStore.getState();
  const now = useClock((s) => s.now);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  // Set once Enter or Escape has handled the edit, so the blur that follows doesn't act again.
  const handled = useRef(false);
  const running = !task.done && !!task.startedAt;

  const startEditing = () => {
    handled.current = false;
    setTitle(task.title);
    setEditing(true);
  };

  // Editing understands the same shortcuts as adding: "Gym @7am !high tomorrow".
  const save = () => {
    if (handled.current) return;
    handled.current = true;
    setEditing(false);
    const parsed = parseQuickTask(title, task.date);
    if (!parsed.title || title.trim() === task.title) {
      setTitle(task.title);
      return;
    }
    updateTask(task.id, {
      title: parsed.title,
      date: parsed.date,
      ...(parsed.time && { time: parsed.time }),
      ...(/(^|\s)!\w/.test(title) && { priority: parsed.priority }),
    });
    setTitle(parsed.title);
  };

  const editSpent = () => {
    const value = prompt("Minutes spent on this task", String(task.spentMin ?? ""));
    if (value === null) return;
    const min = Math.round(Number(value));
    updateTask(task.id, { spentMin: Number.isFinite(min) && min > 0 ? min : undefined });
  };

  return (
    <li className={cn("group -mx-2 flex min-h-12 items-center gap-3 rounded-xl px-2 transition-colors hover:bg-surface", running && "bg-surface")}>
      <Checkbox checked={task.done} onChange={() => toggleTask(task.id)} label={task.title} />
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") {
                handled.current = true;
                setTitle(task.title);
                setEditing(false);
              }
            }}
            className="w-full bg-transparent text-[15px] outline-none"
          />
        ) : (
          <button
            onClick={startEditing}
            className={cn("truncate py-3 text-left text-[15px] transition-colors", task.done ? "text-faint line-through decoration-faint" : "text-fg")}
          >
            {task.title}
          </button>
        )}
        {task.priority === "high" && !task.done && <span title="High priority" className="size-1.5 shrink-0 rounded-full bg-danger" />}
      </div>

      <div className="flex shrink-0 items-center text-[12px] text-faint">
        {/* Desktop: on hover. Phone: only while the task is being edited, to keep rows clean. */}
        <div
          onPointerDown={(e) => e.preventDefault()}
          className={cn(
            "flex items-center sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:focus-within:opacity-100",
            !editing && "max-sm:hidden",
          )}
        >
          {isToday && !task.done && !running && (
            <IconButton label="Start — track time exactly" onClick={() => startTask(task.id)}>
              <Play className="size-3.5" />
            </IconButton>
          )}
          {!task.done && (
            <IconButton label="Move to next day" className="max-sm:hidden" onClick={() => updateTask(task.id, { date: addDays(task.date, 1) })}>
              <ArrowRight className="size-3.5" />
            </IconButton>
          )}
          <IconButton label="Delete task" className="hover:text-danger" onClick={() => deleteTask(task.id)}>
            <X className="size-3.5" />
          </IconButton>
        </div>
        {/* One right-aligned slot so times line up down the list. */}
        <div className="flex w-16 justify-end font-mono">
          {running ? (
            <span className="flex items-center gap-1.5 text-fg">
              <span className="size-1.5 animate-pulse rounded-full bg-success" />
              {formatMinutes(Math.max(0, (now - task.startedAt!) / 60_000))}
            </span>
          ) : task.done ? (
            <button onClick={editSpent} title="Time spent — click to change" className="-mr-1.5 rounded-md px-1.5 py-0.5 hover:bg-surface-3 hover:text-fg">
              {task.spentMin ? formatMinutes(task.spentMin) : "+ time"}
            </button>
          ) : (
            task.time && <span>{formatTime12(task.time)}</span>
          )}
        </div>
      </div>
    </li>
  );
}
