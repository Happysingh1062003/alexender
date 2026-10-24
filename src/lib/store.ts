"use client";

import { del, get, set } from "idb-keyval";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { fromKey, todayKey } from "./date";
import { deleteImages } from "./images";
import type {
  Book,
  DayLog,
  FocusState,
  Goal,
  Learning,
  LearningSource,
  Plan,
  Priority,
  Routine,
  Settings,
  Task,
  Video,
} from "./types";
import { extractTags, pct, uid } from "./utils";

const idbStorage: StateStorage = {
  getItem: async (name) => (await get<string>(name)) ?? null,
  setItem: async (name, value) => {
    await set(name, value);
  },
  removeItem: async (name) => {
    await del(name);
  },
};

export interface Data {
  tasks: Task[];
  routines: Routine[];
  days: Record<string, DayLog>;
  goals: Goal[];
  videos: Video[];
  books: Book[];
  learnings: Learning[];
  plans: Plan[];
  settings: Settings;
  focus: FocusState | null;
}

const defaultSettings: Settings = {
  name: "",
  winThreshold: 70,
  theme: "system",
  mission: "",
  missionImages: [],
  focusMinutes: 25,
  breakMinutes: 5,
};

const initialData: Data = {
  tasks: [],
  routines: [],
  days: {},
  goals: [],
  videos: [],
  books: [],
  learnings: [],
  plans: [],
  settings: defaultSettings,
  focus: null,
};

interface Actions {
  addTask: (t: { title: string; date: string; priority?: Priority; time?: string; routineId?: string }) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  carryOver: (from: string, to: string) => number;
  syncRoutines: (date: string) => void;

  addRoutine: (r: Omit<Routine, "id" | "createdAt" | "active">) => void;
  updateRoutine: (id: string, patch: Partial<Routine>) => void;
  deleteRoutine: (id: string) => void;

  updateDay: (date: string, patch: Partial<DayLog>) => void;

  addGoal: (g: { title: string; why?: string; deadline?: string }) => string;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;

  addVideo: (v: { url: string; youtubeId: string; title: string; channel?: string }) => string;
  updateVideo: (id: string, patch: Partial<Video>) => void;
  moveVideo: (id: string, dir: -1 | 1) => void;
  completeVideo: (id: string, learning?: string) => void;
  reopenVideo: (id: string) => void;
  deleteVideo: (id: string) => void;

  addBook: (b: { title: string; author: string; totalPages?: number; coverUrl?: string }) => string;
  updateBook: (id: string, patch: Partial<Book>) => void;
  moveBook: (id: string, dir: -1 | 1) => void;
  completeBook: (id: string, learning?: string) => void;
  reopenBook: (id: string) => void;
  deleteBook: (id: string) => void;

  addLearning: (l: { text: string; source?: LearningSource; refTitle?: string; date?: string }) => string;
  updateLearning: (id: string, patch: Partial<Learning>) => void;
  deleteLearning: (id: string) => void;

  addPlan: (p: { title: string; description?: string; status?: Plan["status"] }) => string;
  updatePlan: (id: string, patch: Partial<Plan>) => void;
  deletePlan: (id: string) => void;

  updateSettings: (patch: Partial<Settings>) => void;

  startFocus: (opts: { label: string; taskId?: string; mode?: FocusState["mode"]; minutes?: number }) => void;
  pauseFocus: () => void;
  resumeFocus: () => void;
  stopFocus: () => void;
  finishFocus: () => void;

  replaceAll: (data: Partial<Data>) => void;
}

export type Store = Data & Actions;

/** Recompute and store the completion score for a day — this is the persisted daily record. */
function withScore(days: Record<string, DayLog>, tasks: Task[], date: string): Record<string, DayLog> {
  const dayTasks = tasks.filter((t) => t.date === date);
  const done = dayTasks.filter((t) => t.done).length;
  const prev = days[date] ?? { date, total: 0, done: 0, pct: 0 };
  return { ...days, [date]: { ...prev, total: dayTasks.length, done, pct: pct(done, dayTasks.length) } };
}

const reorder = <T extends { id: string; order: number; done: boolean }>(list: T[], id: string, dir: -1 | 1) => {
  const queue = list.filter((x) => !x.done).sort((a, b) => a.order - b.order);
  const i = queue.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= queue.length) return list;
  const a = queue[i];
  const b = queue[j];
  return list.map((x) => (x.id === a.id ? { ...x, order: b.order } : x.id === b.id ? { ...x, order: a.order } : x));
};

const nextOrder = (list: { order: number }[]) => list.reduce((m, x) => Math.max(m, x.order), 0) + 1;

export const useStore = create<Store>()(
  persist(
    (setState, getState) => ({
      ...initialData,

      addTask: ({ title, date, priority = "med", time, routineId }) =>
        setState((s) => {
          const tasks = [...s.tasks, { id: uid(), title, date, priority, time, routineId, done: false, createdAt: Date.now() }];
          return { tasks, days: withScore(s.days, tasks, date) };
        }),

      updateTask: (id, patch) =>
        setState((s) => {
          const old = s.tasks.find((t) => t.id === id);
          if (!old) return s;
          const tasks = s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));
          let days = withScore(s.days, tasks, old.date);
          if (patch.date && patch.date !== old.date) days = withScore(days, tasks, patch.date);
          return { tasks, days };
        }),

      toggleTask: (id) =>
        setState((s) => {
          const task = s.tasks.find((t) => t.id === id);
          if (!task) return s;
          const tasks = s.tasks.map((t) =>
            t.id === id ? { ...t, done: !t.done, completedAt: !t.done ? Date.now() : undefined } : t,
          );
          return { tasks, days: withScore(s.days, tasks, task.date) };
        }),

      deleteTask: (id) =>
        setState((s) => {
          const task = s.tasks.find((t) => t.id === id);
          if (!task) return s;
          const tasks = s.tasks.filter((t) => t.id !== id);
          return { tasks, days: withScore(s.days, tasks, task.date) };
        }),

      carryOver: (from, to) => {
        const pending = getState().tasks.filter((t) => t.date === from && !t.done && !t.routineId);
        if (!pending.length) return 0;
        setState((s) => {
          const ids = new Set(pending.map((t) => t.id));
          const tasks = s.tasks.map((t) => (ids.has(t.id) ? { ...t, date: to } : t));
          return { tasks, days: withScore(withScore(s.days, tasks, from), tasks, to) };
        });
        return pending.length;
      },

      syncRoutines: (date) =>
        setState((s) => {
          const weekday = fromKey(date).getDay();
          const missing = s.routines.filter(
            (r) => r.active && r.days.includes(weekday) && !s.tasks.some((t) => t.date === date && t.routineId === r.id),
          );
          if (!missing.length) return s;
          const tasks = [
            ...s.tasks,
            ...missing.map((r) => ({
              id: uid(),
              title: r.title,
              date,
              priority: r.priority,
              time: r.time,
              routineId: r.id,
              done: false,
              createdAt: Date.now(),
            })),
          ];
          return { tasks, days: withScore(s.days, tasks, date) };
        }),

      addRoutine: (r) => {
        setState((s) => ({ routines: [...s.routines, { ...r, id: uid(), createdAt: Date.now(), active: true }] }));
        getState().syncRoutines(todayKey());
      },
      updateRoutine: (id, patch) =>
        setState((s) => ({ routines: s.routines.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      deleteRoutine: (id) => setState((s) => ({ routines: s.routines.filter((r) => r.id !== id) })),

      updateDay: (date, patch) =>
        setState((s) => ({
          days: { ...s.days, [date]: { ...(s.days[date] ?? { date, total: 0, done: 0, pct: 0 }), ...patch } },
        })),

      addGoal: ({ title, why = "", deadline }) => {
        const id = uid();
        setState((s) => ({
          goals: [...s.goals, { id, title, why, deadline, images: [], steps: [], achieved: false, createdAt: Date.now() }],
        }));
        return id;
      },
      updateGoal: (id, patch) => setState((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),
      deleteGoal: (id) => {
        const goal = getState().goals.find((g) => g.id === id);
        if (goal) deleteImages(goal.images);
        setState((s) => ({ goals: s.goals.filter((g) => g.id !== id) }));
      },

      addVideo: (v) => {
        const id = uid();
        setState((s) => ({ videos: [...s.videos, { ...v, id, done: false, createdAt: Date.now(), order: nextOrder(s.videos) }] }));
        return id;
      },
      updateVideo: (id, patch) => setState((s) => ({ videos: s.videos.map((v) => (v.id === id ? { ...v, ...patch } : v)) })),
      moveVideo: (id, dir) => setState((s) => ({ videos: reorder(s.videos, id, dir) })),
      completeVideo: (id, learning) => {
        const video = getState().videos.find((v) => v.id === id);
        if (!video) return;
        const learningId = learning?.trim()
          ? getState().addLearning({ text: learning, source: "video", refTitle: video.title })
          : undefined;
        setState((s) => ({
          videos: s.videos.map((v) => (v.id === id ? { ...v, done: true, completedAt: Date.now(), learningId } : v)),
        }));
      },
      reopenVideo: (id) =>
        setState((s) => ({
          videos: s.videos.map((v) => (v.id === id ? { ...v, done: false, completedAt: undefined, order: nextOrder(s.videos) } : v)),
        })),
      deleteVideo: (id) => setState((s) => ({ videos: s.videos.filter((v) => v.id !== id) })),

      addBook: (b) => {
        const id = uid();
        setState((s) => ({ books: [...s.books, { ...b, id, done: false, createdAt: Date.now(), order: nextOrder(s.books) }] }));
        return id;
      },
      updateBook: (id, patch) => setState((s) => ({ books: s.books.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),
      moveBook: (id, dir) => setState((s) => ({ books: reorder(s.books, id, dir) })),
      completeBook: (id, learning) => {
        const book = getState().books.find((b) => b.id === id);
        if (!book) return;
        const learningId = learning?.trim()
          ? getState().addLearning({ text: learning, source: "book", refTitle: book.title })
          : undefined;
        setState((s) => ({
          books: s.books.map((b) =>
            b.id === id ? { ...b, done: true, completedAt: Date.now(), learningId, currentPage: b.totalPages ?? b.currentPage } : b,
          ),
        }));
      },
      reopenBook: (id) =>
        setState((s) => ({
          books: s.books.map((b) => (b.id === id ? { ...b, done: false, completedAt: undefined, order: nextOrder(s.books) } : b)),
        })),
      deleteBook: (id) => setState((s) => ({ books: s.books.filter((b) => b.id !== id) })),

      addLearning: ({ text, source = "life", refTitle, date }) => {
        const id = uid();
        setState((s) => ({
          learnings: [
            {
              id,
              text: text.trim(),
              source,
              refTitle,
              tags: extractTags(text),
              starred: false,
              date: date ?? todayKey(),
              createdAt: Date.now(),
            },
            ...s.learnings,
          ],
        }));
        return id;
      },
      updateLearning: (id, patch) =>
        setState((s) => ({
          learnings: s.learnings.map((l) =>
            l.id === id ? { ...l, ...patch, ...(patch.text !== undefined ? { tags: extractTags(patch.text) } : {}) } : l,
          ),
        })),
      deleteLearning: (id) => setState((s) => ({ learnings: s.learnings.filter((l) => l.id !== id) })),

      addPlan: ({ title, description = "", status = "idea" }) => {
        const id = uid();
        setState((s) => ({
          plans: [...s.plans, { id, title, description, status, images: [], steps: [], notes: "", createdAt: Date.now() }],
        }));
        return id;
      },
      updatePlan: (id, patch) => setState((s) => ({ plans: s.plans.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      deletePlan: (id) => {
        const plan = getState().plans.find((p) => p.id === id);
        if (plan) deleteImages([...plan.images, ...(plan.coverId ? [plan.coverId] : [])]);
        setState((s) => ({ plans: s.plans.filter((p) => p.id !== id) }));
      },

      updateSettings: (patch) => setState((s) => ({ settings: { ...s.settings, ...patch } })),

      startFocus: ({ label, taskId, mode = "focus", minutes }) => {
        const { settings } = getState();
        const durationMin = minutes ?? (mode === "focus" ? settings.focusMinutes : settings.breakMinutes);
        setState({ focus: { label, taskId, mode, durationMin, endsAt: Date.now() + durationMin * 60_000 } });
      },
      pauseFocus: () =>
        setState((s) => (s.focus ? { focus: { ...s.focus, pausedRemainingMs: Math.max(0, s.focus.endsAt - Date.now()) } } : s)),
      resumeFocus: () =>
        setState((s) =>
          s.focus?.pausedRemainingMs !== undefined
            ? { focus: { ...s.focus, endsAt: Date.now() + s.focus.pausedRemainingMs, pausedRemainingMs: undefined } }
            : s,
        ),
      stopFocus: () => setState({ focus: null }),
      finishFocus: () => {
        const { focus } = getState();
        if (!focus) return;
        if (focus.mode === "focus") {
          const date = todayKey();
          setState((s) => ({
            tasks: focus.taskId
              ? s.tasks.map((t) => (t.id === focus.taskId ? { ...t, focusMin: (t.focusMin ?? 0) + focus.durationMin } : t))
              : s.tasks,
            days: {
              ...s.days,
              [date]: {
                ...(s.days[date] ?? { date, total: 0, done: 0, pct: 0 }),
                focusMin: (s.days[date]?.focusMin ?? 0) + focus.durationMin,
              },
            },
          }));
        }
        setState({ focus: null });
      },

      replaceAll: (data) => setState({ ...initialData, ...data, settings: { ...defaultSettings, ...data.settings } }),
    }),
    {
      name: "alexender-data",
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      skipHydration: true,
      partialize: (s) => {
        const { tasks, routines, days, goals, videos, books, learnings, plans, settings, focus } = s;
        return { tasks, routines, days, goals, videos, books, learnings, plans, settings, focus };
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Data>;
        return { ...current, ...p, settings: { ...defaultSettings, ...p.settings } };
      },
    },
  ),
);

/** Every image id referenced anywhere — used for backups. */
export const allImageIds = (s: Data) => [
  ...s.settings.missionImages,
  ...s.goals.flatMap((g) => g.images),
  ...s.plans.flatMap((p) => [...p.images, ...(p.coverId ? [p.coverId] : [])]),
];

/** Ticking clock shared by the whole app (not persisted). */
export const useClock = create<{ now: number; today: string; tick: () => void }>((setState) => ({
  now: 0,
  today: "",
  tick: () => setState({ now: Date.now(), today: todayKey() }),
}));

/** UI-only state. */
export const useUI = create<{ paletteOpen: boolean; setPalette: (open: boolean) => void }>((setState) => ({
  paletteOpen: false,
  setPalette: (paletteOpen) => setState({ paletteOpen }),
}));
