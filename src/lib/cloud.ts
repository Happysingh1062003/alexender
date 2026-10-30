import type { Data } from "./store";

/*
 * What leaves the device. Only tasks go to the cloud — with each day's score (done of total) and
 * your name, so a new device starts ready. Habits, journal, missions, books, photos and the rest
 * stay on this device only.
 * Used by both the app (what it sends) and the server (what it agrees to keep).
 */

export interface CloudData {
  tasks: Data["tasks"];
  days: Data["days"];
  /** Deleted tasks, so a delete on one device reaches the others. */
  deleted: Record<string, number>;
  settings: { name: string; updatedAt?: number };
}

export function cloudPart(data: Partial<Data>): CloudData {
  return {
    tasks: data.tasks ?? [],
    days: data.days ?? {},
    deleted: Object.fromEntries(Object.entries(data.deleted ?? {}).filter(([key]) => key.startsWith("tasks:"))),
    settings: { name: data.settings?.name ?? "", ...(data.settings?.updatedAt && { updatedAt: data.settings.updatedAt }) },
  };
}

/** True when a stored copy still holds more than the cloud part (saved before this rule). */
export const holdsMoreThanCloud = (data: Record<string, unknown>) =>
  Object.keys(data).some((key) => !["tasks", "days", "deleted", "settings", "epoch"].includes(key)) ||
  Object.keys((data.settings ?? {}) as object).some((key) => key !== "name" && key !== "updatedAt");
