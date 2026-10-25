export type Priority = "high" | "med" | "low";

export interface Task {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  done: boolean;
  priority: Priority;
  time?: string; // HH:MM
  createdAt: number;
  /** Last edit time — newest edit wins when devices sync. */
  updatedAt?: number;
  completedAt?: number;
  /** Set when the task is explicitly started; makes time-spent exact. */
  startedAt?: number;
  /** Minutes spent, filled in automatically on completion (editable). */
  spentMin?: number;
}

export interface DayLog {
  date: string;
  total: number;
  done: number;
  pct: number;
  /** First time Alexender was opened that day — the fallback start for time tracking. */
  firstSeen?: number;
}

export interface Mission {
  id: string;
  text: string;
  images: string[];
  createdAt: number;
  /** Last edit time — newest edit wins when devices sync. */
  updatedAt?: number;
}

export interface Goal {
  id: string;
  title: string;
  why: string;
  deadline?: string;
  images: string[];
  achieved: boolean;
  achievedAt?: number;
  createdAt: number;
  /** Last edit time — newest edit wins when devices sync. */
  updatedAt?: number;
}

export interface Video {
  id: string;
  url: string;
  youtubeId: string;
  title: string;
  channel?: string;
  durationSec?: number;
  views?: number;
  published?: string;
  done: boolean;
  completedAt?: number;
  createdAt: number;
  /** Last edit time — newest edit wins when devices sync. */
  updatedAt?: number;
  order: number;
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
  /** Last edit time — newest edit wins when devices sync. */
  updatedAt?: number;
  order: number;
}

export interface JournalEntry {
  date: string;
  text: string;
  updatedAt: number;
}

export interface Settings {
  name: string;
  winThreshold: number;
  birthDate: string; // YYYY-MM-DD
  country: string;
  /** Overrides the country average when set. */
  lifeExpectancy?: number;
  /** Device passcode, stored only as a salted hash. */
  lock?: { salt: string; hash: string; length: number };
  /** Legacy single mission, migrated into `missions`. */
  mission?: string;
  updatedAt?: number;
}
