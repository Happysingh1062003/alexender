"use client";

import { del, get, set } from "idb-keyval";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { todayKey } from "./date";
import { deleteImages } from "./images";
import type { Book, DayLog, Goal, JournalEntry, Mission, Priority, Settings, Task, Video } from "./types";
import { pct, uid } from "./utils";

const idbStorage: StateStorage = {
  getItem: async (name) => (await get<string>(name)) ?? null,
  setItem: async (name, value) => {
    await set(name, value);
  },
  removeItem: async (name) => {
    await del(name);
  },
};

/** Collections whose records sync individually. Tombstone keys are `${kind}:${id}`. */
export type Kind = "tasks" | "missions" | "goals" | "videos" | "books" | "journal";

export interface Data {
  tasks: Task[];
  days: Record<string, DayLog>;
  missions: Mission[];
  goals: Goal[];
  videos: Video[];
  books: Book[];
  journal: Record<string, JournalEntry>;
  settings: Settings;
  /** When each record was deleted, so a delete on one device removes it everywhere. */
  deleted: Record<string, number>;
}

export const DATA_KEYS = ["tasks", "days", "missions", "goals", "videos", "books", "journal", "settings", "deleted"] as const;

const defaultSettings: Settings = {
  name: "",
  winThreshold: 70,
  birthDate: "2003-06-10",
  country: "India",
};

const initialData: Data = {
  tasks: [],
  days: {},
  missions: [],
  goals: [],
  videos: [],
  books: [],
  journal: {},
  settings: defaultSettings,
  deleted: {},
};

interface Actions {
  addTask: (t: { title: string; date: string; priority?: Priority; time?: string }) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  toggleTask: (id: string) => void;
  startTask: (id: string) => void;
  deleteTask: (id: string) => void;
  carryOver: (from: string, to: string) => number;
  markDayStart: (date: string) => void;

  addMission: (text: string) => string;
  updateMission: (id: string, patch: Partial<Mission>) => void;
  deleteMission: (id: string) => void;

  addGoal: (g: { title: string; why?: string; deadline?: string }) => string;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;

  addVideo: (v: { url: string; youtubeId: string; title: string }) => string;
  updateVideo: (id: string, patch: Partial<Video>) => void;
  moveVideo: (id: string, dir: -1 | 1) => void;
  completeVideo: (id: string) => void;
  reopenVideo: (id: string) => void;
  deleteVideo: (id: string) => void;

  addBook: (b: { title: string; author: string; totalPages?: number }) => string;
  updateBook: (id: string, patch: Partial<Book>) => void;
  moveBook: (id: string, dir: -1 | 1) => void;
  completeBook: (id: string) => void;
  reopenBook: (id: string) => void;
  deleteBook: (id: string) => void;

  setJournal: (date: string, text: string) => void;

  updateSettings: (patch: Partial<Settings>) => void;
  /** Replace everything (import, erase). */
  replaceAll: (data: Partial<Data>) => void;
  /** Apply data merged from another device. Records keep their own timestamps. */
  applySynced: (data: Data) => void;
}

export type Store = Data & Actions;

/** Recompute and store the completion score for a day — this is the persisted daily record. */
export function withScore(days: Record<string, DayLog>, tasks: Task[], date: string): Record<string, DayLog> {
  const dayTasks = tasks.filter((t) => t.date === date);
  const done = dayTasks.filter((t) => t.done).length;
  const prev = days[date] ?? { date, total: 0, done: 0, pct: 0 };
  return { ...days, [date]: { ...prev, total: dayTasks.length, done, pct: pct(done, dayTasks.length) } };
}

const tombstone = (deleted: Record<string, number>, kind: Kind, id: string) => ({ ...deleted, [`${kind}:${id}`]: Date.now() });

/** Patch one record by id and stamp it as just edited. */
function patchById<T extends { id: string }>(list: T[], id: string, patch: Partial<T>): T[] {
  const now = Date.now();
  return list.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: now } : x));
}

/**
 * Minutes spent on a task being completed now. An explicit start wins; otherwise time runs from
 * the latest of: the previous task finished today, when today's work began, or when the task was added today.
 */
function autoSpent(s: Data, task: Task, now: number): number | undefined {
  const toMin = (ms: number) => Math.min(480, Math.max(1, Math.round(ms / 60_000)));
  if (task.startedAt) return toMin(now - task.startedAt);
  if (task.date !== todayKey()) return undefined;
  const midnight = new Date().setHours(0, 0, 0, 0);
  const anchors = [
    s.days[task.date]?.firstSeen,
    task.createdAt >= midnight ? task.createdAt : undefined,
    ...s.tasks.filter((t) => t.date === task.date && t.done && t.completedAt).map((t) => t.completedAt),
  ].filter((n): n is number => !!n && n <= now);
  return anchors.length ? toMin(now - Math.max(...anchors)) : undefined;
}

/** Fills defaults and upgrades data saved by older versions. */
export function normalize(p: Partial<Data>): Data {
  const { mission, ...settings } = { ...defaultSettings, ...p.settings };
  const missions = p.missions ?? (mission?.trim() ? [{ id: uid(), text: mission.trim(), images: [], createdAt: Date.now() }] : []);
  return {
    tasks: p.tasks ?? [],
    days: p.days ?? {},
    missions,
    goals: p.goals ?? [],
    videos: p.videos ?? [],
    books: p.books ?? [],
    journal: p.journal ?? {},
    settings,
    deleted: p.deleted ?? {},
  };
}

/** Swap a queue item with its neighbour; both are stamped so the new order syncs. */
const reorder = <T extends { id: string; order: number; done: boolean; updatedAt?: number }>(list: T[], id: string, dir: -1 | 1) => {
  const queue = list.filter((x) => !x.done).sort((a, b) => a.order - b.order);
  const i = queue.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= queue.length) return list;
  const a = queue[i];
  const b = queue[j];
  const now = Date.now();
  return list.map((x) =>
    x.id === a.id ? { ...x, order: b.order, updatedAt: now } : x.id === b.id ? { ...x, order: a.order, updatedAt: now } : x,
  );
};

const nextOrder = (list: { order: number }[]) => list.reduce((m, x) => Math.max(m, x.order), 0) + 1;

export const useStore = create<Store>()(
  persist(
    (setState, getState) => ({
      ...initialData,

      addTask: ({ title, date, priority = "med", time }) =>
        setState((s) => {
          const now = Date.now();
          const tasks = [...s.tasks, { id: uid(), title, date, priority, time, done: false, createdAt: now, updatedAt: now }];
          return { tasks, days: withScore(s.days, tasks, date) };
        }),

      updateTask: (id, patch) =>
        setState((s) => {
          const old = s.tasks.find((t) => t.id === id);
          if (!old) return s;
          const tasks = patchById(s.tasks, id, patch);
          let days = withScore(s.days, tasks, old.date);
          if (patch.date && patch.date !== old.date) days = withScore(days, tasks, patch.date);
          return { tasks, days };
        }),

      toggleTask: (id) =>
        setState((s) => {
          const task = s.tasks.find((t) => t.id === id);
          if (!task) return s;
          const now = Date.now();
          const patch: Partial<Task> = task.done
            ? { done: false, completedAt: undefined, spentMin: undefined }
            : { done: true, completedAt: now, spentMin: task.spentMin ?? autoSpent(s, task, now) };
          const tasks = patchById(s.tasks, id, patch);
          return { tasks, days: withScore(s.days, tasks, task.date) };
        }),

      // One task runs at a time; starting another pauses the rest.
      startTask: (id) =>
        setState((s) => {
          const now = Date.now();
          return {
            tasks: s.tasks.map((t) =>
              t.id === id
                ? { ...t, startedAt: now, updatedAt: now }
                : !t.done && t.startedAt
                  ? { ...t, startedAt: undefined, updatedAt: now }
                  : t,
            ),
          };
        }),

      deleteTask: (id) =>
        setState((s) => {
          const task = s.tasks.find((t) => t.id === id);
          if (!task) return s;
          const tasks = s.tasks.filter((t) => t.id !== id);
          return { tasks, days: withScore(s.days, tasks, task.date), deleted: tombstone(s.deleted, "tasks", id) };
        }),

      carryOver: (from, to) => {
        const pending = getState().tasks.filter((t) => t.date === from && !t.done);
        if (!pending.length) return 0;
        setState((s) => {
          const ids = new Set(pending.map((t) => t.id));
          const now = Date.now();
          const tasks = s.tasks.map((t) => (ids.has(t.id) ? { ...t, date: to, startedAt: undefined, updatedAt: now } : t));
          return { tasks, days: withScore(withScore(s.days, tasks, from), tasks, to) };
        });
        return pending.length;
      },

      markDayStart: (date) =>
        setState((s) =>
          s.days[date]?.firstSeen
            ? s
            : { days: { ...s.days, [date]: { ...(s.days[date] ?? { date, total: 0, done: 0, pct: 0 }), firstSeen: Date.now() } } },
        ),

      addMission: (text) => {
        const id = uid();
        const now = Date.now();
        setState((s) => ({ missions: [...s.missions, { id, text, images: [], createdAt: now, updatedAt: now }] }));
        return id;
      },
      updateMission: (id, patch) => setState((s) => ({ missions: patchById(s.missions, id, patch) })),
      deleteMission: (id) => {
        const mission = getState().missions.find((m) => m.id === id);
        if (mission) deleteImages(mission.images);
        setState((s) => ({ missions: s.missions.filter((m) => m.id !== id), deleted: tombstone(s.deleted, "missions", id) }));
      },

      addGoal: ({ title, why = "", deadline }) => {
        const id = uid();
        const now = Date.now();
        setState((s) => ({ goals: [...s.goals, { id, title, why, deadline, images: [], achieved: false, createdAt: now, updatedAt: now }] }));
        return id;
      },
      updateGoal: (id, patch) => setState((s) => ({ goals: patchById(s.goals, id, patch) })),
      deleteGoal: (id) => {
        const goal = getState().goals.find((g) => g.id === id);
        if (goal) deleteImages(goal.images);
        setState((s) => ({ goals: s.goals.filter((g) => g.id !== id), deleted: tombstone(s.deleted, "goals", id) }));
      },

      addVideo: (v) => {
        const id = uid();
        const now = Date.now();
        setState((s) => ({ videos: [...s.videos, { ...v, id, done: false, createdAt: now, updatedAt: now, order: nextOrder(s.videos) }] }));
        return id;
      },
      updateVideo: (id, patch) => setState((s) => ({ videos: patchById(s.videos, id, patch) })),
      moveVideo: (id, dir) => setState((s) => ({ videos: reorder(s.videos, id, dir) })),
      completeVideo: (id) => setState((s) => ({ videos: patchById(s.videos, id, { done: true, completedAt: Date.now() }) })),
      reopenVideo: (id) =>
        setState((s) => ({ videos: patchById(s.videos, id, { done: false, completedAt: undefined, order: nextOrder(s.videos) }) })),
      deleteVideo: (id) => setState((s) => ({ videos: s.videos.filter((v) => v.id !== id), deleted: tombstone(s.deleted, "videos", id) })),

      addBook: (b) => {
        const id = uid();
        const now = Date.now();
        setState((s) => ({ books: [...s.books, { ...b, id, done: false, createdAt: now, updatedAt: now, order: nextOrder(s.books) }] }));
        return id;
      },
      updateBook: (id, patch) => setState((s) => ({ books: patchById(s.books, id, patch) })),
      moveBook: (id, dir) => setState((s) => ({ books: reorder(s.books, id, dir) })),
      completeBook: (id) =>
        setState((s) => {
          const book = s.books.find((b) => b.id === id);
          return { books: patchById(s.books, id, { done: true, completedAt: Date.now(), currentPage: book?.totalPages ?? book?.currentPage }) };
        }),
      reopenBook: (id) =>
        setState((s) => ({ books: patchById(s.books, id, { done: false, completedAt: undefined, order: nextOrder(s.books) }) })),
      deleteBook: (id) => setState((s) => ({ books: s.books.filter((b) => b.id !== id), deleted: tombstone(s.deleted, "books", id) })),

      setJournal: (date, text) =>
        setState((s) => {
          const journal = { ...s.journal };
          if (text.trim()) {
            journal[date] = { date, text, updatedAt: Date.now() };
            return { journal };
          }
          if (!journal[date]) return s;
          delete journal[date];
          return { journal, deleted: tombstone(s.deleted, "journal", date) };
        }),

      updateSettings: (patch) => setState((s) => ({ settings: { ...s.settings, ...patch, updatedAt: Date.now() } })),

      replaceAll: (data) => setState({ ...initialData, ...normalize(data) }),

      applySynced: (data) => setState(data),
    }),
    {
      name: "alexender-data",
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      skipHydration: true,
      partialize: (s) => pickData(s),
      merge: (persisted, current) => ({ ...current, ...normalize((persisted ?? {}) as Partial<Data>) }),
    },
  ),
);

/** The persisted/synced part of the store. */
export function pickData(s: Data): Data {
  const { tasks, days, missions, goals, videos, books, journal, settings, deleted } = s;
  return { tasks, days, missions, goals, videos, books, journal, settings, deleted };
}

/** Every image id referenced anywhere — used for backups and photo sync. */
export const allImageIds = (s: Data) => [...s.missions.flatMap((m) => m.images), ...s.goals.flatMap((g) => g.images)];

/** Ticking clock shared by the whole app (not persisted). */
export const useClock = create<{ now: number; today: string; tick: () => void }>((setState) => ({
  now: 0,
  today: "",
  tick: () => setState({ now: Date.now(), today: todayKey() }),
}));

/** UI-only state. */
export const useUI = create<{ unlocked: boolean; setUnlocked: (unlocked: boolean) => void }>((setState) => ({
  unlocked: false,
  setUnlocked: (unlocked) => setState({ unlocked }),
}));
