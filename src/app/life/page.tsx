"use client";

import { useMemo, useState } from "react";
import { Statue } from "@/components/brand";
import { Input, Segmented } from "@/components/ui";
import { fromKey } from "@/lib/date";
import { ALEXANDER_YEARS, computeLife, expectancyFor, formatNumber, LIFE_EXPECTANCY } from "@/lib/life";
import { useClock, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type Unit = "days" | "weeks" | "months" | "years";
const UNITS = ["days", "weeks", "months", "years"] as const;
const DAY = 86_400_000;

/** How far through today, this week, month and year you are, and what is left of each. */
function useCycles(now: number) {
  return useMemo(() => {
    const d = new Date(now);
    const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const weekday = (d.getDay() + 6) % 7; // Monday first
    const startOfWeek = startOfDay - weekday * DAY;
    const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    const startOfYear = new Date(d.getFullYear(), 0, 1).getTime();
    const endOfYear = new Date(d.getFullYear() + 1, 0, 1).getTime();
    const part = (start: number, end: number) => Math.min(1, Math.max(0, (now - start) / (end - start)));
    return {
      day: { passed: part(startOfDay, startOfDay + DAY), left: Math.ceil((startOfDay + DAY - now) / 3_600_000), unit: "hours" },
      week: { passed: part(startOfWeek, startOfWeek + 7 * DAY), left: Math.ceil((startOfWeek + 7 * DAY - now) / DAY), unit: "days" },
      month: { passed: part(startOfMonth, endOfMonth), left: Math.ceil((endOfMonth - now) / DAY), unit: "days" },
      year: { passed: part(startOfYear, endOfYear), left: Math.ceil((endOfYear - now) / DAY), unit: "days" },
    };
  }, [now]);
}

export default function LifePage() {
  const now = useClock((s) => s.now);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const [editing, setEditing] = useState(false);
  const [unit, setUnit] = useState<Unit>("weeks");
  const expectancy = expectancyFor(settings.country, settings.lifeExpectancy);
  const life = computeLife(settings.birthDate, expectancy, now);
  const cycles = useCycles(now);

  const left: Record<Unit, number> = { days: life.daysLeft, weeks: life.weeksLeft, months: life.monthsLeft, years: Math.floor(life.yearsLeft) };
  const lived: Record<Unit, number> = { days: life.daysLived, weeks: life.weeksLived, months: life.monthsLived, years: life.years };
  const years = Math.ceil(expectancy);

  return (
    <div className="mx-auto max-w-xl">
      {/* The one number. */}
      <section className="text-center">
        <p key={unit} className="animate-rise text-[64px] leading-none font-semibold tracking-[-0.04em] tabular-nums sm:text-[84px]">
          {formatNumber(left[unit])}
        </p>
        <p className="mt-3 text-[14px] text-muted">
          {unit} left · <span className="text-faint">{formatNumber(lived[unit])} lived</span>
        </p>
        <div className="mt-7 flex justify-center">
          <Segmented value={unit} onChange={setUnit} options={UNITS.map((u) => ({ value: u, label: u[0].toUpperCase() + u.slice(1) }))} />
        </div>
      </section>

      {/* What is left of today, this week, this month, this year, this life. */}
      <Section title="Time left">
        <div className="grid grid-cols-5 gap-2">
          <Ring label="Today" passed={cycles.day.passed} value={cycles.day.left} unit="h" />
          <Ring label="Week" passed={cycles.week.passed} value={cycles.week.left} unit="d" />
          <Ring label="Month" passed={cycles.month.passed} value={cycles.month.left} unit="d" />
          <Ring label="Year" passed={cycles.year.passed} value={cycles.year.left} unit="d" />
          <Ring label="Life" passed={life.pctLived / 100} value={Math.floor(life.yearsLeft)} unit="y" accent />
        </div>
      </Section>

      {/* Your life as a line, with Alexander's age on it. */}
      <Section title="Timeline">
        <Timeline age={life.yearsLived} expectancy={expectancy} />
      </Section>

      {/* The grid follows the unit chosen above. */}
      <Section title={GRID_TITLE[unit]} note={gridNote(unit, life, cycles.year.left)}>
        {unit === "days" && <YearDays now={now} />}
        {unit === "weeks" && <Grid total={years * 52} lived={life.weeksLived} cols={52} labelEvery={10 * 52} labelStep={10} />}
        {unit === "months" && <Grid total={years * 12} lived={life.monthsLived} cols={24} labelEvery={10 * 12} labelStep={10} />}
        {unit === "years" && <Grid total={years} lived={life.years} cols={10} labelEvery={10} labelStep={10} big />}
      </Section>

      {/* Alexander's clock. */}
      <section className="mt-14 flex items-center gap-5 rounded-2xl border border-line px-5 py-5">
        <Statue className="h-[92px] w-auto shrink-0" />
        <div className="min-w-0">
          <p className="text-[11px] text-faint">Alexander · 356–323 BC</p>
          <p className="mt-1 text-[15px] leading-snug font-medium">He changed the world before he was 33.</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
            {life.toAlexander > 0 ? (
              <>
                You reach his age in <span className="text-crystal tabular-nums">{formatNumber(life.toAlexander)}</span> days.
              </>
            ) : (
              "You have already outlived him."
            )}
          </p>
        </div>
      </section>

      <section className="mt-10 pb-6 text-center">
        <button onClick={() => setEditing((e) => !e)} className="text-[12px] text-faint transition-colors hover:text-fg">
          Born {fromKey(settings.birthDate).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })} ·{" "}
          {settings.lifeExpectancy ? `${settings.lifeExpectancy} years (your estimate)` : `${settings.country}, ${expectancy} years`} ·{" "}
          <span className="underline underline-offset-4">{editing ? "done" : "change"}</span>
        </button>
        {editing && (
          <div className="animate-sheet mx-auto mt-5 grid max-w-md grid-cols-1 gap-3 text-left sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-[11px] text-faint">Born</span>
              <Input type="date" value={settings.birthDate} onChange={(e) => e.target.value && updateSettings({ birthDate: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] text-faint">Country</span>
              <select
                value={settings.country}
                onChange={(e) => updateSettings({ country: e.target.value })}
                className="h-10 w-full rounded-lg border border-line bg-surface px-2 text-fg outline-none focus:border-line-strong"
              >
                {Object.keys(LIFE_EXPECTANCY)
                  .sort()
                  .map((c) => (
                    <option key={c} value={c}>
                      {c} · {LIFE_EXPECTANCY[c]}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] text-faint">Own estimate</span>
              <Input
                type="number"
                min={30}
                max={120}
                step={0.5}
                value={settings.lifeExpectancy ?? ""}
                placeholder={String(LIFE_EXPECTANCY[settings.country] ?? 72)}
                onChange={(e) => updateSettings({ lifeExpectancy: Number(e.target.value) || undefined })}
              />
            </label>
          </div>
        )}
      </section>
    </div>
  );
}

const GRID_TITLE: Record<Unit, string> = {
  days: "This year, day by day",
  weeks: "Your life in weeks",
  months: "Your life in months",
  years: "Your life in years",
};

const gridNote = (unit: Unit, life: ReturnType<typeof computeLife>, yearDaysLeft: number) =>
  unit === "days" ? `${yearDaysLeft} days left this year` : `${formatNumber(unit === "weeks" ? life.weeksLeft : unit === "months" ? life.monthsLeft : Math.floor(life.yearsLeft))} left`;

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h2 className="text-[13px] font-medium text-muted">{title}</h2>
        {note && <p className="text-[12px] text-faint tabular-nums">{note}</p>}
      </div>
      {children}
    </section>
  );
}

/** A small ring: the filled arc is time passed, the number is what's left. */
function Ring({ label, passed, value, unit, accent }: { label: string; passed: number; value: number; unit: string; accent?: boolean }) {
  const r = 26;
  const len = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center">
      <div className="relative aspect-square w-full max-w-[72px]">
        <svg viewBox="0 0 64 64" className="size-full -rotate-90" aria-hidden>
          <circle cx="32" cy="32" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="3.5" />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke={accent ? "var(--crystal)" : "var(--fg)"}
            strokeOpacity={accent ? 1 : 0.8}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={len}
            className="animate-ring-fill"
            style={{ ["--len" as string]: len, ["--to" as string]: len * (1 - passed), strokeDashoffset: len * (1 - passed) }}
          />
        </svg>
        <p className="absolute inset-0 flex items-center justify-center text-[13px] font-semibold tabular-nums sm:text-[15px]">
          {formatNumber(value)}
          <span className="ml-px text-[10px] font-medium text-faint">{unit}</span>
        </p>
      </div>
      <p className="mt-2 text-[11px] text-faint">{label}</p>
    </div>
  );
}

/** Birth to the expected end, with today and the age Alexander reached marked on it. */
function Timeline({ age, expectancy }: { age: number; expectancy: number }) {
  const at = (years: number) => `${Math.min(100, (years / expectancy) * 100)}%`;
  const ticks = Array.from({ length: Math.floor(expectancy / 10) + 1 }, (_, i) => i * 10);
  return (
    <div className="px-1 pt-7 pb-6">
      <div className="relative h-[3px] rounded-full bg-surface-3">
        <div className="absolute inset-y-0 left-0 rounded-full bg-fg/80 transition-[width] duration-1000" style={{ width: at(age) }} />
        <Marker left={at(ALEXANDER_YEARS)} label="Alexander, 32" above={false} />
        <Marker left={at(age)} label={`You, ${Math.floor(age)}`} above accent />
        {ticks.map((t) => (
          <span key={t} className="absolute top-3 -translate-x-1/2 text-[10px] text-faint tabular-nums" style={{ left: at(t) }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function Marker({ left, label, above, accent }: { left: string; label: string; above: boolean; accent?: boolean }) {
  return (
    <span className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left }}>
      <span className={cn("block size-2.5 rounded-full ring-4 ring-bg", accent ? "bg-crystal" : "bg-muted")} />
      <span
        className={cn(
          "absolute left-1/2 -translate-x-1/2 text-[11px] whitespace-nowrap",
          above ? "bottom-5" : "top-7",
          accent ? "text-fg" : "text-faint",
        )}
      >
        {label}
      </span>
    </span>
  );
}

/** One SVG for the whole grid — thousands of DOM nodes would be slow on phones. */
function Grid({ total, lived, cols, labelEvery, labelStep, big }: { total: number; lived: number; cols: number; labelEvery: number; labelStep: number; big?: boolean }) {
  const cell = big ? 24 : 10;
  const gap = big ? 6 : 3;
  const rows = Math.ceil(total / cols);
  const width = cols * (cell + gap) - gap;
  const height = rows * (cell + gap) - gap;
  const radius = big ? 5 : 2;

  const { past, future } = useMemo(() => {
    const past: string[] = [];
    const future: string[] = [];
    for (let i = 0; i < total; i++) {
      if (i === lived) continue;
      const x = (i % cols) * (cell + gap);
      const y = Math.floor(i / cols) * (cell + gap);
      (i < lived ? past : future).push(`M${x + radius},${y}h${cell - 2 * radius}a${radius},${radius} 0 0 1 ${radius},${radius}v${cell - 2 * radius}a${radius},${radius} 0 0 1 -${radius},${radius}h-${cell - 2 * radius}a${radius},${radius} 0 0 1 -${radius},-${radius}v-${cell - 2 * radius}a${radius},${radius} 0 0 1 ${radius},-${radius}z`);
    }
    return { past: past.join(""), future: future.join("") };
  }, [total, lived, cols, cell, gap, radius]);

  const cx = (lived % cols) * (cell + gap);
  const cy = Math.floor(lived / cols) * (cell + gap);
  const labels = Array.from({ length: Math.floor((total - 1) / labelEvery) + 1 }, (_, i) => i);

  return (
    <div className="animate-fade relative pl-6">
      {labels.map((i) => (
        <span
          key={i}
          className="absolute left-0 -translate-y-1/2 text-[10px] text-faint tabular-nums"
          style={{ top: `${(((Math.floor((i * labelEvery) / cols) * (cell + gap)) + cell / 2) / height) * 100}%` }}
        >
          {i * labelStep}
        </span>
      ))}
      <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img" aria-label={`${lived} of ${total} lived`}>
        <path d={future} fill="var(--surface-2)" />
        <path d={past} fill="var(--fg)" fillOpacity={0.32} />
        {lived < total && (
          <rect x={cx} y={cy} width={cell} height={cell} rx={radius} fill="var(--crystal)">
            <animate attributeName="opacity" values="1;0.4;1" dur="2.4s" repeatCount="indefinite" />
          </rect>
        )}
      </svg>
    </div>
  );
}

/** This year as twelve rows of days: what has gone, today, and what is still ahead. */
function YearDays({ now }: { now: number }) {
  const d = new Date(now);
  const year = d.getFullYear();
  const cell = 10;
  const tall = 15; // rows a little taller than wide, so the month letters breathe
  const gap = 3;
  const width = 31 * (cell + gap) - gap;
  const height = 12 * (tall + gap) - gap;
  const todayMonth = d.getMonth();
  const todayDate = d.getDate();

  const { past, future } = useMemo(() => {
    const past: string[] = [];
    const future: string[] = [];
    for (let m = 0; m < 12; m++) {
      const days = new Date(year, m + 1, 0).getDate();
      for (let day = 1; day <= days; day++) {
        if (m === todayMonth && day === todayDate) continue;
        const x = (day - 1) * (cell + gap);
        const y = m * (tall + gap);
        const isPast = m < todayMonth || (m === todayMonth && day < todayDate);
        (isPast ? past : future).push(`M${x},${y}h${cell}v${tall}h-${cell}z`);
      }
    }
    return { past: past.join(""), future: future.join("") };
  }, [year, todayMonth, todayDate]);

  const months = Array.from({ length: 12 }, (_, m) => new Date(year, m, 1).toLocaleDateString(undefined, { month: "narrow" }));
  return (
    <div className="animate-fade relative pl-6">
      {months.map((label, m) => (
        <span key={m} className="absolute left-0 -translate-y-1/2 text-[10px] text-faint" style={{ top: `${((m * (tall + gap) + tall / 2) / height) * 100}%` }}>
          {label}
        </span>
      ))}
      <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img" aria-label={`Day ${todayDate} of month ${todayMonth + 1}`}>
        <path d={future} fill="var(--surface-2)" />
        <path d={past} fill="var(--fg)" fillOpacity={0.32} />
        <rect x={(todayDate - 1) * (cell + gap)} y={todayMonth * (tall + gap)} width={cell} height={tall} rx={2} fill="var(--crystal)">
          <animate attributeName="opacity" values="1;0.4;1" dur="2.4s" repeatCount="indefinite" />
        </rect>
      </svg>
    </div>
  );
}
