"use client";

import { useMemo, useState } from "react";
import { Input, SectionTop } from "@/components/ui";
import { fromKey } from "@/lib/date";
import { computeLife, expectancyFor, formatNumber, LIFE_EXPECTANCY } from "@/lib/life";
import { useClock, useStore } from "@/lib/store";

export default function LifePage() {
  const now = useClock((s) => s.now);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const [editing, setEditing] = useState(false);
  const expectancy = expectancyFor(settings.country, settings.lifeExpectancy);
  const life = computeLife(settings.birthDate, expectancy, now);

  return (
    <div className="mx-auto max-w-xl text-center">
      <SectionTop label="Life" />

      <p className="font-mono text-[56px] leading-none font-medium tracking-tight tabular-nums sm:text-[84px]">{formatNumber(life.daysLeft)}</p>
      <p className="mt-3 text-[15px] text-muted">days left</p>

      <div className="mx-auto mt-8 h-1 max-w-xs overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full bg-fg" style={{ width: `${life.pctLived}%` }} />
      </div>
      <p className="mt-2.5 text-[12px] text-faint">
        {life.years} years, {life.months} months · {life.pctLived.toFixed(1)}% lived
      </p>

      <section className="mt-14 grid grid-cols-3 gap-4">
        <Stat value={formatNumber(life.weeksLeft)} label="weeks left" />
        <Stat value={formatNumber(Math.floor(life.yearsLeft))} label="summers left" />
        <Stat value={formatNumber(life.daysLived)} label="days lived" />
      </section>

      <section className="mt-14">
        <WeeksGrid lived={life.weeksLived} years={Math.ceil(expectancy)} />
        <p className="mt-3 text-[11px] text-faint">Each square is a week of your life.</p>
      </section>

      <section className="mt-14 pb-6">
        <button onClick={() => setEditing((e) => !e)} className="text-[12px] text-faint transition-colors hover:text-fg">
          Born {fromKey(settings.birthDate).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })} ·{" "}
          {settings.lifeExpectancy ? `${settings.lifeExpectancy} years (your estimate)` : `${settings.country}, ${expectancy} years`} ·{" "}
          <span className="underline underline-offset-4">{editing ? "done" : "change"}</span>
        </button>
        {editing && (
          <div className="mx-auto mt-5 grid max-w-md grid-cols-1 gap-3 text-left sm:grid-cols-3">
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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-mono text-[22px] font-medium tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-[11px] text-faint">{label}</p>
    </div>
  );
}

/** One SVG for the whole grid — thousands of DOM nodes would be slow on phones. */
function WeeksGrid({ lived, years }: { lived: number; years: number }) {
  const cell = 10;
  const gap = 3;
  const cols = 52;
  const width = cols * (cell + gap) - gap;
  const height = years * (cell + gap) - gap;

  const { past, current, future } = useMemo(() => {
    const past: string[] = [];
    const future: string[] = [];
    for (let i = 0; i < years * cols; i++) {
      const x = (i % cols) * (cell + gap);
      const y = Math.floor(i / cols) * (cell + gap);
      const d = `M${x},${y}h${cell}v${cell}h-${cell}z`;
      if (i < lived) past.push(d);
      else if (i > lived) future.push(d);
    }
    return { past: past.join(""), future: future.join(""), current: lived };
  }, [lived, years]);

  const cx = (current % cols) * (cell + gap);
  const cy = Math.floor(current / cols) * (cell + gap);

  // Year labels sit in a left gutter, positioned as a percentage of the grid's height.
  return (
    <div className="relative pl-6">
      {Array.from({ length: Math.floor(years / 10) + 1 }, (_, i) => (
        <span
          key={i}
          className="absolute left-0 -translate-y-1/2 font-mono text-[9px] text-faint"
          style={{ top: `${((i * 10 * (cell + gap) + cell / 2) / height) * 100}%` }}
        >
          {i * 10}
        </span>
      ))}
      <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img" aria-label={`${lived} weeks lived out of ${years * cols}`}>
        <path d={future} fill="var(--surface-3)" />
        <path d={past} fill="var(--muted)" fillOpacity={0.75} />
        <rect x={cx} y={cy} width={cell} height={cell} fill="var(--success)">
          <animate attributeName="opacity" values="1;0.35;1" dur="2.4s" repeatCount="indefinite" />
        </rect>
      </svg>
    </div>
  );
}
