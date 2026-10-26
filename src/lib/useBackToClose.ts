"use client";

import { useEffect, useRef } from "react";

/*
 * Lets the phone's back gesture (or the browser's Back button) close a full-screen sheet or
 * dialog instead of leaving the page. Opening adds one history entry; closing by any other
 * means removes it again. Overlays stack: Back closes only the top one, and an overlay removing
 * its own entry is not mistaken for Back by the overlays beneath it.
 */

type Entry = { close: () => void; popped: boolean };
const stack: Entry[] = [];
let ownBacks = 0;
let listening = false;

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

export function useBackToClose(open: boolean, onClose: () => void) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    if (!listening) {
      window.addEventListener("popstate", onPopState);
      listening = true;
    }
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
      const at = stack.indexOf(entry);
      if (at >= 0) stack.splice(at, 1);
      // Closed with a button: drop our entry — unless a link already took us to another page.
      if (pushed && !entry.popped && window.location.href === href) {
        ownBacks++;
        window.history.back();
      }
    };
  }, [open]);
}
