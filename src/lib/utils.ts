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

export const ytThumb = (id: string) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

export const extractTags = (text: string) =>
  Array.from(new Set((text.match(/#[\w-]+/g) ?? []).map((t) => t.slice(1).toLowerCase())));

const WEEKDAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export interface ParsedTask {
  title: string;
  date: string;
  priority: Priority;
  time?: string;
}

/**
 * Natural quick-add without AI:
 *   "Gym !high @6pm tomorrow"  → priority high, 18:00, tomorrow
 *   "Call mom @18:30 on friday" → next Friday
 *   "Read +3d"                  → three days from today
 */
export function parseQuickTask(input: string, baseDate: string): ParsedTask {
  let text = ` ${input} `;
  let priority: Priority = "med";
  let time: string | undefined;
  let date = baseDate;

  text = text.replace(/\s!(high|h|1|med|m|2|low|l|3)(?=\s)/i, (_, p: string) => {
    const k = p.toLowerCase();
    priority = k.startsWith("h") || k === "1" ? "high" : k.startsWith("l") || k === "3" ? "low" : "med";
    return " ";
  });

  text = text.replace(/\s@(\d{1,2})(?::(\d{2}))?\s?(am|pm)?(?=\s)/i, (_, h: string, m: string, ap: string) => {
    let hour = Number(h);
    if (ap?.toLowerCase() === "pm" && hour < 12) hour += 12;
    if (ap?.toLowerCase() === "am" && hour === 12) hour = 0;
    if (hour > 23) return _;
    time = `${String(hour).padStart(2, "0")}:${m ?? "00"}`;
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

  return { title: text.replace(/\s+/g, " ").trim(), date, priority, time };
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

/** Short chime via WebAudio — no asset files needed. */
export function chime() {
  try {
    const ctx = new AudioContext();
    [660, 880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  } catch {
    // audio unavailable
  }
}
