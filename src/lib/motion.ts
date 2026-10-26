import { flushSync } from "react-dom";

/**
 * Runs a store update inside a View Transition, so rows glide to their new places instead of
 * jumping. Falls back to a plain update where unsupported, in a background tab, or when
 * reduced motion is on. The update itself always happens, even if the animation is skipped.
 */
export function smooth(update: () => void) {
  if (
    typeof document === "undefined" ||
    !document.startViewTransition ||
    document.hidden ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    update();
    return;
  }
  const transition = document.startViewTransition(() => flushSync(update));
  // An animation that gets skipped (e.g. the page stopped painting) is not an error.
  transition.ready.catch(() => {});
  transition.finished.catch(() => {});
}

/** A tiny tap of the phone's vibration motor, where there is one (only after a real touch). */
export const tap = (ms = 8) => {
  if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(ms);
};
