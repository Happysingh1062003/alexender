"use client";

import { ArrowRight, Clock, Play, Plus, Repeat, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { addDays, formatShort, formatTime12 } from "@/lib/date";
import { useClock, useStore } from "@/lib/store";
import type { Priority, Task } from "@/lib/types";
import { cn, parseQuickTask, PRIORITY_ORDER } from "@/lib/utils";
import { Checkbox, Empty, IconButton } from "./ui";

const PRIORITY_COLOR: Record<Priority, string> = {
  high: "var(--danger)",
  med: "var(--accent)",
  low: "var(--muted)",
};

export function TaskList({ date, compact }: { date: string; compact?: boolean }) {
  const allTasks = useStore((s) => s.tasks);
  const addTask = useStore((s) => s.addTask);
  const today = useClock((s) => s.today);
  const [text, setText] = useState("");

  const tasks = useMemo(
    () =>
      allTasks
        .filter((t) => t.date === date)
        .sort(
          (a, b) =>
            Number(a.done) - Number(b.done) ||
            (a.time ?? "99").localeCompare(b.time ?? "99") ||
            PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
            a.createdAt - b.createdAt,
        ),
    [allTasks, date],
  );

  const preview = text.trim() ? parseQuickTask(text, date) : null;

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!preview?.title) return;
          addTask(preview);
          setText("");
        }}
        className="mb-2"
      >
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 transition focus-within:border-fg/30 focus-within:ring-4 focus-within:ring-fg/5">
          <Plus className="size-4 shrink-0 text-muted" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a task — try “Gym !high @6pm”"
            className="h-11 min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted/70"
          />
        </div>
        {preview && (preview.time || preview.priority !== "med" || preview.date !== date) && (
          <p className="mt-1.5 px-1 text-[11px] text-muted">
            {preview.date !== date && <>📅 {formatShort(preview.date)} · </>}
            {preview.time && <>⏰ {formatTime12(preview.time)} · </>}
            priority {preview.priority}
          </p>
        )}
      </form>

      {tasks.length === 0 ? (
        !compact && <Empty icon={<Clock className="size-5" />} title="No tasks planned" hint="Plan the day before it plans you. Add the three things that matter most." />
      ) : (
        <ul className="divide-y divide-line">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} isToday={date === today} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TaskRow({ task, isToday }: { task: Task; isToday: boolean }) {
  const { toggleTask, deleteTask, updateTask, startFocus } = useStore.getState();
  const focusTaskId = useStore((s) => s.focus?.taskId);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);

  const save = () => {
    setEditing(false);
    if (title.trim() && title !== task.title) updateTask(task.id, { title: title.trim() });
    else setTitle(task.title);
  };

  const cyclePriority = () => {
    const order: Priority[] = ["high", "med", "low"];
    updateTask(task.id, { priority: order[(order.indexOf(task.priority) + 1) % 3] });
  };

  return (
    <li className="group flex items-center gap-3 py-2.5">
      <Checkbox checked={task.done} onChange={() => toggleTask(task.id)} label={task.title} />
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") {
                setTitle(task.title);
                setEditing(false);
              }
            }}
            className="w-full bg-transparent text-sm outline-none"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className={cn("block w-full truncate text-left text-sm", task.done && "text-muted line-through decoration-muted/60")}
          >
            {task.title}
          </button>
        )}
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
          <button onClick={cyclePriority} title="Change priority" className="flex items-center gap-1">
            <span className="size-1.5 rounded-full" style={{ background: PRIORITY_COLOR[task.priority] }} />
            {task.priority}
          </button>
          {task.time && <span>{formatTime12(task.time)}</span>}
          {task.routineId && <Repeat className="size-3" aria-label="Daily routine" />}
          {!!task.focusMin && <span>· {task.focusMin}m focused</span>}
          {focusTaskId === task.id && <span className="font-medium text-accent">· focusing</span>}
        </div>
      </div>
      <div className="flex items-center opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
        {isToday && !task.done && (
          <IconButton label="Start focus" onClick={() => startFocus({ label: task.title, taskId: task.id })}>
            <Play className="size-3.5" />
          </IconButton>
        )}
        {!task.done && (
          <IconButton label="Move to next day" onClick={() => updateTask(task.id, { date: addDays(task.date, 1) })}>
            <ArrowRight className="size-3.5" />
          </IconButton>
        )}
        <IconButton label="Delete task" onClick={() => deleteTask(task.id)} className="hover:text-danger">
          <Trash2 className="size-3.5" />
        </IconButton>
      </div>
    </li>
  );
}
