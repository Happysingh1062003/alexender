"use client";

import { CloudOff, LockKeyhole, LucideProvider } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { fromKey } from "@/lib/date";
import { AUTO_LOCK_MS, readUnlocked, writeUnlocked } from "@/lib/lock";
import { NAV } from "@/lib/nav";
import { useClock, useStore, useUI } from "@/lib/store";
import { startSync, useSync } from "@/lib/sync";
import { cn } from "@/lib/utils";
import { MoreIcon } from "./icons";
import { LockScreen } from "./Lock";
import { Logo } from "./Logo";
import { Onboarding } from "./Onboarding";
import { Modal } from "./ui";

const MOBILE_PRIMARY = ["/", "/calendar", "/mission", "/journal"];

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

/**
 * Loads saved data before anything renders. If it can't be read, the app stops at an error
 * screen rather than starting empty — an empty start would overwrite the saved data.
 */
function useHydrated() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    let finished = false;
    const unsub = useStore.persist.onFinishHydration(() => {
      finished = true;
      // Restore this tab's unlock state before the first real render, so the app never flashes.
      useUI.getState().setUnlocked(readUnlocked());
      setStatus("ready");
    });
    Promise.resolve(useStore.persist.rehydrate()).then(() => !finished && setStatus("error"));
    const timeout = setTimeout(() => !finished && setStatus("error"), 10_000);
    // Ask the browser to never evict Alexender's data under storage pressure.
    navigator.storage?.persist?.().catch(() => {});
    return () => {
      unsub();
      clearTimeout(timeout);
    };
  }, []);
  return status;
}

/** Re-locks after the app sits in the background for a while. */
function useAutoLock() {
  useEffect(() => {
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > AUTO_LOCK_MS) lockNow();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
}

export function lockNow() {
  writeUnlocked(false);
  useUI.getState().setUnlocked(false);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const status = useHydrated();
  const hydrated = status === "ready";
  useAutoLock();
  const today = useClock((s) => s.today);
  const name = useStore((s) => s.settings.name);
  const hasLock = useStore((s) => !!s.settings.lock);
  const unlocked = useUI((s) => s.unlocked);
  const syncReady = useSync((s) => s.ready);
  const markDayStart = useStore((s) => s.markDayStart);

  useEffect(() => {
    const { tick } = useClock.getState();
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (hydrated && today) markDayStart(today);
  }, [hydrated, today, markDayStart]);

  useEffect(() => {
    if (hydrated) startSync();
  }, [hydrated]);

  // The sign-in page for the site password sits outside the app.
  if (pathname === "/login") return children;

  if (status === "error") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <Logo className="mb-3 size-9" />
        <p className="text-[15px] font-medium">Couldn&apos;t open your saved data</p>
        <p className="max-w-xs text-[13px] leading-relaxed text-muted">
          Nothing was changed. Close any other Alexender tabs, then try again. Private browsing windows can also block storage.
        </p>
        <button onClick={() => location.reload()} className="mt-3 rounded-full border border-line-strong px-4 py-1.5 text-[13px] hover:border-fg">
          Try again
        </button>
      </div>
    );
  }

  // A new device waits for its first sync, so it shows your data instead of the setup screen.
  if (!hydrated || !today || (!name && !syncReady)) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Logo className="size-9 animate-[spin_8s_linear_infinite]" />
      </div>
    );
  }

  if (hasLock && !unlocked) {
    return (
      <LucideProvider strokeWidth={1.75}>
        <LockScreen />
      </LucideProvider>
    );
  }

  if (!name) return <Onboarding />;

  return (
    <LucideProvider strokeWidth={1.75}>
      <div className="min-h-dvh lg:pl-56">
        <Sidebar />
        <TopBar />
        <main className="animate-fade mx-auto w-full max-w-5xl px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16">{children}</main>
        <BottomNav />
      </div>
    </LucideProvider>
  );
}

function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-line bg-bg px-3 py-5 lg:flex">
      <Link href="/" className="mb-7 flex items-center gap-2.5 px-2.5">
        <Logo className="size-6" />
        <span className="text-[15px] font-semibold tracking-tight">Alexender</span>
      </Link>
      <nav className="flex flex-1 flex-col gap-px">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex h-9 items-center gap-3 rounded-lg px-2.5 text-[13.5px] transition-colors",
                active ? "bg-surface-2 font-medium text-fg" : "text-muted hover:bg-surface hover:text-fg",
              )}
            >
              <Icon className="size-[18px]" />
              {label}
            </Link>
          );
        })}
      </nav>
      <SidebarLock />
    </aside>
  );
}

function SidebarLock() {
  const hasLock = useStore((s) => !!s.settings.lock);
  if (!hasLock) return null;
  return (
    <button onClick={lockNow} className="flex h-9 items-center gap-3 rounded-lg px-2.5 text-[13.5px] text-muted transition-colors hover:bg-surface hover:text-fg">
      <LockKeyhole className="size-[18px]" /> Lock
    </button>
  );
}

function TopBar() {
  const today = useClock((s) => s.today);
  const log = useStore((s) => s.days[today]);
  const threshold = useStore((s) => s.settings.winThreshold);
  const pct = log?.pct ?? 0;
  const won = log && log.total > 0 && pct >= threshold;
  const date = fromKey(today).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  const hasLock = useStore((s) => !!s.settings.lock);
  const syncStatus = useSync((s) => s.status);

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex h-13 max-w-5xl items-center gap-3 px-4 sm:px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-2 lg:hidden">
          <Logo className="size-5" />
          <span className="text-[15px] font-semibold tracking-tight">Alexender</span>
        </Link>
        <p className="hidden text-[13px] text-muted lg:block">{date}</p>
        <div className="flex-1" />
        {(syncStatus === "offline" || syncStatus === "error") && (
          <Link href="/settings" title={syncStatus === "offline" ? "Offline — changes will sync when you're back online" : "Sync problem — see Settings"}>
            <CloudOff className="size-4 text-faint" />
          </Link>
        )}
        <div title="Completed today" className="flex items-center gap-2.5 text-[13px]">
          <div className="h-1 w-16 overflow-hidden rounded-full bg-surface-3">
            <div className={cn("h-full rounded-full", won ? "bg-success" : "bg-fg")} style={{ width: `${pct}%` }} />
          </div>
          <span className={cn("font-mono tabular-nums", won ? "text-success" : "text-fg")}>{pct}%</span>
        </div>
        {hasLock && (
          <button aria-label="Lock" onClick={lockNow} className="-mr-1.5 flex size-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg lg:hidden">
            <LockKeyhole className="size-[17px]" />
          </button>
        )}
      </div>
    </header>
  );
}

function BottomNav() {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const primary = NAV.filter((n) => MOBILE_PRIMARY.includes(n.href));
  const rest = NAV.filter((n) => !MOBILE_PRIMARY.includes(n.href));
  const moreActive = rest.some((n) => isActive(pathname, n.href));

  return (
    <>
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/90 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid h-15 max-w-md grid-cols-5">
          {primary.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn("flex flex-col items-center justify-center gap-1 text-[10px] font-medium", active ? "text-fg" : "text-faint")}
              >
                <Icon className="size-[22px]" />
                {label}
              </Link>
            );
          })}
          <button
            onClick={() => setMore(true)}
            className={cn("flex flex-col items-center justify-center gap-1 text-[10px] font-medium", moreActive ? "text-fg" : "text-faint")}
          >
            <MoreIcon className="size-[22px]" />
            All
          </button>
        </div>
      </nav>
      <Modal open={more} onClose={() => setMore(false)} title="All sections">
        <div className="grid grid-cols-3 gap-2 pb-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMore(false)}
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-2.5 rounded-2xl border text-[13px] font-medium transition-colors",
                isActive(pathname, href) ? "border-line-strong bg-surface-2 text-fg" : "border-line text-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              <Icon className="size-6" />
              {label}
            </Link>
          ))}
        </div>
      </Modal>
    </>
  );
}
