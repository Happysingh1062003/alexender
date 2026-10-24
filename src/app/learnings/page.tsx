"use client";

import { BookOpen, CalendarCheck, Lightbulb, Map as MapIcon, Search, SquarePlay, Star, Sun, Trash2 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Button, Card, Empty, IconButton, Input, PageHeader, Textarea } from "@/components/ui";
import { formatShort } from "@/lib/date";
import { useStore } from "@/lib/store";
import type { LearningSource } from "@/lib/types";
import { cn } from "@/lib/utils";

const SOURCES: Record<LearningSource, { label: string; icon: ReactNode }> = {
  life: { label: "Life", icon: <Sun className="size-3" /> },
  video: { label: "Video", icon: <SquarePlay className="size-3" /> },
  book: { label: "Book", icon: <BookOpen className="size-3" /> },
  day: { label: "Daily review", icon: <CalendarCheck className="size-3" /> },
  plan: { label: "Plan", icon: <MapIcon className="size-3" /> },
};

export default function LearningsPage() {
  const learnings = useStore((s) => s.learnings);
  const { addLearning, updateLearning, deleteLearning } = useStore.getState();
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<LearningSource | "all" | "starred">("all");
  const [tag, setTag] = useState<string | null>(null);

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    learnings.forEach((l) => l.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [learnings]);

  const filtered = learnings.filter(
    (l) =>
      (source === "all" || (source === "starred" ? l.starred : l.source === source)) &&
      (!tag || l.tags.includes(tag)) &&
      (!query || `${l.text} ${l.refTitle ?? ""}`.toLowerCase().includes(query.toLowerCase())),
  );

  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const l of filtered) {
      const key = l.date.slice(0, 7);
      map.set(key, [...(map.get(key) ?? []), l]);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="animate-rise">
      <PageHeader title="Learnings" subtitle={`${learnings.length} lessons collected. Wisdom compounds.`} />

      <Card className="mb-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            addLearning({ text });
            setText("");
          }}
        >
          <Textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
            }}
            placeholder="What did life teach you today? Use #tags to organise."
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="hidden text-[11px] text-muted sm:block">Ctrl + Enter to save</span>
            <Button size="sm" disabled={!text.trim()} className="ml-auto">
              <Lightbulb className="size-3.5" /> Save learning
            </Button>
          </div>
        </form>
      </Card>

      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search learnings…" className="pl-9" />
        </div>
      </div>

      <div className="no-scrollbar mb-5 flex gap-1.5 overflow-x-auto">
        {(["all", "starred", ...Object.keys(SOURCES)] as const).map((s) => (
          <Chip key={s} active={source === s} onClick={() => setSource(s as typeof source)}>
            {s === "all" ? "All" : s === "starred" ? "★ Starred" : SOURCES[s as LearningSource].label}
          </Chip>
        ))}
        {tags.map(([t]) => (
          <Chip key={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)}>
            #{t}
          </Chip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Empty icon={<Lightbulb className="size-5" />} title={learnings.length ? "Nothing matches" : "No learnings yet"} hint="Learnings from videos, books and daily reviews also land here." />
      ) : (
        <div className="space-y-6">
          {groups.map(([month, items]) => (
            <section key={month}>
              <h3 className="mb-2 text-xs font-semibold tracking-[0.12em] text-muted uppercase">
                {new Date(`${month}-01T00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </h3>
              <div className="space-y-2">
                {items.map((l) => (
                  <Card key={l.id} className="group p-4 sm:p-4">
                    <p
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const value = e.currentTarget.innerText.trim();
                        if (value && value !== l.text) updateLearning(l.id, { text: value });
                      }}
                      className="text-sm leading-relaxed whitespace-pre-wrap outline-none"
                    >
                      {l.text}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-muted">
                      <span className="flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5">
                        {SOURCES[l.source].icon} {SOURCES[l.source].label}
                      </span>
                      {l.refTitle && <span className="min-w-0 truncate">{l.refTitle}</span>}
                      <span className="ml-auto shrink-0">{formatShort(l.date)}</span>
                      <IconButton
                        label={l.starred ? "Unstar" : "Star — resurface on Today"}
                        onClick={() => updateLearning(l.id, { starred: !l.starred })}
                        className={cn("size-7", l.starred && "text-accent")}
                      >
                        <Star className={cn("size-3.5", l.starred && "fill-current")} />
                      </IconButton>
                      <IconButton
                        label="Delete"
                        className="size-7 hover:text-danger sm:opacity-0 sm:group-hover:opacity-100"
                        onClick={() => confirm("Delete this learning?") && deleteLearning(l.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </IconButton>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 text-xs transition",
        active ? "border-fg bg-fg text-bg" : "border-line text-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
