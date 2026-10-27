"use client";

import { useMemo, useState } from "react";
import { Input, ProgressBar, Segmented, Select } from "@/components/ui";
import { fromKey } from "@/lib/date";
import { computeLife, expectancyFor, formatNumber, LIFE_EXPECTANCY } from "@/lib/life";
import { useClock, useStore } from "@/lib/store";

const DAY = 86_400_000;

type View = "weeks" | "year";

/** What is left of today, this week, this month and this year. */
function useCycles(now: number) {
  return useMemo(() => {
    const d = new Date(now);
    const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const weekday = (d.getDay() + 6) % 7; // Monday first
    const endOfWeek = startOfDay + (7 - weekday) * DAY;
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    const endOfYear = new Date(d.getFullYear() + 1, 0, 1).getTime();
    return [
      { label: "Today", value: `${Math.ceil((startOfDay + DAY - now) / 3_600_000)}h` },
      { label: "Week", value: `${Math.ceil((endOfWeek - now) / DAY)}d` },
      { label: "Month", value: `${Math.ceil((endOfMonth - now) / DAY)}d` },
      { label: "Year", value: `${Math.ceil((endOfYear - now) / DAY)}d` },
    ];
  }, [now]);
}

/** Your time, plainly: what's left, how much is gone, and one picture of it. */
export default function LifePage() {
  const now = useClock((s) => s.now);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const [editing, setEditing] = useState(false);
  const view: View = settings.lifeView === "year" ? "year" : "weeks";
  const expectancy = expectancyFor(settings.country, settings.lifeExpectancy);
  const life = computeLife(settings.birthDate, expectancy, now);
  const cycles = useCycles(now);

  return (
    <div className="mx-auto max-w-xl">
      <section className="text-center">
        <p className="text-[64px] leading-none font-semibold tracking-[-0.04em] tabular-nums sm:text-[80px]">{formatNumber(life.weeksLeft)}</p>
        <p className="mt-3 text-[14px] text-muted">weeks left</p>
      </section>

      <section className="mx-auto mt-10 max-w-sm">
        <div className="mb-2 flex justify-between text-[12px] text-faint tabular-nums">
          <span>{life.pctLived.toFixed(1)}% lived</span>
          <span>{life.yearsLeft.toFixed(1)} years left</span>
        </div>
        <ProgressBar value={life.pctLived} />
      </section>

      <section className="mx-auto mt-10 grid max-w-sm grid-cols-4 text-center">
        {cycles.map((c) => (
          <div key={c.label}>
            <p className="text-[18px] font-semibold tabular-nums">{c.value}</p>
            <p className="mt-0.5 text-[11px] text-faint">{c.label}</p>
          </div>
        ))}
      </section>

      <section className="mt-14">
        <div className="mb-5 flex justify-center">
          <Segmented<View>
            value={view}
            onChange={(lifeView) => updateSettings({ lifeView })}
            options={[
              { value: "weeks", label: "Life in weeks" },
              { value: "year", label: "This year" },
            ]}
          />
        </div>
        {view === "weeks" ? (
          <Grid total={Math.ceil(expectancy) * 52} lived={life.weeksLived} cols={52} labelEvery={10 * 52} labelStep={10} />
        ) : (
          <YearDays now={now} />
        )}
      </section>

      <section className="mt-12 pb-6 text-center">
        <button onClick={() => setEditing((e) => !e)} className="px-2 py-2.5 text-[12px] text-faint transition-colors hover:text-fg">
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
            <div>
              <span className="mb-1.5 block text-[11px] text-faint">Country</span>
              <Select
                label="Country"
                value={settings.country}
                onChange={(country) => updateSettings({ country })}
                options={Object.keys(LIFE_EXPECTANCY)
                  .sort()
                  .map((c) => ({ value: c, label: `${c} · ${LIFE_EXPECTANCY[c]}` }))}
                className="h-11 w-full justify-between rounded-xl border border-line bg-surface px-3.5 text-[14px]"
                menuClassName="w-full"
                wide
              />
            </div>
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
        <path d={past} fill="var(--surface-2)" />
        <path d={future} fill="var(--fg)" fillOpacity={0.3} />
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
        <path d={past} fill="var(--surface-2)" />
        <path d={future} fill="var(--fg)" fillOpacity={0.3} />
        <rect x={(todayDate - 1) * (cell + gap)} y={todayMonth * (tall + gap)} width={cell} height={tall} rx={2} fill="var(--crystal)">
          <animate attributeName="opacity" values="1;0.4;1" dur="2.4s" repeatCount="indefinite" />
        </rect>
      </svg>
    </div>
  );
}
