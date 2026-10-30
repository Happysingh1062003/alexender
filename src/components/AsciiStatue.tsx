"use client";

import { useEffect, useState } from "react";
import { ASCII_STATUE } from "@/lib/ascii";
import { cn } from "@/lib/utils";

const GLYPHS = "01#%&*+=-:./\\|<>[]{}?!$";
const WIDTH = Math.max(...ASCII_STATUE.map((l) => l.length));
const BLANK = ASCII_STATUE.map((l) => " ".repeat(l.length));

/**
 * Alexander, in characters. On arrival each character flickers through random glyphs and settles
 * into the statue, top to bottom; after that a slow band of light passes over it, like light over
 * marble. `size` is the character size in px — small sizes read as a picture, not as text.
 */
export function AsciiStatue({ size = 5, className, decode = true }: { size?: number; className?: string; decode?: boolean }) {
  const [lines, setLines] = useState<string[]>(decode ? BLANK : ASCII_STATUE);

  useEffect(() => {
    if (!decode) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rows = ASCII_STATUE.length;
    // Each character settles at its own moment: lower rows later, with a little randomness.
    const settle = ASCII_STATUE.map((line, y) => [...line].map(() => (y / rows) * 900 + Math.random() * 450));
    const began = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const t = reduce ? Infinity : now - began;
      let done = true;
      const next = ASCII_STATUE.map((line, y) =>
        [...line]
          .map((ch, x) => {
            if (ch === " " || t >= settle[y][x]) return ch;
            done = false;
            // Not there yet: blank at first, then flickering glyphs just before it lands.
            return t < settle[y][x] - 320 ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0];
          })
          .join(""),
      );
      setLines(next);
      if (!done) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [decode]);

  return (
    <pre
      aria-label="Alexander the Great, drawn in characters"
      role="img"
      className={cn("ascii-marble m-0 select-none whitespace-pre", className)}
      style={{
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
        fontSize: size,
        lineHeight: 1.08,
        letterSpacing: 0,
        width: `${WIDTH}ch`,
      }}
    >
      {lines.join("\n")}
    </pre>
  );
}
