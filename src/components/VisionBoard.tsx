"use client";

import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Pause,
  Play,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { saveImages } from "@/lib/images";
import { useBackToClose } from "@/lib/useBackToClose";
import { cn } from "@/lib/utils";
import { IconButton, ImageUploadButton, StoredImage } from "./ui";

const SLIDE_MS = 6000;

/**
 * A mission or goal, full screen: its images one at a time — swipe, tap the edges or use the
 * arrow keys; it moves on by itself until you touch it. Editing and removing images live in Settings.
 */
export function VisionBoard({
  label,
  title,
  images,
  onAddImages,
  onClose,
  children,
}: {
  label: string;
  title: string;
  images: string[];
  onAddImages: (ids: string[]) => void;
  onClose: () => void;
  /** Extra lines under the title, e.g. a goal's why and deadline. */
  children?: ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dropping, setDropping] = useState(false);
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const width = useRef(1);
  const count = images.length;
  const current = Math.min(index, Math.max(0, count - 1));
  useBackToClose(true, onClose);

  const go = useCallback(
    (dir: number) =>
      count > 0 &&
      setIndex((i) => (Math.min(i, count - 1) + dir + count) % count),
    [count],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [go, onClose]);

  // Moves on by itself; the timer restarts whenever the slide changes.
  useEffect(() => {
    if (!playing || dragging || count < 2) return;
    const id = setTimeout(() => go(1), SLIDE_MS);
    return () => clearTimeout(id);
  }, [playing, dragging, count, current, go]);

  const upload = async (files: FileList) => {
    const ids = await saveImages(files);
    if (ids.length) {
      onAddImages(ids);
      setIndex(count);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="animate-fade fixed inset-0 z-50 flex h-dvh flex-col overflow-clip bg-black text-fg"
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDropping(true);
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setDropping(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDropping(false);
        if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
      }}
    >
      {/* The slides. */}
      {count > 0 && (
        <div
          className="absolute inset-0 touch-pan-y overflow-clip"
          // Swiping with a mouse must not start the browser's own image drag (it would re-add the photo on drop).
          onDragStart={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            width.current = e.currentTarget.clientWidth || 1;
            start.current = { x: e.clientX, y: e.clientY, t: Date.now() };
            setDragging(true);
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) =>
            start.current && count > 1 && setDx(e.clientX - start.current.x)
          }
          onPointerUp={(e) => {
            const s = start.current;
            start.current = null;
            setDragging(false);
            setDx(0);
            if (!s) return;
            const moved = e.clientX - s.x;
            const fast = Math.abs(moved) > 30 && Date.now() - s.t < 250;
            if (Math.abs(moved) > width.current * 0.18 || fast)
              go(moved < 0 ? 1 : -1);
            else if (Math.abs(moved) < 6 && Math.abs(e.clientY - s.y) < 6)
              go(e.clientX < width.current / 3 ? -1 : 1);
          }}
          onPointerCancel={() => {
            start.current = null;
            setDragging(false);
            setDx(0);
          }}
        >
          <div
            className={cn(
              "flex h-full",
              !dragging &&
                "transition-transform duration-500 ease-[var(--ease-out)]",
            )}
            style={{
              transform: `translate3d(calc(${-current * 100}% + ${dx}px), 0, 0)`,
            }}
          >
            {images.map((id, i) => (
              <div
                key={id}
                className="relative h-full w-full shrink-0 overflow-hidden"
                aria-hidden={i !== current}
              >
                {Math.abs(i - current) <= 1 ||
                (current === 0 && i === count - 1) ||
                (current === count - 1 && i === 0) ? (
                  <>
                    {/* A blurred copy fills the frame behind images that don't share the screen's shape. */}
                    <StoredImage
                      id={id}
                      className="absolute inset-0 size-full scale-110 opacity-40 blur-2xl"
                    />
                    <StoredImage
                      key={i === current ? `${id}-on` : id}
                      id={id}
                      className={cn(
                        "relative size-full object-contain",
                        i === current && "animate-slow-zoom",
                      )}
                    />
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shade so the words and controls stay readable over any photo. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/80 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black via-black/70 to-transparent" />

      {/* Top bar: progress, close, add. */}
      <div className="relative z-10 px-3 pt-[max(0.6rem,env(safe-area-inset-top))] sm:px-6">
        {count > 1 && (
          <div className="mb-2 flex gap-1 px-1">
            {images.map((id, i) => (
              <button
                key={id}
                aria-label={`Image ${i + 1}`}
                onClick={() => setIndex(i)}
                className="h-4 flex-1 py-1.5"
              >
                <span className="block h-[2px] overflow-hidden rounded-full bg-white/25">
                  <span
                    key={
                      i === current
                        ? `${current}-${playing && !dragging}`
                        : undefined
                    }
                    className={cn(
                      "block h-full rounded-full bg-white",
                      i < current
                        ? "w-full"
                        : i > current
                          ? "w-0"
                          : playing && !dragging
                            ? "w-0"
                            : "w-full",
                    )}
                    style={
                      i === current && playing && !dragging
                        ? {
                            animation: `fill-bar ${SLIDE_MS}ms linear forwards`,
                          }
                        : undefined
                    }
                  />
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1">
          <IconButton
            label="Close"
            onClick={onClose}
            className="size-10 text-white hover:bg-white/10"
          >
            <X className="size-5" />
          </IconButton>
          <span className="flex-1 text-center font-mono text-[11px] tracking-[0.2em] text-white/60 uppercase">
            {label}
            {count > 1 && ` · ${current + 1}/${count}`}
          </span>
          {count > 1 && (
            <IconButton
              label={playing ? "Pause" : "Play"}
              onClick={() => setPlaying((p) => !p)}
              className="size-10 text-white hover:bg-white/10"
            >
              {playing ? (
                <Pause className="size-4" />
              ) : (
                <Play className="size-4" />
              )}
            </IconButton>
          )}
          <ImageUploadButton
            plain
            onAdd={(ids) => {
              if (!ids.length) return;
              onAddImages(ids);
              setIndex(count);
            }}
            className="size-10 rounded-full text-white hover:bg-white/10"
          >
            <ImagePlus className="size-[18px]" />
            <span className="sr-only">Add images</span>
          </ImageUploadButton>
        </div>
      </div>

      {count > 1 &&
        ([-1, 1] as const).map((dir) => (
          <button
            key={dir}
            aria-label={dir < 0 ? "Previous image" : "Next image"}
            onClick={() => go(dir)}
            className={cn(
              "absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 sm:flex",
              dir < 0 ? "left-5" : "right-5",
            )}
          >
            {dir < 0 ? (
              <ChevronLeft className="size-5" />
            ) : (
              <ChevronRight className="size-5" />
            )}
          </button>
        ))}

      {/* The words. */}
      <div
        className={cn(
          "pointer-events-none relative z-10 mt-auto px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-12 sm:pb-14",
          count === 0 && "my-auto text-center",
        )}
      >
        <h1 className="mx-auto max-w-4xl text-[32px] leading-[1.1] font-semibold tracking-[-0.025em] text-balance whitespace-pre-wrap text-white sm:text-[52px]">
          {title}
        </h1>
        {children && (
          <div className="pointer-events-auto mx-auto mt-4 max-w-4xl text-[14px] leading-relaxed text-white/70">
            {children}
          </div>
        )}
        {count === 0 && (
          <div className="pointer-events-auto mt-10 flex justify-center">
            <ImageUploadButton
              onAdd={onAddImages}
              className="h-12 border-white/25 px-6 text-white/80 hover:border-crystal hover:text-white"
            >
              <ImagePlus className="size-4" /> Add images to see it
            </ImageUploadButton>
          </div>
        )}
      </div>

      {dropping && (
        <div className="pointer-events-none absolute inset-3 z-20 flex items-center justify-center rounded-3xl border-2 border-dashed border-white/40 bg-black/70 text-[15px]">
          Drop images to add them
        </div>
      )}
    </div>,
    document.body,
  );
}
