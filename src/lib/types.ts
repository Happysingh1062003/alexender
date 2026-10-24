export type Priority = "high" | "med" | "low";

export interface Task {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  done: boolean;
  priority: Priority;
  time?: string; // HH:MM
  createdAt: number;
  completedAt?: number;
  focusMin?: number;
  routineId?: string;
}

export interface Routine {
  id: string;
  title: string;
  priority: Priority;
  time?: string;
  days: number[]; // 0 = Sunday
  active: boolean;
  createdAt: number;
}

export interface DayLog {
  date: string;
  total: number;
  done: number;
  pct: number;
  focusMin?: number;
  mood?: number; // 1-5
  wins?: string;
  lesson?: string;
}

export interface Step {
  id: string;
  title: string;
  done: boolean;
}

export interface Goal {
  id: string;
  title: string;
  why: string;
  deadline?: string;
  images: string[];
  steps: Step[];
  achieved: boolean;
  achievedAt?: number;
  createdAt: number;
}

export interface Video {
  id: string;
  url: string;
  youtubeId: string;
  title: string;
  channel?: string;
  done: boolean;
  completedAt?: number;
  createdAt: number;
  order: number;
  learningId?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  coverChecked?: boolean;
  totalPages?: number;
  currentPage?: number;
  done: boolean;
  completedAt?: number;
  createdAt: number;
  order: number;
  learningId?: string;
}

export type LearningSource = "life" | "video" | "book" | "plan" | "day";

export interface Learning {
  id: string;
  text: string;
  source: LearningSource;
  refTitle?: string;
  tags: string[];
  starred: boolean;
  date: string;
  createdAt: number;
}

export type PlanStatus = "idea" | "active" | "done";

export interface Plan {
  id: string;
  title: string;
  description: string;
  coverId?: string;
  images: string[];
  steps: Step[];
  notes: string;
  status: PlanStatus;
  targetDate?: string;
  createdAt: number;
}

export type Theme = "system" | "light" | "dark";

export interface Settings {
  name: string;
  winThreshold: number;
  theme: Theme;
  mission: string;
  missionImages: string[];
  focusMinutes: number;
  breakMinutes: number;
}

export interface FocusState {
  taskId?: string;
  label: string;
  mode: "focus" | "break";
  durationMin: number;
  endsAt: number;
  pausedRemainingMs?: number;
}
