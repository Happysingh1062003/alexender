"use client";

import { Check, ChevronDown, RotateCcw, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { formatShort, toKey } from "@/lib/date";
import { cn } from "@/lib/utils";
import { EditableText, IconButton } from "./ui";

/** One waiting item in an ordered queue (videos, books, bucket list). Rendered inside a SortableList. */
export function QueueRow({
  handle,
  media,
  title,
  subtitle,
  onRemove,
  onComplete,
  onRename,
  extra,
  completeLabel = "Mark complete",
}: {
  handle: ReactNode;
  media?: ReactNode;
  title: string;
  subtitle?: string;
  onRemove: () => void;
  onComplete: () => void;
  onRename: (title: string) => void;
  /** Shown under the title, e.g. reading progress. */
  extra?: ReactNode;
  completeLabel?: string;
}) {
  return (
    <div className="group -mx-2 flex items-center gap-2.5 rounded-2xl px-2 py-2 transition-colors duration-200 hover:bg-surface">
      <div className="flex w-7 shrink-0 justify-center pointer-coarse:hidden pointer-fine:opacity-0 pointer-fine:transition-opacity pointer-fine:group-hover:opacity-100">{handle}</div>
      {media}
      <div className="ml-0.5 min-w-0 flex-1">
        <EditableText value={title} onSave={(t) => t && onRename(t)} className="line-clamp-2 text-[14.5px] leading-snug" />
        {subtitle && <p className="mt-0.5 truncate text-[12px] text-faint">{subtitle}</p>}
        {extra}
      </div>
      <IconButton label="Remove" onClick={onRemove} className="shrink-0 hover:text-danger pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:focus-visible:opacity-100">
        <X className="size-3.5" />
      </IconButton>
      <button
        aria-label={completeLabel}
        title={completeLabel}
        onClick={onComplete}
        className="flex size-[24px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-faint text-transparent transition-[border-color,color,transform] duration-200 hover:border-crystal hover:text-crystal active:scale-90"
      >
        <Check className="size-3" strokeWidth={3} />
      </button>
    </div>
  );
}

/** A finished item. */
export function DoneRow({
  media,
  title,
  completedAt,
  onReopen,
  extra,
}: {
  media?: ReactNode;
  title: string;
  completedAt?: number;
  onReopen: () => void;
  extra?: ReactNode;
}) {
  return (
    <li className="group flex items-start gap-3 py-3.5">
      {media && <div className="opacity-70">{media}</div>}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[14px] leading-snug text-muted">{title}</p>
        {completedAt && <p className="mt-0.5 text-[11px] text-faint">Finished {formatShort(toKey(new Date(completedAt)))}</p>}
        {extra}
      </div>
      <IconButton label="Move back to the list" onClick={onReopen} className="pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:focus-visible:opacity-100">
        <RotateCcw className="size-3.5" />
      </IconButton>
    </li>
  );
}

/** Collapsible "finished" section shown under a queue. */
export function DoneSection({ label, count, children, defaultOpen = false }: { label: string; count: number; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!count) return null;
  return (
    <section className="mt-12">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mx-auto flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium text-muted transition-colors hover:text-fg"
      >
        {label} <span className="font-normal text-faint">{count}</span>
        <ChevronDown className={cn("size-4 text-faint transition-transform duration-300", open && "rotate-180")} />
      </button>
      {open && <ul className="animate-fade mt-2 divide-y divide-line">{children}</ul>}
    </section>
  );
}
