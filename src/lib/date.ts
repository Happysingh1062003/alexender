const pad = (n: number) => String(n).padStart(2, "0");

export const toKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromKey = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const todayKey = () => toKey(new Date());

export const addDays = (key: string, n: number) => {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
};

export const daysBetween = (from: string, to: string) =>
  Math.round((fromKey(to).getTime() - fromKey(from).getTime()) / 86_400_000);

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const formatShort = (key: string) =>
  fromKey(key).toLocaleDateString(undefined, { day: "numeric", month: "short" });

export const formatTime12 = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  return `${h % 12 || 12}${m ? `:${pad(m)}` : ""}${suffix}`;
};
