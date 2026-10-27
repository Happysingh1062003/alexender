"use client";

import { useEffect, useRef } from "react";

/*
 * One stack for everything that opens over the page — sheets, full-screen views, dialogs, the
 * orb menu. The phone's back gesture, the browser's Back button and the Escape key all close
 * only the top one. Opening adds one history entry; closing by any other means removes it again,
 * and an overlay removing its own entry is not mistaken for Back by the ones beneath it.
 * Overlays that cover the page also hold the page still until the last of them closes.
 */

type Entry = { close: () => void; popped: boolean };
const stack: Entry[] = [];
let ownBacks = 0;
let listening = false;
let scrollLocks = 0;

function onPopState() {
  if (ownBacks > 0) {
    ownBacks--;
    return;
  }
  const top = stack.pop();
  if (top) {
    top.popped = true;
    top.close();
  }
}

function onKeyDown(e: KeyboardEvent) {
  // A control that handles Escape itself (a dropdown, an inline edit) stops it first.
  if (e.key !== "Escape" || e.defaultPrevented) return;
  const top = stack[stack.length - 1];
  if (!top) return;
  e.preventDefault();
  top.close();
}

function lockScroll() {
  if (scrollLocks++ === 0) document.body.style.overflow = "hidden";
  return () => {
    if (--scrollLocks === 0) document.body.style.overflow = "";
  };
}

/** True while an overlay is open above the one asking — for keys that belong to the top one. */
export const overlaysOpen = () => stack.length;

export function useBackToClose(open: boolean, onClose: () => void, options: { lockScroll?: boolean } = {}) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  const lock = !!options.lockScroll;

  useEffect(() => {
    if (!open) return;
    if (!listening) {
      window.addEventListener("popstate", onPopState);
      window.addEventListener("keydown", onKeyDown);
      listening = true;
    }
    const unlock = lock ? lockScroll() : undefined;
    const entry: Entry = { close: () => close.current(), popped: false };
    let pushed = false;
    let href = "";
    // Deferred so React's development double-mount doesn't leave a stray entry behind.
    const timer = setTimeout(() => {
      href = window.location.href;
      window.history.pushState(null, "", href);
      pushed = true;
      stack.push(entry);
    }, 0);
    return () => {
      clearTimeout(timer);
      unlock?.();
      const at = stack.indexOf(entry);
      if (at >= 0) stack.splice(at, 1);
      // Closed with a button: drop our entry — unless a link already took us to another page.
      if (pushed && !entry.popped && window.location.href === href) {
        ownBacks++;
        window.history.back();
      }
    };
  }, [open, lock]);
}
