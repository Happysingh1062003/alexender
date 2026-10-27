"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { formatClock } from "@/lib/timer";
import { toast } from "./ui";

/** Two soft notes — enough to notice, never harsh. */
function chime() {
  try {
    const ctx = new AudioContext();
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const at = ctx.currentTime + i * 0.28;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.18, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.65);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {}
}

/**
 * Ends the running timer at its chosen time on whatever page is open, with a chime, and shows
 * the countdown in the tab title. A timer that ran out while the app was closed is ended quietly.
 */
export function TimerWatcher() {
  const open = useStore((s) => s.timerSessions.find((x) => !x.endedAt));

  useEffect(() => {
    if (!open) return;
    const finish = (whileAway: boolean) => {
      useStore.getState().stopTimer(open.id);
      if (whileAway) return;
      chime();
      navigator.vibrate?.([180, 90, 180]);
      toast(`Time's up · ${open.title}`);
    };
    const wait = open.endsAt - Date.now();
    if (wait <= 0) {
      finish(wait < -60_000);
      return;
    }
    const title = document.title;
    const show = () => (document.title = `${formatClock(open.endsAt - Date.now())} · ${open.title}`);
    show();
    const tick = setInterval(show, 1000);
    const done = setTimeout(() => finish(false), wait);
    return () => {
      clearInterval(tick);
      clearTimeout(done);
      document.title = title;
    };
  }, [open]);

  return null;
}
