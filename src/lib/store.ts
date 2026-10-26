"use client";

import { del, get, set } from "idb-keyval";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { todayKey } from "./date";
import { deleteImages } from "./images";
import type { Book, BucketItem, DayLog, Goal, JournalEntry, ListItem, Mission, Plan, Priority, Settings, Task, Video } from "./types";
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
export type Kind = "tasks" | "missions" | "goals" | "videos" | "books" | "bucket" | "todos" | "donts" | "podcasts" | "plans" | "journal";

/** Collections that can be reordered by dragging. */
export type OrderedKind = "tasks" | "missions" | "goals" | "videos" | "books" | "bucket" | "todos" | "donts" | "podcasts" | "plans";

/** The simple lists that share one shape (ListItem). */
export type ListKind = "todos" | "donts" | "podcasts";

export interface Data {
  tasks: Task[];
  days: Record<string, DayLog>;
  missions: Mission[];
  goals: Goal[];
  videos: Video[];
  books: Book[];
  bucket: BucketItem[];
  todos: ListItem[];
  donts: ListItem[];
  podcasts: ListItem[];
  plans: Plan[];
  journal: Record<string, JournalEntry>;
  settings: Settings;
  /** When each record was deleted, so a delete on one device removes it everywhere. */
  deleted: Record<string, number>;
}

export const DATA_KEYS = ["tasks", "days", "missions", "goals", "videos", "books", "bucket", "todos", "donts", "podcasts", "plans", "journal", "settings", "deleted"] as const;

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
  bucket: [],
  todos: [],
  donts: [],
  podcasts: [],
  plans: [],
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
  completeVideo: (id: string) => void;
  reopenVideo: (id: string) => void;
  deleteVideo: (id: string) => void;

  addBook: (b: { title: string; author: string; totalPages?: number }) => string;
  updateBook: (id: string, patch: Partial<Book>) => void;
  completeBook: (id: string, action?: string) => void;
  reopenBook: (id: string) => void;
  deleteBook: (id: string) => void;

  addBucket: (title: string) => string;
  updateBucket: (id: string, patch: Partial<BucketItem>) => void;
  toggleBucket: (id: string) => void;
  deleteBucket: (id: string) => void;

  addItem: (kind: ListKind, fields: { title: string; url?: string; note?: string }) => string;
  updateItem: (kind: ListKind, id: string, patch: Partial<ListItem>) => void;
  toggleItem: (kind: ListKind, id: string) => void;
  deleteItem: (kind: ListKind, id: string) => void;

  addPlan: (title: string) => string;
  updatePlan: (id: string, patch: Partial<Plan>) => void;
  deletePlan: (id: string) => void;

  /** Save a new manual order: `ids` in their new sequence. */
  reorder: (kind: OrderedKind, ids: string[]) => void;
  /** Put a just-deleted record back (undo). */
  restore: (kind: OrderedKind, record: { id: string }) => void;

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
    bucket: p.bucket ?? [],
    todos: p.todos ?? [],
    donts: p.donts ?? [],
    podcasts: p.podcasts ?? [],
    plans: p.plans ?? [],
    journal: p.journal ?? {},
    settings,
    deleted: p.deleted ?? {},
  };
}

const nextOrder = (list: { order: number }[]) => list.reduce((m, x) => Math.max(m, x.order), 0) + 1;

export const useStore = create<Store>()(
  persist(
    (setState, getState) => ({
      ...initialData,

      addTask: ({ title, date, priority = "med", time }) =>
        setState((s) => {
          const now = Date.now();
          const order = nextOrder(s.tasks.filter((t) => t.date === date).map((t) => ({ order: t.order ?? 0 })));
          const tasks = [...s.tasks, { id: uid(), title, date, priority, time, done: false, createdAt: now, updatedAt: now, order }];
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
        setState((s) => ({
          missions: [...s.missions, { id, text, images: [], createdAt: now, updatedAt: now, order: nextOrder(s.missions.map((m) => ({ order: m.order ?? 0 }))) }],
        }));
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
        setState((s) => ({
          goals: [
            ...s.goals,
            { id, title, why, deadline, images: [], achieved: false, createdAt: now, updatedAt: now, order: nextOrder(s.goals.map((g) => ({ order: g.order ?? 0 }))) },
          ],
        }));
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
      completeBook: (id, action) =>
        setState((s) => {
          const book = s.books.find((b) => b.id === id);
          return {
            books: patchById(s.books, id, {
              done: true,
              reading: false,
              completedAt: Date.now(),
              currentPage: book?.totalPages ?? book?.currentPage,
              ...(action?.trim() && { action: action.trim() }),
            }),
          };
        }),
      reopenBook: (id) =>
        setState((s) => ({ books: patchById(s.books, id, { done: false, completedAt: undefined, order: nextOrder(s.books) }) })),
      deleteBook: (id) => {
        const book = getState().books.find((b) => b.id === id);
        if (book?.coverId) deleteImages([book.coverId]);
        setState((s) => ({ books: s.books.filter((b) => b.id !== id), deleted: tombstone(s.deleted, "books", id) }));
      },

      addBucket: (title) => {
        const id = uid();
        const now = Date.now();
        setState((s) => ({ bucket: [...s.bucket, { id, title, done: false, createdAt: now, updatedAt: now, order: nextOrder(s.bucket) }] }));
        return id;
      },
      updateBucket: (id, patch) => setState((s) => ({ bucket: patchById(s.bucket, id, patch) })),
      toggleBucket: (id) =>
        setState((s) => {
          const item = s.bucket.find((b) => b.id === id);
          return item ? { bucket: patchById(s.bucket, id, { done: !item.done, doneAt: item.done ? undefined : Date.now() }) } : s;
        }),
      deleteBucket: (id) => {
        const item = getState().bucket.find((b) => b.id === id);
        if (item?.imageId) deleteImages([item.imageId]);
        setState((s) => ({ bucket: s.bucket.filter((b) => b.id !== id), deleted: tombstone(s.deleted, "bucket", id) }));
      },

      addItem: (kind, { title, url, note }) => {
        const id = uid();
        const now = Date.now();
        setState((s) => ({
          [kind]: [...s[kind], { id, title, ...(url && { url }), ...(note && { note }), done: false, createdAt: now, updatedAt: now, order: nextOrder(s[kind]) }],
        }));
        return id;
      },
      updateItem: (kind, id, patch) => setState((s) => ({ [kind]: patchById(s[kind], id, patch) })),
      toggleItem: (kind, id) =>
        setState((s) => {
          const item = s[kind].find((x) => x.id === id);
          return item ? { [kind]: patchById(s[kind], id, { done: !item.done, doneAt: item.done ? undefined : Date.now() }) } : s;
        }),
      deleteItem: (kind, id) => setState((s) => ({ [kind]: s[kind].filter((x) => x.id !== id), deleted: tombstone(s.deleted, kind, id) })),

      addPlan: (title) => {
        const id = uid();
        const now = Date.now();
        setState((s) => ({ plans: [...s.plans, { id, title, steps: [], createdAt: now, updatedAt: now, order: nextOrder(s.plans) }] }));
        return id;
      },
      updatePlan: (id, patch) => setState((s) => ({ plans: patchById(s.plans, id, patch) })),
      deletePlan: (id) => setState((s) => ({ plans: s.plans.filter((p) => p.id !== id), deleted: tombstone(s.deleted, "plans", id) })),

      restore: (kind, record) =>
        setState((s) => {
          const deleted = { ...s.deleted };
          delete deleted[`${kind}:${record.id}`];
          const list = (s[kind] as { id: string }[]).filter((x) => x.id !== record.id);
          const next = [...list, { ...record, updatedAt: Date.now() }];
          const patch = { [kind]: next, deleted } as Partial<Data>;
          if (kind === "tasks") patch.days = withScore(s.days, next as Task[], (record as Task).date);
          return patch;
        }),

      reorder: (kind, ids) =>
        setState((s) => {
          const position = new Map(ids.map((id, i) => [id, i + 1]));
          const now = Date.now();
          const list = s[kind] as { id: string; order?: number }[];
          const next = list.map((x) => {
            const order = position.get(x.id);
            return order !== undefined && order !== x.order ? { ...x, order, updatedAt: now } : x;
          });
          return { [kind]: next } as Partial<Data>;
        }),

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
  const { tasks, days, missions, goals, videos, books, bucket, todos, donts, podcasts, plans, journal, settings, deleted } = s;
  return { tasks, days, missions, goals, videos, books, bucket, todos, donts, podcasts, plans, journal, settings, deleted };
}

/** Every image id referenced anywhere — used for backups and photo sync. */
export const allImageIds = (s: Data) => [
  ...s.missions.flatMap((m) => m.images),
  ...s.goals.flatMap((g) => g.images),
  ...s.books.flatMap((b) => (b.coverId ? [b.coverId] : [])),
  ...s.bucket.flatMap((b) => (b.imageId ? [b.imageId] : [])),
];

/** Manual order, falling back to creation time for records saved before ordering existed. */
export const byOrder = (a: { order?: number; createdAt: number }, b: { order?: number; createdAt: number }) =>
  (a.order ?? a.createdAt) - (b.order ?? b.createdAt) || a.createdAt - b.createdAt;

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
