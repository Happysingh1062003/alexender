import { addDays, fromKey } from "./date";
import type { DayLog } from "./types";

export type DayResult = "win" | "loss" | "live" | "none";

export function dayResult(log: DayLog | undefined, date: string, today: string, threshold: number): DayResult {
  if (!log || log.total === 0) return "none";
  if (log.pct >= threshold) return "win";
  return date < today ? "loss" : "live";
}

/** Consecutive winning days ending today (or yesterday if today isn't won yet). */
export function currentStreak(days: Record<string, DayLog>, today: string, threshold: number) {
  let streak = 0;
  let d = today;
  if (dayResult(days[d], d, today, threshold) !== "win") d = addDays(d, -1);
  while (dayResult(days[d], d, today, threshold) === "win") {
    streak++;
    d = addDays(d, -1);
  }
  return streak;
}

export function bestStreak(days: Record<string, DayLog>, today: string, threshold: number) {
  const winDates = Object.values(days)
    .filter((l) => dayResult(l, l.date, today, threshold) === "win")
    .map((l) => l.date)
    .sort();
  let best = 0;
  let run = 0;
  let prev = "";
  for (const d of winDates) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export function rangeSummary(days: Record<string, DayLog>, dates: string[], today: string, threshold: number) {
  let wins = 0;
  let losses = 0;
  let perfect = 0;
  let sum = 0;
  let counted = 0;
  let focus = 0;
  for (const d of dates) {
    const log = days[d];
    focus += log?.focusMin ?? 0;
    const r = dayResult(log, d, today, threshold);
    if (r === "win") wins++;
    if (r === "loss") losses++;
    if (log && log.total > 0 && d <= today) {
      sum += log.pct;
      counted++;
      if (log.pct === 100) perfect++;
    }
  }
  return { wins, losses, perfect, focus, avg: counted ? Math.round(sum / counted) : 0, counted };
}

export function weekdayAverages(days: Record<string, DayLog>, today: string) {
  const sums = Array(7).fill(0);
  const counts = Array(7).fill(0);
  for (const log of Object.values(days)) {
    if (log.total === 0 || log.date > today) continue;
    const wd = fromKey(log.date).getDay();
    sums[wd] += log.pct;
    counts[wd]++;
  }
  return sums.map((s, i) => (counts[i] ? Math.round(s / counts[i]) : null));
}

export const lastNDays = (today: string, n: number) =>
  Array.from({ length: n }, (_, i) => addDays(today, i - n + 1));
