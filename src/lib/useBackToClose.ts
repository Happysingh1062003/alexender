"use client";

import { useEffect, useRef } from "react";

/**
 * Lets the phone's back gesture (or the browser's Back button) close a full-screen sheet or
 * dialog instead of leaving the page. Opening adds one history entry; closing by any other
 * means removes it again.
 */
export function useBackToClose(open: boolean, onClose: () => void) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    let pushed = false;
    let popped = false;
    let href = "";
    // Deferred so React's development double-mount doesn't leave a stray entry behind.
    const timer = setTimeout(() => {
      href = window.location.href;
      window.history.pushState(null, "", href);
      pushed = true;
    }, 0);
    const onPop = () => {
      popped = true;
      close.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("popstate", onPop);
      // Closed with a button: drop our entry — unless a link already took us to another page.
      if (pushed && !popped && window.location.href === href) window.history.back();
    };
  }, [open]);
}
