"use client";

import { GraduationCap, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { SectionProgress } from "@/components/SectionProgress";
import { EmptyState, IconButton, toast } from "@/components/ui";
import { addDays, daysBetween, fromKey } from "@/lib/date";
import { tap } from "@/lib/motion";
import { useClock, useStore } from "@/lib/store";
import type { Learning } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Days in a row with something learned, up to today (an empty today doesn't break it yet). */
function streakOf(dates: Set<string>, today: string) {
  let n = 0;
  for (let d = dates.has(today) ? today : addDays(today, -1); dates.has(d); d = addDays(d, -1)) n++;
  return n;
}

/** The same old learning all day, a different one tomorrow — so things you learned come back. */
function resurface(list: Learning[], today: string) {
  const old = list.filter((l) => daysBetween(l.date, today) >= 7);
  if (!old.length) return null;
  const seed = [...today].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 100_003, 7);
  return old[seed % old.length];
}

const dayLabel = (date: string, today: string) =>
  date === today ? "Today" : date === addDays(today, -1) ? "Yesterday" : fromKey(date).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });

/** Learning — one line a day of what you learned, from anywhere. It adds up. */
export default function LearningPage() {
  const today = useClock((s) => s.today);
  const learnings = useStore((s) => s.learnings);
  const skills = useStore((s) => s.skills);
  const { addLearning, deleteLearning, restore } = useStore.getState();
  const [text, setText] = useState("");
  const [source, setSource] = useState("");
  const [skillId, setSkillId] = useState<string | undefined>();
  const [query, setQuery] = useState("");

  const skillName = useMemo(() => new Map(skills.map((k) => [k.id, k.title])), [skills]);
  const dates = useMemo(() => new Set(learnings.map((l) => l.date)), [learnings]);
  const streak = streakOf(dates, today);
  const weekStart = addDays(today, -6);
  const thisWeek = learnings.filter((l) => l.date >= weekStart).length;
  const month = today.slice(0, 7);
  const daysThisMonth = [...dates].filter((d) => d.startsWith(month) && d <= today).length;
  const back = resurface(learnings, today);

  const q = query.trim().toLowerCase();
  const shown = learnings
    .filter((l) => !q || [l.text, l.source ?? "", l.skillId ? (skillName.get(l.skillId) ?? "") : ""].some((v) => v.toLowerCase().includes(q)))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  const groups = shown.reduce<[string, Learning[]][]>((acc, l) => {
    const last = acc[acc.length - 1];
    if (last && last[0] === l.date) last[1].push(l);
    else acc.push([l.date, [l]]);
    return acc;
  }, []);

  const save = () => {
    if (!text.trim()) return;
    addLearning(skillId, text.trim(), source);
    tap(10);
    setText("");
    setSource("");
  };

  return (
    <div className="mx-auto max-w-xl">
      <header className="mb-6">
        <h1 className="text-[26px] leading-tight font-semibold tracking-tight">Learning</h1>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="mb-8 rounded-2xl border border-line bg-surface px-4 pt-3 pb-2 transition-colors focus-within:border-line-strong"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              save();
            }
          }}
          placeholder="What did you learn?"
          aria-label="What did you learn?"
          rows={2}
          className="block w-full resize-none bg-transparent text-[16px] leading-relaxed outline-none placeholder:text-faint [field-sizing:content]"
        />
        <div className="mt-1 flex flex-wrap items-center gap-2 border-t border-line pt-2">
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="From — a book, a person, a video…"
            aria-label="Where it came from"
            className="h-8 min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-faint"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="h-8 shrink-0 rounded-full bg-fg px-4 text-[13px] font-medium text-bg transition-[transform,opacity] active:scale-95 disabled:opacity-30"
          >
            Save
          </button>
        </div>
        {skills.length > 0 && (
          <div className="no-scrollbar -mx-1 mt-1 flex gap-1 overflow-x-auto px-1 pb-1">
            {skills.map((k) => (
              <button
                key={k.id}
                type="button"
                aria-pressed={skillId === k.id}
                onClick={() => setSkillId(skillId === k.id ? undefined : k.id)}
                className={cn(
                  "h-7 shrink-0 rounded-full border px-2.5 text-[12px] transition-colors",
                  skillId === k.id ? "border-crystal/60 text-crystal" : "border-line text-faint hover:text-fg",
                )}
              >
                {k.title}
              </button>
            ))}
          </div>
        )}
      </form>

      {learnings.length > 0 && (
        <SectionProgress
          value={(daysThisMonth / Number(today.slice(8, 10))) * 100}
          label="of days this month"
          detail={`${thisWeek} this week${streak > 1 ? ` · ${streak}-day streak` : ""}`}
        />
      )}

      {/* Something you learned a while ago, back for a moment — remembering is half of learning. */}
      {back && !q && (
        <section className="animate-rise mb-10 rounded-2xl bg-crystal-soft px-4 py-3.5">
          <p className="text-[11.5px] text-crystal/80">Remember this? · {fromKey(back.date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</p>
          <p className="mt-1 text-[15px] leading-relaxed break-words whitespace-pre-wrap">{back.text}</p>
          {(back.source || back.skillId) && (
            <p className="mt-1 text-[12px] text-faint">{[back.source, back.skillId && skillName.get(back.skillId)].filter(Boolean).join(" · ")}</p>
          )}
        </section>
      )}

      {learnings.length === 0 && (
        <EmptyState icon={<GraduationCap className="size-5" />} title="One thing a day" hint="Write down something you learned — from a book, a talk, a mistake. Older ones come back to remind you." />
      )}

      {learnings.length > 6 && (
        <label className="mb-6 flex h-10 items-center gap-2 rounded-full border border-line px-3.5 text-faint focus-within:border-line-strong">
          <Search className="size-4 shrink-0" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search what you've learned" aria-label="Search" className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-fg outline-none placeholder:text-faint" />
          {query && (
            <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="flex size-6 items-center justify-center">
              <X className="size-3.5" />
            </button>
          )}
        </label>
      )}
      {q && shown.length === 0 && <p className="text-[13px] text-faint">Nothing matches “{query}”.</p>}

      <div className="space-y-8">
        {groups.map(([date, items]) => (
          <section key={date}>
            <h2 className="mb-2 text-[12px] font-medium text-faint">{dayLabel(date, today)}</h2>
            <ul className="space-y-1">
              {items.map((l) => (
                <li key={l.id} className="group flex items-start gap-3">
                  <span aria-hidden className="mt-[10px] size-1.5 shrink-0 rounded-full bg-crystal/70" />
                  <span className="min-w-0 flex-1 py-1">
                    <span className="block text-[15px] leading-relaxed break-words whitespace-pre-wrap">{l.text}</span>
                    {(l.source || l.skillId) && (
                      <span className="mt-0.5 block text-[12px] text-faint">
                        {l.source}
                        {l.source && l.skillId && " · "}
                        {l.skillId && <span className="text-crystal/80">{skillName.get(l.skillId) ?? "Skill"}</span>}
                      </span>
                    )}
                  </span>
                  <IconButton
                    label="Delete"
                    onClick={() => {
                      deleteLearning(l.id);
                      toast("Deleted", { label: "Undo", run: () => restore("learnings", l) });
                    }}
                    className="size-8 hover:text-danger pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100"
                  >
                    <X className="size-3.5" />
                  </IconButton>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
