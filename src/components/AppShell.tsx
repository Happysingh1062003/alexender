"use client";

import { Command, Flame, Menu, Moon, Plus, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { formatLong } from "@/lib/date";
import { currentStreak } from "@/lib/stats";
import { useClock, useStore, useUI } from "@/lib/store";
import { NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { CommandPalette } from "./CommandPalette";
import { FocusTimer } from "./FocusTimer";
import { Logo } from "./Logo";
import { Onboarding } from "./Onboarding";
import { Modal } from "./ui";


const MOBILE_PRIMARY = ["/", "/calendar", "/mission", "/videos"];

function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = useStore.persist.onFinishHydration(() => setHydrated(true));
    useStore.persist.rehydrate();
    return unsub;
  }, []);
  return hydrated;
}

function useTheme() {
  const theme = useStore((s) => s.settings.theme);
  useEffect(() => {
    try {
      localStorage.setItem("alex-theme", theme);
    } catch {}
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      document.documentElement.classList.toggle("dark", theme === "dark" || (theme === "system" && mq.matches));
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);
}

export function AppShell({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const today = useClock((s) => s.today);
  const name = useStore((s) => s.settings.name);
  const syncRoutines = useStore((s) => s.syncRoutines);
  useTheme();

  useEffect(() => {
    const { tick } = useClock.getState();
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (hydrated && today) syncRoutines(today);
  }, [hydrated, today, syncRoutines]);

  if (!hydrated || !today) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="flex animate-pulse flex-col items-center gap-3">
          <Logo className="size-10" />
          <span className="font-serif text-2xl">Alexender</span>
        </div>
      </div>
    );
  }

  if (!name) return <Onboarding />;

  return (
    <div className="min-h-dvh lg:pl-60">
      <Sidebar />
      <TopBar />
      <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-32 sm:px-6 lg:px-10 lg:pt-8 lg:pb-16">{children}</main>
      <BottomNav />
      <FocusTimer />
      <CommandPalette />
    </div>
  );
}

function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface/60 px-3 py-5 backdrop-blur lg:flex">
      <Link href="/" className="mb-8 flex items-center gap-2.5 px-3">
        <Logo className="size-7" />
        <span className="font-serif text-2xl tracking-tight">Alexender</span>
      </Link>
      <nav className="flex flex-1 flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                active ? "bg-surface-2 font-medium text-fg" : "text-muted hover:bg-surface-2/60 hover:text-fg",
              )}
            >
              <Icon className={cn("size-[18px]", active && "text-accent")} strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={() => useUI.getState().setPalette(true)}
        className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-sm text-muted transition hover:text-fg"
      >
        <span className="flex items-center gap-2">
          <Command className="size-4" /> Quick command
        </span>
        <kbd className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[10px]">Ctrl K</kbd>
      </button>
    </aside>
  );
}

function TopBar() {
  const now = useClock((s) => s.now);
  const today = useClock((s) => s.today);
  const log = useStore((s) => s.days[today]);
  const days = useStore((s) => s.days);
  const threshold = useStore((s) => s.settings.winThreshold);
  const theme = useStore((s) => s.settings.theme);
  const updateSettings = useStore((s) => s.updateSettings);
  const streak = currentStreak(days, today, threshold);
  const time = new Date(now).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-2 lg:hidden">
          <Logo className="size-6" />
        </Link>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-medium">{formatLong(today)}</p>
          <p className="font-mono text-[11px] text-muted">{time}</p>
        </div>

        <div
          title="Today's completion"
          className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium"
        >
          <span
            className="size-2 rounded-full"
            style={{ background: (log?.pct ?? 0) >= threshold ? "var(--success)" : "var(--accent)" }}
          />
          {log?.pct ?? 0}%
        </div>
        <div
          title="Win streak"
          className="flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium"
        >
          <Flame className={cn("size-3.5", streak > 0 ? "text-accent" : "text-muted")} />
          {streak}
        </div>
        <button
          aria-label="Toggle theme"
          onClick={() => updateSettings({ theme: isDark ? "light" : "dark" })}
          className="hidden size-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg sm:flex"
        >
          {isDark || theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
      </div>
    </header>
  );
}

function BottomNav() {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const primary = NAV.filter((n) => MOBILE_PRIMARY.includes(n.href));
  const rest = NAV.filter((n) => !MOBILE_PRIMARY.includes(n.href));
  const moreActive = rest.some((n) => pathname.startsWith(n.href));

  return (
    <>
      <button
        aria-label="Quick add"
        onClick={() => useUI.getState().setPalette(true)}
        className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 flex size-13 items-center justify-center rounded-full bg-fg text-bg shadow-xl transition active:scale-90 lg:hidden"
      >
        <Plus className="size-6" />
      </button>
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/90 backdrop-blur-lg lg:hidden">
        <div className="mx-auto grid h-16 max-w-md grid-cols-5">
          {primary.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn("flex flex-col items-center justify-center gap-1 text-[10px]", active ? "text-fg" : "text-muted")}
              >
                <Icon className={cn("size-5", active && "text-accent")} strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </Link>
            );
          })}
          <button
            onClick={() => setMore(true)}
            className={cn("flex flex-col items-center justify-center gap-1 text-[10px]", moreActive ? "text-fg" : "text-muted")}
          >
            <Menu className={cn("size-5", moreActive && "text-accent")} />
            More
          </button>
        </div>
      </nav>
      <Modal open={more} onClose={() => setMore(false)} title="More">
        <div className="grid grid-cols-2 gap-2 pb-2">
          {rest.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMore(false)}
              className="flex items-center gap-3 rounded-2xl border border-line p-4 text-sm font-medium transition hover:bg-surface-2"
            >
              <Icon className="size-5 text-accent" />
              {label}
            </Link>
          ))}
        </div>
      </Modal>
    </>
  );
}
