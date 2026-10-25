import { addDays } from "./date";
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

export function rangeSummary(days: Record<string, DayLog>, dates: string[], today: string, threshold: number) {
  let wins = 0;
  let losses = 0;
  let sum = 0;
  let counted = 0;
  for (const d of dates) {
    const log = days[d];
    const r = dayResult(log, d, today, threshold);
    if (r === "win") wins++;
    if (r === "loss") losses++;
    if (log && log.total > 0 && d <= today) {
      sum += log.pct;
      counted++;
    }
  }
  return { wins, losses, avg: counted ? Math.round(sum / counted) : 0, counted };
}

export const lastNDays = (today: string, n: number) =>
  Array.from({ length: n }, (_, i) => addDays(today, i - n + 1));
