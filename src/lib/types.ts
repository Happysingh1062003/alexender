export type Priority = "high" | "med" | "low";

export interface Task {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  done: boolean;
  priority: Priority;
  time?: string; // HH:MM
  createdAt: number;
  /** Manual position (drag to reorder). */
  order?: number;
  /** Last edit time — newest edit wins when devices sync. */
  updatedAt?: number;
  completedAt?: number;
  /** Set when the task is explicitly started; makes time-spent exact. */
  startedAt?: number;
  /** Minutes spent, filled in automatically on completion (editable). */
  spentMin?: number;
  /** Optional free-form note: details, links, what "done" means. */
  note?: string;
}

export interface DayLog {
  date: string;
  total: number;
  done: number;
  pct: number;
  /** First time Alexander was opened that day — the fallback start for time tracking. */
  firstSeen?: number;
}

export interface Mission {
  id: string;
  text: string;
  images: string[];
  createdAt: number;
  /** Manual position (drag to reorder). */
  order?: number;
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
  /** Manual position (drag to reorder). */
  order?: number;
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
  /** A cover photo you uploaded (wins over the looked-up one). */
  coverId?: string;
  /** What you will do with what the book taught you. */
  action?: string;
  totalPages?: number;
  currentPage?: number;
  /** Being read now. Several books can be read at once. */
  reading?: boolean;
  done: boolean;
  completedAt?: number;
  createdAt: number;
  /** Last edit time — newest edit wins when devices sync. */
  updatedAt?: number;
  order: number;
}

/** One entry of a simple list: a to-do, a "don't do" rule, a podcast. */
export interface ListItem {
  id: string;
  title: string;
  note?: string;
  /** A link (podcast episodes). */
  url?: string;
  done: boolean;
  doneAt?: number;
  createdAt: number;
  updatedAt?: number;
  order: number;
}

export interface PlanStep {
  id: string;
  text: string;
  done: boolean;
}

/** A plan for anything: a title, steps to tick off, and free notes. */
export interface Plan {
  id: string;
  title: string;
  note?: string;
  steps: PlanStep[];
  createdAt: number;
  updatedAt?: number;
  order: number;
}

/** A story of a great person that you added yourself, with their picture. */
export interface MyStory {
  id: string;
  person: string;
  title: string;
  /** The story; blank lines separate paragraphs. */
  story: string;
  imageId?: string;
  when?: string;
  lesson?: string;
  source?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface BucketItem {
  id: string;
  title: string;
  note?: string;
  imageId?: string;
  done: boolean;
  doneAt?: number;
  createdAt: number;
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
