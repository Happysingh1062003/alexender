"use client";

import { ArrowDown, ArrowUp, Check, ChevronDown, RotateCcw, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { formatShort, toKey } from "@/lib/date";
import { cn } from "@/lib/utils";
import { EditableText, IconButton } from "./ui";

/** One waiting item in an ordered queue (videos, books). */
export function QueueRow({
  media,
  title,
  subtitle,
  isFirst,
  isLast,
  onMove,
  onRemove,
  onComplete,
  onRename,
  extra,
}: {
  media: ReactNode;
  title: string;
  subtitle?: string;
  isFirst: boolean;
  isLast: boolean;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onComplete: () => void;
  onRename: (title: string) => void;
  /** Shown under the title, e.g. reading progress. */
  extra?: ReactNode;
}) {
  return (
    <li className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface">
      {media}
      <div className="min-w-0 flex-1">
        <EditableText value={title} onSave={(t) => t && onRename(t)} className="line-clamp-2 text-[14px] leading-snug" />
        {subtitle && <p className="mt-0.5 truncate text-[12px] text-faint">{subtitle}</p>}
        {extra}
      </div>
      <div className="flex shrink-0 items-center sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
        <IconButton label="Move up" disabled={isFirst} onClick={() => onMove(-1)} className="max-sm:hidden">
          <ArrowUp className="size-3.5" />
        </IconButton>
        <IconButton label="Move down" disabled={isLast} onClick={() => onMove(1)} className="max-sm:hidden">
          <ArrowDown className="size-3.5" />
        </IconButton>
        <IconButton label="Remove" onClick={onRemove} className="hover:text-danger">
          <X className="size-3.5" />
        </IconButton>
      </div>
      <button
        aria-label="Mark complete"
        title="Mark complete"
        onClick={onComplete}
        className="flex size-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-faint text-transparent transition-colors hover:border-fg hover:text-fg"
      >
        <Check className="size-3" strokeWidth={3} />
      </button>
    </li>
  );
}

/** A finished item. */
export function DoneRow({
  media,
  title,
  completedAt,
  onReopen,
}: {
  media: ReactNode;
  title: string;
  completedAt?: number;
  onReopen: () => void;
}) {
  return (
    <li className="group flex items-center gap-3 py-3">
      <div className="opacity-60">{media}</div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[14px] leading-snug text-muted">{title}</p>
        {completedAt && <p className="mt-0.5 text-[11px] text-faint">Finished {formatShort(toKey(new Date(completedAt)))}</p>}
      </div>
      <IconButton label="Move back to queue" onClick={onReopen} className="sm:opacity-0 sm:group-hover:opacity-100">
        <RotateCcw className="size-3.5" />
      </IconButton>
    </li>
  );
}

/** Collapsible "finished" section shown under a queue. */
export function DoneSection({ label, count, children }: { label: string; count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  if (!count) return null;
  return (
    <section className="mt-12">
      <button onClick={() => setOpen((o) => !o)} className="mx-auto flex items-center gap-2 text-[13px] font-medium text-muted transition-colors hover:text-fg">
        {label} <span className="font-normal text-faint">{count}</span>
        <ChevronDown className={cn("size-4 text-faint transition-transform", open && "rotate-180")} />
      </button>
      {open && <ul className="mt-2 divide-y divide-line">{children}</ul>}
    </section>
  );
}
