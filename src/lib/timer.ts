import type { TimerSession } from "./types";

/** Still counting down. */
export const isRunning = (s: TimerSession, now: number) => !s.endedAt && now < s.endsAt;

/** Minutes timed so far: up to when it ended, or up to now while it runs. */
export const sessionMinutes = (s: TimerSession, now: number) => Math.max(0, ((s.endedAt ?? Math.min(now, s.endsAt)) - s.startedAt) / 60_000);

/** Minutes per task title on one day, most first. */
export function totalsByTask(sessions: TimerSession[], date: string, now: number) {
  const map = new Map<string, number>();
  for (const s of sessions) if (s.date === date) map.set(s.title, (map.get(s.title) ?? 0) + sessionMinutes(s, now));
  return [...map.entries()].map(([title, minutes]) => ({ title, minutes })).sort((a, b) => b.minutes - a.minutes);
}

/** Minutes timed on each day. */
export function minutesByDay(sessions: TimerSession[], now: number) {
  const map: Record<string, number> = {};
  for (const s of sessions) map[s.date] = (map[s.date] ?? 0) + sessionMinutes(s, now);
  return map;
}

/** 0:05:09 → "5:09"; past an hour → "1:05:09". */
export function formatClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}
