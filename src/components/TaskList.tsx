"use client";

import { ArrowRight, NotebookPen, X } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { addDays } from "@/lib/date";
import { smooth, tap } from "@/lib/motion";
import { byOrder, useStore } from "@/lib/store";
import type { Task } from "@/lib/types";
import { cn, parseQuickTask } from "@/lib/utils";
import { SortableList } from "./Sortable";
import { Checkbox, IconButton, toast } from "./ui";

/** Unfinished tasks in your order, finished ones below in the order they were done. */
export const sortTasks = (a: Task, b: Task) =>
  Number(a.done) - Number(b.done) ||
  (a.done ? (a.completedAt ?? 0) - (b.completedAt ?? 0) : byOrder(a, b));

/** The tasks of one day. Adding happens in the section's top bar; drag the handle to reorder. */
export function TaskList({
  date,
  emptyText,
}: {
  date: string;
  emptyText?: string;
}) {
  const allTasks = useStore((s) => s.tasks);
  const reorder = useStore((s) => s.reorder);
  const tasks = useMemo(
    () => allTasks.filter((t) => t.date === date).sort(sortTasks),
    [allTasks, date],
  );
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  if (tasks.length === 0)
    return emptyText ? (
      <p className="animate-fade py-8 text-center text-[14px] text-faint">
        {emptyText}
      </p>
    ) : null;
  return (
    <div>
      <SortableList items={open} onReorder={(ids) => reorder("tasks", ids)}>
        {(t, handle) => (
          <TaskRow task={t} handle={handle} />
        )}
      </SortableList>
      {done.length > 0 && (
        <ul className={cn(open.length > 0 && "mt-1 border-t border-line pt-1")}>
          {done.map((t) => (
            <li key={t.id}>
              <TaskRow task={t} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TaskRow({
  task,
  handle,
}: {
  task: Task;
  handle?: ReactNode;
}) {
  const { toggleTask, deleteTask, updateTask, restore } = useStore.getState();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  // Set once Enter or Escape has handled the edit, so the blur that follows doesn't act again.
  const handled = useRef(false);
  const [noteOpen, setNoteOpen] = useState(false);
  // Opening the note ends any title edit first, so the row settles back to normal.
  const openNote = () => {
    if (editing) save();
    setNoteOpen(true);
  };

  const startEditing = () => {
    handled.current = false;
    setTitle(task.title);
    setEditing(true);
  };

  // Editing understands the same shortcuts as adding: "Gym !high tomorrow".
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
      ...(/(^|\s)!\w/.test(title) && { priority: parsed.priority }),
    });
    setTitle(parsed.title);
  };

  const remove = () => {
    smooth(() => deleteTask(task.id));
    toast("Task deleted", { label: "Undo", run: () => restore("tasks", task) });
  };

  const tomorrow = () => {
    smooth(() => updateTask(task.id, { date: addDays(task.date, 1) }));
    toast("Moved to the next day", {
      label: "Undo",
      run: () => updateTask(task.id, { date: task.date }),
    });
  };

  return (
    <div
      style={{ viewTransitionName: `task-${task.id}` }}
      className={cn(
        "group -mx-2 rounded-2xl px-2 transition-colors duration-200 hover:bg-surface",
      )}
    >
      <div className="flex min-h-[52px] items-center gap-2">
        <div className="flex w-7 shrink-0 justify-center pointer-coarse:hidden pointer-fine:opacity-0 pointer-fine:transition-opacity pointer-fine:group-hover:opacity-100">
          {handle}
        </div>
        <Checkbox
          checked={task.done}
          onChange={() => {
            if (!task.done) tap();
            smooth(() => toggleTask(task.id));
          }}
          label={task.title}
        />
        <div className="ml-1 flex min-w-0 flex-1 items-center gap-2">
          {editing ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={save}
              enterKeyHint="done"
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") {
                  e.preventDefault();
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
              className={cn(
                "truncate py-3 text-left text-[15px] transition-[color] duration-300",
                task.done
                  ? "text-faint line-through decoration-faint/70"
                  : "text-fg",
              )}
            >
              {task.title}
            </button>
          )}
          {task.priority === "high" && !task.done && (
            <span
              title="High priority"
              className="size-1.5 shrink-0 rounded-full bg-crystal"
            />
          )}
        </div>

        <div className="flex shrink-0 items-center text-[12px] text-faint">
          {/* Desktop: on hover. Phone: only while the task is being edited, to keep rows clean. */}
          <div
            onPointerDown={(e) => e.preventDefault()}
            className={cn(
              "flex items-center pointer-fine:opacity-0 pointer-fine:transition-opacity pointer-fine:group-hover:opacity-100 pointer-fine:focus-within:opacity-100",
              !editing && "pointer-coarse:hidden",
            )}
          >
            {!task.done && (
              <IconButton label="Move to next day" onClick={tomorrow}>
                <ArrowRight className="size-3.5" />
              </IconButton>
            )}
            <IconButton
              label={task.note ? "Edit note" : "Add note"}
              onClick={openNote}
            >
              <NotebookPen className="size-3.5" />
            </IconButton>
            <IconButton
              label="Delete task"
              className="hover:text-danger"
              onClick={remove}
            >
              <X className="size-3.5" />
            </IconButton>
          </div>
        </div>
      </div>

      {/* The note sits under the title, lined up with it. */}
      {(noteOpen || task.note) && (
        <div className="pr-2 pb-3 pl-[70px] -mt-2 pointer-coarse:pl-[34px]">
          {noteOpen ? (
            <NoteEditor task={task} onClose={() => setNoteOpen(false)} />
          ) : (
            <button
              onClick={openNote}
              title="Edit note"
              className={cn(
                "line-clamp-2 w-full text-left text-[13px] leading-relaxed whitespace-pre-wrap transition-colors hover:text-muted",
                task.done ? "text-faint/70" : "text-faint",
              )}
            >
              {task.note}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Saves as you type; Esc or tapping elsewhere closes it. An empty note is removed. */
function NoteEditor({ task, onClose }: { task: Task; onClose: () => void }) {
  const updateTask = useStore((s) => s.updateTask);
  const [text, setText] = useState(task.note ?? "");
  return (
    <textarea
      autoFocus
      value={text}
      rows={Math.max(1, text.split("\n").length)}
      placeholder="Add a note…"
      onChange={(e) => {
        setText(e.target.value);
        updateTask(task.id, {
          note: e.target.value.trim() ? e.target.value : undefined,
        });
      }}
      onBlur={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
        // Enter adds a line; Ctrl/Cmd + Enter finishes.
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onClose();
      }}
      className="block w-full resize-none rounded-lg bg-surface-2 px-2.5 py-2 text-[13px] leading-relaxed text-fg outline-none placeholder:text-faint [field-sizing:content] focus:ring-1 focus:ring-line-strong"
    />
  );
}
