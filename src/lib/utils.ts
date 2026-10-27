import { addDays, fromKey, toKey } from "./date";
import type { Priority } from "./types";

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const cn = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(" ");

export const pct = (done: number, total: number) =>
  total === 0 ? 0 : Math.round((done / total) * 100);

export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const url = new URL(s.startsWith("http") ? s : `https://${s}`);
    const host = url.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return url.pathname.slice(1, 12) || null;
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const v = url.searchParams.get("v");
      if (v) return v.slice(0, 11);
      const m = url.pathname.match(/\/(shorts|embed|live|v)\/([\w-]{11})/);
      if (m) return m[2];
    }
  } catch {
    return null;
  }
  return null;
}

export const ytThumb = (id: string, size: "mq" | "hq" = "mq") => `https://i.ytimg.com/vi/${id}/${size}default.jpg`;

/** "45m", "1h 20m". */
export const formatMinutes = (min: number) => {
  const total = Math.round(min);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
};

/** "3:33", "1:02:10". */
export const formatDuration = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};

/** "1.6B", "24K". */
export const formatCount = (n: number) =>
  new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);

const WEEKDAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export interface ParsedTask {
  title: string;
  date: string;
  priority: Priority;
}

/**
 * Natural quick-add without AI:
 *   "Gym !high tomorrow" → priority high, tomorrow
 *   "Call mom on friday" → next Friday
 *   "Read +3d"           → three days from today
 */
export function parseQuickTask(input: string, baseDate: string): ParsedTask {
  let text = ` ${input} `;
  let priority: Priority = "med";
  let date = baseDate;

  text = text.replace(/\s!(high|h|1|med|m|2|low|l|3)(?=\s)/i, (_, p: string) => {
    const k = p.toLowerCase();
    priority = k.startsWith("h") || k === "1" ? "high" : k.startsWith("l") || k === "3" ? "low" : "med";
    return " ";
  });

  text = text.replace(/\s(tomorrow|tmr)(?=\s)/i, () => {
    date = addDays(baseDate, 1);
    return " ";
  });

  text = text.replace(/\s\+(\d{1,3})d(?=\s)/i, (_, n: string) => {
    date = addDays(baseDate, Number(n));
    return " ";
  });

  text = text.replace(/\son\s(sun|mon|tue|wed|thu|fri|sat)[a-z]*(?=\s)/i, (_, d: string) => {
    const target = WEEKDAY_NAMES.findIndex((n) => n.startsWith(d.toLowerCase()));
    const base = fromKey(baseDate);
    const diff = (target - base.getDay() + 7) % 7 || 7;
    base.setDate(base.getDate() + diff);
    date = toKey(base);
    return " ";
  });

  return { title: text.replace(/\s+/g, " ").trim(), date, priority };
}

export const PRIORITY_ORDER: Record<Priority, number> = { high: 0, med: 1, low: 2 };

export function downloadFile(name: string, content: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
