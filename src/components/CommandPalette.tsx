"use client";

import {
  BookOpen,
  CalendarPlus,
  CornerDownLeft,
  Download,
  Lightbulb,
  Map as MapIcon,
  Moon,
  Search,
  SquarePlay,
  Target,
  Timer,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { exportBackup } from "@/lib/backup";
import { addBook, addVideoFromUrl, splitBook } from "@/lib/capture";
import { formatShort, formatTime12 } from "@/lib/date";
import { NAV } from "@/lib/nav";
import { useClock, useStore, useUI } from "@/lib/store";
import { cn, parseQuickTask } from "@/lib/utils";

interface Item {
  id: string;
  icon: ReactNode;
  label: ReactNode;
  hint?: string;
  run: () => void | Promise<void>;
}

const PREFIXES = [
  { key: "v", label: "Add YouTube video", example: "v https://youtu.be/…" },
  { key: "b", label: "Add book", example: "b Meditations by Marcus Aurelius" },
  { key: "l", label: "Save a learning", example: "l Consistency beats intensity #habits" },
  { key: "g", label: "Create goal", example: "g Run a marathon" },
  { key: "p", label: "Create plan", example: "p Trip to Greece" },
];

export function CommandPalette() {
  const open = useUI((s) => s.paletteOpen);
  const setOpen = useUI((s) => s.setPalette);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        if (e.target instanceof HTMLElement && e.target.isContentEditable) return;
        e.preventDefault();
        setOpen(!useUI.getState().paletteOpen);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  return open ? <PaletteDialog /> : null;
}

function PaletteDialog() {
  const setOpen = useUI((s) => s.setPalette);
  const router = useRouter();
  const today = useClock((s) => s.today);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [flash, setFlash] = useState("");
  const store = useStore();

  const done = (message: string, keepOpen = true) => {
    setFlash(message);
    setQuery("");
    setTimeout(() => setFlash(""), 1600);
    if (!keepOpen) setOpen(false);
  };

  const items = useMemo<Item[]>(() => {
    const q = query.trim();
    const list: Item[] = [];
    const prefix = q.match(/^([vblgp])\s+(.+)$/i);

    if (prefix) {
      const [, key, rest] = prefix;
      const k = key.toLowerCase();
      if (k === "v")
        list.push({
          id: "v",
          icon: <SquarePlay className="size-4" />,
          label: <>Add video: <span className="text-muted">{rest}</span></>,
          run: () => done(addVideoFromUrl(rest) ? "Video added to your queue" : "That isn't a YouTube link"),
        });
      if (k === "b") {
        const { title, author } = splitBook(rest);
        list.push({
          id: "b",
          icon: <BookOpen className="size-4" />,
          label: <>Add book: {title} {author && <span className="text-muted">by {author}</span>}</>,
          run: () => {
            addBook(title, author);
            done("Book added to your list");
          },
        });
      }
      if (k === "l")
        list.push({
          id: "l",
          icon: <Lightbulb className="size-4" />,
          label: <>Save learning: <span className="text-muted">{rest}</span></>,
          run: () => {
            store.addLearning({ text: rest });
            done("Learning saved");
          },
        });
      if (k === "g")
        list.push({
          id: "g",
          icon: <Target className="size-4" />,
          label: <>Create goal: {rest}</>,
          run: () => {
            store.addGoal({ title: rest });
            router.push("/mission");
            done("Goal created", false);
          },
        });
      if (k === "p")
        list.push({
          id: "p",
          icon: <MapIcon className="size-4" />,
          label: <>Create plan: {rest}</>,
          run: () => {
            store.addPlan({ title: rest });
            router.push("/plans");
            done("Plan created", false);
          },
        });
      return list;
    }

    if (q) {
      const parsed = parseQuickTask(q, today);
      if (parsed.title) {
        const meta = [
          parsed.date !== today && formatShort(parsed.date),
          parsed.time && formatTime12(parsed.time),
          parsed.priority !== "med" && `${parsed.priority} priority`,
        ].filter(Boolean);
        list.push({
          id: "task",
          icon: <CalendarPlus className="size-4" />,
          label: (
            <>
              Add task: {parsed.title} {meta.length > 0 && <span className="text-muted">· {meta.join(" · ")}</span>}
            </>
          ),
          run: () => {
            store.addTask(parsed);
            done(parsed.date === today ? "Task added to today" : `Task planned for ${formatShort(parsed.date)}`);
          },
        });
      }
    }

    const lower = q.toLowerCase();
    const commands: Item[] = [
      ...NAV.map((n) => ({
        id: `nav-${n.href}`,
        icon: <n.icon className="size-4" />,
        label: `Go to ${n.label}`,
        run: () => {
          router.push(n.href);
          setOpen(false);
        },
      })),
      {
        id: "focus",
        icon: <Timer className="size-4" />,
        label: `Start ${store.settings.focusMinutes}-minute focus`,
        run: () => {
          store.startFocus({ label: "Deep work" });
          setOpen(false);
        },
      },
      {
        id: "theme",
        icon: <Moon className="size-4" />,
        label: "Toggle dark mode",
        run: () => store.updateSettings({ theme: document.documentElement.classList.contains("dark") ? "light" : "dark" }),
      },
      {
        id: "export",
        icon: <Download className="size-4" />,
        label: "Export backup",
        run: async () => {
          await exportBackup();
          done("Backup downloaded");
        },
      },
    ];
    list.push(...commands.filter((c) => !lower || String(c.label).toLowerCase().includes(lower)));

    if (lower.length >= 2) {
      const hits: Item[] = [
        ...store.learnings
          .filter((l) => l.text.toLowerCase().includes(lower))
          .map((l) => ({ id: `l-${l.id}`, icon: <Lightbulb className="size-4" />, label: l.text, hint: "Learning", path: "/learnings" })),
        ...store.goals
          .filter((g) => g.title.toLowerCase().includes(lower))
          .map((g) => ({ id: `g-${g.id}`, icon: <Target className="size-4" />, label: g.title, hint: "Goal", path: "/mission" })),
        ...store.plans
          .filter((p) => p.title.toLowerCase().includes(lower))
          .map((p) => ({ id: `p-${p.id}`, icon: <MapIcon className="size-4" />, label: p.title, hint: "Plan", path: "/plans" })),
        ...store.videos
          .filter((v) => v.title.toLowerCase().includes(lower))
          .map((v) => ({ id: `v-${v.id}`, icon: <SquarePlay className="size-4" />, label: v.title, hint: "Video", path: "/videos" })),
        ...store.books
          .filter((b) => b.title.toLowerCase().includes(lower))
          .map((b) => ({ id: `b-${b.id}`, icon: <BookOpen className="size-4" />, label: b.title, hint: "Book", path: "/books" })),
      ]
        .slice(0, 8)
        .map(({ path, ...item }) => ({
          ...item,
          run: () => {
            router.push(path);
            setOpen(false);
          },
        }));
      list.push(...hits);
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, today, store]);

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-3 pt-[10dvh]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
      <div className="animate-rise relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="size-4 shrink-0 text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(items.length - 1, a + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                items[active]?.run();
              }
            }}
            placeholder="Add a task, search, or type a command…"
            className="h-14 flex-1 bg-transparent outline-none placeholder:text-muted/70"
          />
        </div>

        {flash && <div className="bg-accent-soft px-4 py-2 text-xs font-medium text-accent">✓ {flash}</div>}

        <div className="max-h-[50dvh] overflow-y-auto p-2">
          {items.map((item, i) => (
            <button
              key={item.id}
              onMouseEnter={() => setActive(i)}
              onClick={() => item.run()}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm",
                i === active ? "bg-surface-2" : "",
              )}
            >
              <span className="text-muted">{item.icon}</span>
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.hint && <span className="text-[11px] text-muted">{item.hint}</span>}
              {i === active && <CornerDownLeft className="size-3.5 text-muted" />}
            </button>
          ))}
        </div>

        {!query && (
          <div className="border-t border-line px-4 py-3 text-[11px] leading-relaxed text-muted">
            <p className="mb-1 font-medium text-fg/80">Shortcuts</p>
            <p>
              Task: <code>Gym !high @6pm tomorrow</code> · <code>Call mom on fri</code> · <code>Read +3d</code>
            </p>
            {PREFIXES.map((p) => (
              <p key={p.key}>
                {p.label}: <code>{p.example}</code>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
