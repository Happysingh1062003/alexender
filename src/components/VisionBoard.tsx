"use client";

import { ChevronLeft, ChevronRight, ImagePlus, Pencil, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { saveImages } from "@/lib/images";
import { cn } from "@/lib/utils";
import { IconButton, ImageUploadButton, StoredImage, Textarea } from "./ui";

/**
 * Full-screen board for a mission or goal: its words big at the top, every image below,
 * upload right there, tap an image to see it full size.
 */
export function VisionBoard({
  label,
  title,
  onTitleChange,
  images,
  onAddImages,
  onRemoveImage,
  onDelete,
  onClose,
  children,
}: {
  label: string;
  title: string;
  onTitleChange: (title: string) => void;
  images: string[];
  onAddImages: (ids: string[]) => void;
  onRemoveImage: (id: string) => void;
  onDelete: () => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  const [viewing, setViewing] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const upload = async (files: FileList | File[]) => {
    setUploading(true);
    const ids = await saveImages(files);
    setUploading(false);
    if (ids.length) onAddImages(ids);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && viewing === null && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, viewing]);

  return createPortal(
    <div
      className="animate-fade fixed inset-0 z-50 overflow-y-auto bg-black"
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
      }}
    >
      {dragging && (
        <div className="pointer-events-none fixed inset-3 z-20 flex items-center justify-center rounded-3xl border-2 border-dashed border-fg/40 bg-black/70 text-[15px] text-fg">
          Drop images to add them
        </div>
      )}
      <div className="sticky top-0 z-10 flex items-center gap-2 bg-black/80 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 backdrop-blur-xl sm:px-6">
        <IconButton label="Close" onClick={onClose} className="size-10 text-fg">
          <X className="size-5" />
        </IconButton>
        <span className="flex-1 text-[11px] font-medium tracking-[0.14em] text-faint uppercase">{label}</span>
        <ImageUploadButton plain onAdd={onAddImages} className="h-9 rounded-lg bg-fg px-3.5 text-[13px] font-medium text-bg hover:bg-white">
          <ImagePlus className="size-4" /> {uploading ? "Adding…" : "Upload images"}
        </ImageUploadButton>
        <IconButton label={`Delete ${label.toLowerCase()}`} onClick={onDelete} className="size-10 hover:text-danger">
          <Trash2 className="size-4" />
        </IconButton>
      </div>

      <div className="mx-auto max-w-5xl px-5 pt-6 pb-[max(3rem,env(safe-area-inset-bottom))] sm:px-8 sm:pt-10">
        {editing ? (
          <Textarea
            autoFocus
            rows={3}
            defaultValue={title}
            onBlur={(e) => {
              if (e.target.value.trim()) onTitleChange(e.target.value.trim());
              setEditing(false);
            }}
            className="border-line-strong bg-surface-2 text-2xl leading-snug font-semibold sm:text-4xl"
          />
        ) : (
          <div className="group flex items-start gap-3">
            <h1 className="min-w-0 flex-1 text-3xl leading-[1.12] font-semibold tracking-tight whitespace-pre-wrap sm:text-5xl">{title}</h1>
            <IconButton label="Edit text" onClick={() => setEditing(true)} className="mt-1 size-9 sm:opacity-0 sm:group-hover:opacity-100">
              <Pencil className="size-4" />
            </IconButton>
          </div>
        )}
        {children && <div className="mt-5">{children}</div>}

        <div className="mt-10">
          {images.length === 0 ? (
            <ImageUploadButton onAdd={onAddImages} className="aspect-[16/9] w-full flex-col gap-2 text-[15px] sm:aspect-[21/9]">
              <ImagePlus className="size-8" />
              Upload images to visualise it
              <span className="text-[12px] text-faint">Pick several at once — or drag them here</span>
            </ImageUploadButton>
          ) : (
            <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
              {images.map((id, i) => (
                <button key={id} onClick={() => setViewing(i)} className="block w-full break-inside-avoid overflow-hidden rounded-xl">
                  <StoredImage id={id} className="min-h-24 w-full transition-transform duration-500 hover:scale-[1.03]" />
                </button>
              ))}
              <ImageUploadButton onAdd={onAddImages} className="aspect-square w-full break-inside-avoid">
                <ImagePlus className="size-5" />
              </ImageUploadButton>
            </div>
          )}
        </div>
      </div>

      {viewing !== null && images[viewing] && (
        <Lightbox
          images={images}
          index={viewing}
          onIndex={setViewing}
          onClose={() => setViewing(null)}
          onRemove={(id) => {
            onRemoveImage(id);
            setViewing(images.length > 1 ? Math.max(0, viewing - 1) : null);
          }}
        />
      )}
    </div>,
    document.body,
  );
}

function Lightbox({
  images,
  index,
  onIndex,
  onClose,
  onRemove,
}: {
  images: string[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  onRemove: (id: string) => void;
}) {
  const touchX = useRef<number | null>(null);
  const go = useCallback((dir: number) => onIndex((index + dir + images.length) % images.length), [index, images.length, onIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  const id = images[index];
  return (
    <div
      className="animate-fade fixed inset-0 z-[60] flex flex-col bg-black/95"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <div className="flex items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <IconButton label="Close image" onClick={onClose} className="size-10 text-fg">
          <X className="size-5" />
        </IconButton>
        <span className="flex-1 text-center font-mono text-[12px] text-faint">
          {index + 1} / {images.length}
        </span>
        <IconButton label="Remove image" onClick={() => confirm("Remove this image?") && onRemove(id)} className="size-10 hover:text-danger">
          <Trash2 className="size-4" />
        </IconButton>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center p-3 sm:p-8" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="flex max-h-full max-w-full">
          <StoredImage key={id} id={id} className="animate-fade max-h-[calc(100dvh-7rem)] max-w-full rounded-lg object-contain" />
        </div>
        {images.length > 1 &&
          ([-1, 1] as const).map((dir) => (
            <button
              key={dir}
              aria-label={dir < 0 ? "Previous image" : "Next image"}
              onClick={(e) => {
                e.stopPropagation();
                go(dir);
              }}
              className={cn(
                "absolute hidden size-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:flex",
                dir < 0 ? "left-4" : "right-4",
              )}
            >
              {dir < 0 ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
            </button>
          ))}
      </div>
    </div>
  );
}
