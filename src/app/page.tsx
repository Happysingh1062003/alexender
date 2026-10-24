"use client";

import { ArrowRight, BookOpen, Flame, Lightbulb, Quote, Shuffle, SquarePlay, Timer, Trophy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { TaskList } from "@/components/TaskList";
import { Button, Card, ProgressBar, ProgressRing, SectionTitle, Textarea } from "@/components/ui";
import { addDays, dayOfYear, fromKey, greeting, WEEKDAYS } from "@/lib/date";
import { QUOTES } from "@/lib/quotes";
import { currentStreak, dayResult, lastNDays } from "@/lib/stats";
import { useClock, useStore } from "@/lib/store";
import { cn, pct, ytThumb } from "@/lib/utils";

export default function TodayPage() {
  const today = useClock((s) => s.today);
  const name = useStore((s) => s.settings.name);
  const tasks = useStore((s) => s.tasks);
  const carryOver = useStore((s) => s.carryOver);

  const d = fromKey(today);
  const yearDays = d.getFullYear() % 4 === 0 ? 366 : 365;
  const doy = dayOfYear(today);
  const week = Math.ceil((doy + new Date(d.getFullYear(), 0, 1).getDay()) / 7);
  const quote = QUOTES[doy % QUOTES.length];
  const yesterday = addDays(today, -1);
  const leftover = tasks.filter((t) => t.date === yesterday && !t.done && !t.routineId).length;

  return (
    <div className="animate-rise space-y-6">
      <section>
        <p className="text-xs font-medium tracking-[0.12em] text-muted uppercase">
          Day {doy} of {yearDays} · Week {week} · {yearDays - doy} days left this year
        </p>
        <h1 className="mt-2 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
          {greeting(new Date().getHours())}, {name}.
        </h1>
        <p className="mt-3 flex max-w-2xl gap-2 text-sm text-muted">
          <Quote className="mt-0.5 size-3.5 shrink-0 text-accent" />
          <span>
            {quote.text} <span className="text-muted/70">— {quote.by}</span>
          </span>
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <Card>
            <SectionTitle>Today&apos;s battle plan</SectionTitle>
            {leftover > 0 && (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-accent-soft px-3 py-2 text-xs">
                <span>
                  {leftover} unfinished task{leftover > 1 && "s"} from yesterday.
                </span>
                <button onClick={() => carryOver(yesterday, today)} className="flex items-center gap-1 font-semibold text-accent">
                  Bring forward <ArrowRight className="size-3" />
                </button>
              </div>
            )}
            <TaskList date={today} />
          </Card>
          <EveningReview />
        </div>

        <div className="min-w-0 space-y-4">
          <ScoreCard />
          <MissionCard />
          <UpNext />
          <RememberCard />
        </div>
      </div>
    </div>
  );
}

function ScoreCard() {
  const today = useClock((s) => s.today);
  const days = useStore((s) => s.days);
  const threshold = useStore((s) => s.settings.winThreshold);
  const startFocus = useStore((s) => s.startFocus);
  const log = days[today];
  const result = dayResult(log, today, today, threshold);
  const streak = currentStreak(days, today, threshold);
  const week = lastNDays(today, 7);

  return (
    <Card>
      <div className="flex items-center gap-4">
        <ProgressRing value={log?.pct ?? 0} size={84} stroke={7}>
          <span className="text-xl font-semibold tabular-nums">{log?.pct ?? 0}%</span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm font-semibold",
              result === "win" ? "text-success" : result === "none" ? "text-muted" : "text-fg",
            )}
          >
            {result === "win" ? "Victory secured" : result === "none" ? "No battle planned" : "Battle in progress"}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {log?.done ?? 0} of {log?.total ?? 0} done · win at {threshold}%
          </p>
          <div className="mt-2 flex gap-3 text-xs text-muted">
            <span className="flex items-center gap-1">
              <Flame className="size-3.5 text-accent" /> {streak} day streak
            </span>
            <span className="flex items-center gap-1">
              <Timer className="size-3.5" /> {log?.focusMin ?? 0}m
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between gap-1.5">
        {week.map((date) => {
          const l = days[date];
          const r = dayResult(l, date, today, threshold);
          return (
            <div key={date} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-14 w-full items-end overflow-hidden rounded-md bg-surface-2">
                <div
                  className={cn("w-full rounded-md transition-all", r === "win" ? "bg-success/80" : "bg-accent/70")}
                  style={{ height: `${l?.pct ?? 0}%` }}
                />
              </div>
              <span className={cn("text-[10px]", date === today ? "font-semibold text-fg" : "text-muted")}>
                {WEEKDAYS[fromKey(date).getDay()][0]}
              </span>
            </div>
          );
        })}
      </div>

      <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => startFocus({ label: "Deep work" })}>
        <Timer className="size-3.5" /> Start a focus session
      </Button>
    </Card>
  );
}

function MissionCard() {
  const mission = useStore((s) => s.settings.mission);
  const goals = useStore((s) => s.goals).filter((g) => !g.achieved);
  return (
    <Link href="/mission" className="block">
      <Card className="transition hover:border-accent/40">
        <SectionTitle>
          <span className="flex items-center gap-1.5">
            <Trophy className="size-3.5 text-accent" /> Mission
          </span>
        </SectionTitle>
        <p className="line-clamp-4 font-serif text-lg leading-snug">
          {mission || <span className="text-muted">Write the mission you are fighting for →</span>}
        </p>
        {goals.length > 0 && (
          <div className="mt-4 space-y-2.5">
            {goals.slice(0, 3).map((g) => (
              <div key={g.id}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="truncate">{g.title}</span>
                  <span className="text-muted">{pct(g.steps.filter((s) => s.done).length, g.steps.length)}%</span>
                </div>
                <ProgressBar value={pct(g.steps.filter((s) => s.done).length, g.steps.length)} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </Link>
  );
}

function UpNext() {
  const video = useStore((s) => s.videos).filter((v) => !v.done).sort((a, b) => a.order - b.order)[0];
  const book = useStore((s) => s.books).filter((b) => !b.done).sort((a, b) => a.order - b.order)[0];
  if (!video && !book) return null;
  return (
    <Card>
      <SectionTitle>Up next</SectionTitle>
      <div className="space-y-3">
        {video && (
          <Link href="/videos" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ytThumb(video.youtubeId)} alt="" className="aspect-video w-20 rounded-lg object-cover" />
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-[11px] text-muted">
                <SquarePlay className="size-3" /> Watch
              </p>
              <p className="line-clamp-2 text-sm">{video.title}</p>
            </div>
          </Link>
        )}
        {book && (
          <Link href="/books" className="flex items-center gap-3">
            {book.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={book.coverUrl} alt="" className="h-14 w-10 rounded object-cover" />
            ) : (
              <div className="flex h-14 w-10 items-center justify-center rounded bg-surface-2">
                <BookOpen className="size-4 text-muted" />
              </div>
            )}
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-[11px] text-muted">
                <BookOpen className="size-3" /> Reading
                {book.totalPages ? ` · ${pct(book.currentPage ?? 0, book.totalPages)}%` : ""}
              </p>
              <p className="line-clamp-2 text-sm">{book.title}</p>
            </div>
          </Link>
        )}
      </div>
    </Card>
  );
}

function RememberCard() {
  const today = useClock((s) => s.today);
  const learnings = useStore((s) => s.learnings);
  const [offset, setOffset] = useState(0);
  if (!learnings.length) return null;
  const pool = learnings.some((l) => l.starred) && offset === 0 ? learnings.filter((l) => l.starred) : learnings;
  const item = pool[(dayOfYear(today) + offset) % pool.length];
  return (
    <Card className="bg-accent-soft/40">
      <SectionTitle
        action={
          <button aria-label="Another learning" onClick={() => setOffset((o) => o + 1)} className="text-muted hover:text-fg">
            <Shuffle className="size-3.5" />
          </button>
        }
      >
        <span className="flex items-center gap-1.5">
          <Lightbulb className="size-3.5 text-accent" /> Remember
        </span>
      </SectionTitle>
      <p className="text-sm leading-relaxed">{item.text}</p>
      {item.refTitle && <p className="mt-2 truncate text-[11px] text-muted">from {item.refTitle}</p>}
    </Card>
  );
}

const MOODS = ["😞", "😕", "😐", "🙂", "🔥"];

function EveningReview() {
  const today = useClock((s) => s.today);
  const log = useStore((s) => s.days[today]);
  const updateDay = useStore((s) => s.updateDay);
  const addLearning = useStore((s) => s.addLearning);
  const [saved, setSaved] = useState(false);

  return (
    <Card>
      <SectionTitle>Daily review</SectionTitle>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-muted">How did today feel?</span>
        <div className="flex gap-1">
          {MOODS.map((m, i) => (
            <button
              key={m}
              aria-label={`Mood ${i + 1}`}
              onClick={() => updateDay(today, { mood: i + 1 })}
              className={cn(
                "flex size-9 items-center justify-center rounded-full text-lg transition",
                log?.mood === i + 1 ? "scale-110 bg-accent-soft" : "opacity-50 grayscale hover:opacity-100 hover:grayscale-0",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs text-muted">Today&apos;s win</span>
          <Textarea
            rows={3}
            defaultValue={log?.wins ?? ""}
            onBlur={(e) => updateDay(today, { wins: e.target.value })}
            placeholder="What went well?"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 flex items-center justify-between text-xs text-muted">
            Lesson learned
            {log?.lesson?.trim() && (
              <button
                type="button"
                className="font-medium text-accent disabled:text-muted"
                disabled={saved}
                onClick={() => {
                  addLearning({ text: log.lesson!, source: "day" });
                  setSaved(true);
                }}
              >
                {saved ? "Saved ✓" : "Save to learnings"}
              </button>
            )}
          </span>
          <Textarea
            rows={3}
            defaultValue={log?.lesson ?? ""}
            onBlur={(e) => {
              updateDay(today, { lesson: e.target.value });
              setSaved(false);
            }}
            placeholder="What did today teach you?"
          />
        </label>
      </div>
    </Card>
  );
}
