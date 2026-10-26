"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft } from "lucide-react";
import { useBackToClose } from "@/lib/useBackToClose";
import { PillButton, SectionTop } from "@/components/ui";
import { fromKey } from "@/lib/date";
import { useClock, useStore } from "@/lib/store";

export default function JournalPage() {
  const today = useClock((s) => s.today);
  const journal = useStore((s) => s.journal);
  const [open, setOpen] = useState<string | null>(null);

  const entries = useMemo(() => Object.values(journal).sort((a, b) => b.date.localeCompare(a.date)), [journal]);

  return (
    <div className="mx-auto max-w-xl">
      <SectionTop>
        <PillButton active={open === today} onClick={() => setOpen(open === today ? null : today)}>
          {journal[today] ? "Continue today" : "Write today"}
        </PillButton>
      </SectionTop>

      {entries.length > 0 && (
        <p className="-mt-4 mb-10 text-center font-mono text-[12px] text-faint tabular-nums">
          <span className="text-fg">{entries.length}</span> {entries.length === 1 ? "entry" : "entries"} ·{" "}
          {entries.filter((e) => e.date.slice(0, 7) === today.slice(0, 7)).length} this month
        </p>
      )}

      {open && <Entry key={open} date={open} onDone={() => setOpen(null)} />}

      {entries.length === 0 && <p className="text-center text-[15px] text-faint">Your days, in your words. Entries collect here by date.</p>}

      <ul className="space-y-10">
        {entries.map((e) => (
            <li key={e.date} className="text-center">
              <button onClick={() => setOpen(e.date)} className="group w-full">
                <span className="block text-[12px] text-faint">
                  {e.date === today ? "Today" : fromKey(e.date).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </span>
                <span className="mx-auto mt-2 line-clamp-4 max-w-lg text-[16px] leading-relaxed whitespace-pre-wrap text-muted transition-colors group-hover:text-fg">
                  {e.text}
                </span>
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
}

/**
 * Tracks the part of the screen not covered by the on-screen keyboard. Browsers that
 * shrink the page for the keyboard and those (like iPhone Safari) that overlay it both
 * report it through visualViewport.
 */
function useVisibleViewport() {
  const [box, setBox] = useState<{ top: number; height: number } | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setBox({ top: vv.offsetTop, height: vv.height });
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return box;
}

/** Full-screen writing for one day. Saves as you type; always fits above the keyboard. */
function Entry({ date, onDone }: { date: string; onDone: () => void }) {
  const entry = useStore((s) => s.journal[date]);
  const setJournal = useStore((s) => s.setJournal);
  const [text, setText] = useState(entry?.text ?? "");
  const [saved, setSaved] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pending = useRef<string | null>(null);
  const box = useVisibleViewport();
  useBackToClose(true, onDone);

  const flush = () => {
    clearTimeout(timer.current);
    if (pending.current === null) return;
    setJournal(date, pending.current);
    pending.current = null;
    setSaved(true);
  };

  // Save whatever is pending when leaving the day; keep the page behind still.
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      clearTimeout(timer.current);
      if (pending.current !== null) setJournal(date, pending.current);
    };
  }, [date, setJournal]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onDone();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onDone]);

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const d = fromKey(date);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Journal entry"
      className="animate-fade fixed inset-x-0 top-0 z-50 flex h-dvh flex-col bg-bg"
      style={box ? { top: box.top, height: box.height } : undefined}
    >
      <div className="mx-auto flex w-full max-w-2xl shrink-0 items-center gap-2 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 sm:px-6 sm:pt-6">
        <button
          onClick={() => {
            flush();
            onDone();
          }}
          aria-label="Back to journal"
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg active:scale-95"
        >
          <ChevronLeft className="size-5" />
        </button>
        <p className="min-w-0 flex-1 truncate text-[15px] font-medium">{d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
        <button
          onClick={() => {
            flush();
            onDone();
          }}
          className="h-9 shrink-0 rounded-full bg-fg px-4 text-[13px] font-medium text-bg transition-transform active:scale-95"
        >
          Done
        </button>
      </div>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => {
          const value = e.target.value;
          setText(value);
          setSaved(false);
          pending.current = value;
          clearTimeout(timer.current);
          timer.current = setTimeout(flush, 500);
        }}
        onBlur={flush}
        placeholder={"How was your day?\n\nWhat happened, what you felt, what you learned…"}
        className="mx-auto block min-h-0 w-full max-w-2xl flex-1 resize-none overflow-y-auto bg-transparent px-5 py-4 text-[17px] leading-[1.75] text-fg outline-none placeholder:text-faint sm:px-8 sm:text-[18px]"
      />
      <div className="mx-auto flex w-full max-w-2xl shrink-0 items-center justify-between border-t border-line px-5 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] text-[11px] text-faint sm:px-8">
        <span>{words ? `${words} words` : "Nothing written yet"}</span>
        <span>{saved ? (entry ? "Saved" : "") : "Saving…"}</span>
      </div>
    </div>,
    document.body,
  );
}
