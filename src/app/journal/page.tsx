"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
      <SectionTop label="Journal">
        <PillButton active={open === today} onClick={() => setOpen(open === today ? null : today)}>
          {journal[today] ? "Continue today" : "Write today"}
        </PillButton>
      </SectionTop>

      {entries.length > 0 && !open && (
        <p className="-mt-4 mb-10 text-center font-mono text-[12px] text-faint tabular-nums">
          <span className="text-fg">{entries.length}</span> {entries.length === 1 ? "entry" : "entries"} ·{" "}
          {entries.filter((e) => e.date.slice(0, 7) === today.slice(0, 7)).length} this month
        </p>
      )}

      {open && (
        <div className="mb-12">
          <Entry key={open} date={open} onDone={() => setOpen(null)} />
        </div>
      )}

      {entries.length === 0 && !open && <p className="text-center text-[15px] text-faint">Your days, in your words. Entries collect here by date.</p>}

      <ul className="space-y-10">
        {entries
          .filter((e) => e.date !== open)
          .map((e) => (
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

/** The writing surface for one day. Saves as you type. */
function Entry({ date, onDone }: { date: string; onDone: () => void }) {
  const entry = useStore((s) => s.journal[date]);
  const setJournal = useStore((s) => s.setJournal);
  const [text, setText] = useState(entry?.text ?? "");
  const [saved, setSaved] = useState(true);
  const ref = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pending = useRef<string | null>(null);

  // Grow with the text instead of scrolling inside a box.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(240, el.scrollHeight)}px`;
  }, [text]);

  // Save whatever is pending when leaving the day.
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (pending.current !== null) setJournal(date, pending.current);
    },
    [date, setJournal],
  );

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const d = fromKey(date);

  return (
    <div className="rounded-2xl border border-line bg-surface text-left transition-colors focus-within:border-line-strong">
      <p className="px-5 pt-4 text-[12px] text-faint sm:px-6">
        {d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
      </p>
      <textarea
        autoFocus
        ref={ref}
        value={text}
        onChange={(e) => {
          const value = e.target.value;
          setText(value);
          setSaved(false);
          pending.current = value;
          clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            setJournal(date, value);
            pending.current = null;
            setSaved(true);
          }, 500);
        }}
        onBlur={() => {
          if (pending.current === null) return;
          clearTimeout(timer.current);
          setJournal(date, pending.current);
          pending.current = null;
          setSaved(true);
        }}
        placeholder={"How was your day?\n\nWhat happened, what you felt, what you learned…"}
        className="block w-full resize-none bg-transparent px-5 pt-2 pb-5 text-[16px] leading-[1.75] text-fg outline-none placeholder:text-faint sm:p-6"
      />
      <div className="flex items-center justify-between border-t border-line px-5 py-2.5 text-[11px] text-faint sm:px-6">
        <span>{words ? `${words} words` : "Nothing written yet"}</span>
        <span className="flex items-center gap-4">
          {saved ? (entry ? "Saved" : "") : "Saving…"}
          <button onClick={onDone} className="font-medium text-muted hover:text-fg">
            Done
          </button>
        </span>
      </div>
    </div>
  );
}
