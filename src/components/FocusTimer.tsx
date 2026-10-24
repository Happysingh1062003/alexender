"use client";

import { Coffee, Pause, Play, Square, Timer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useClock, useStore } from "@/lib/store";
import { chime, cn } from "@/lib/utils";
import { Button, IconButton } from "./ui";

const fmt = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

function notify(title: string, body: string) {
  try {
    if ("Notification" in window && Notification.permission === "granted") new Notification(title, { body, icon: "/icon.svg" });
  } catch {}
}

export function FocusTimer() {
  const focus = useStore((s) => s.focus);
  const now = useClock((s) => s.now);
  const { pauseFocus, resumeFocus, stopFocus, finishFocus, startFocus } = useStore.getState();
  const [expanded, setExpanded] = useState(false);
  const [justFinished, setJustFinished] = useState<"focus" | "break" | null>(null);
  const finishing = useRef(false);

  const paused = focus?.pausedRemainingMs !== undefined;
  const remaining = focus ? (paused ? focus.pausedRemainingMs! : focus.endsAt - now) : 0;

  useEffect(() => {
    if (!focus || paused || remaining > 0 || finishing.current) return;
    finishing.current = true;
    const mode = focus.mode;
    chime();
    notify(mode === "focus" ? "Focus complete" : "Break over", mode === "focus" ? `${focus.label} — take a short break.` : "Back to the conquest.");
    finishFocus();
    // Surface the follow-up prompt once the timer state has been cleared.
    queueMicrotask(() => {
      setJustFinished(mode);
      finishing.current = false;
    });
  }, [focus, paused, remaining, finishFocus]);

  useEffect(() => {
    if (focus) document.title = `${fmt(remaining)} · ${focus.label}`;
    else document.title = "Alexender";
  }, [focus, remaining]);

  if (!focus && justFinished) {
    return (
      <div className="animate-rise fixed right-4 bottom-[calc(9rem+env(safe-area-inset-bottom))] z-40 w-72 rounded-2xl border border-line bg-surface p-4 shadow-2xl lg:bottom-6">
        <p className="text-sm font-medium">{justFinished === "focus" ? "Session done. Well fought." : "Break over."}</p>
        <div className="mt-3 flex gap-2">
          {justFinished === "focus" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                startFocus({ label: "Break", mode: "break" });
                setJustFinished(null);
              }}
            >
              <Coffee className="size-3.5" /> Take a break
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                startFocus({ label: "Deep work" });
                setJustFinished(null);
              }}
            >
              <Play className="size-3.5" /> Focus again
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setJustFinished(null)}>
            Dismiss
          </Button>
        </div>
      </div>
    );
  }

  if (!focus) return null;
  const progress = 1 - remaining / (focus.durationMin * 60_000);

  return (
    <div
      className={cn(
        "animate-rise fixed right-4 bottom-[calc(9rem+env(safe-area-inset-bottom))] z-40 overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl lg:bottom-6",
        expanded ? "w-72" : "w-auto",
      )}
    >
      <div className="absolute inset-x-0 top-0 h-0.5 bg-surface-2">
        <div className="h-full bg-accent transition-all" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="flex items-center gap-2 p-2 pl-3">
        <button onClick={() => setExpanded((e) => !e)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          {focus.mode === "focus" ? <Timer className="size-4 shrink-0 text-accent" /> : <Coffee className="size-4 shrink-0 text-success" />}
          <span className="font-mono text-sm font-semibold tabular-nums">{fmt(remaining)}</span>
          {expanded && <span className="truncate text-xs text-muted">{focus.label}</span>}
        </button>
        <IconButton label={paused ? "Resume" : "Pause"} onClick={paused ? resumeFocus : pauseFocus}>
          {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
        </IconButton>
        <IconButton label="Stop" onClick={stopFocus}>
          <Square className="size-3.5" />
        </IconButton>
      </div>
    </div>
  );
}
