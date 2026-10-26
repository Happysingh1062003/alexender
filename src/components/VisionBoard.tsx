"use client";

import { ImagePlus, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { saveImages } from "@/lib/images";
import { useBackToClose } from "@/lib/useBackToClose";
import { IconButton, ImageUploadButton, StoredImage } from "./ui";

/**
 * A mission or goal, full screen: its words, then every image whole, one below another — just
 * scroll. Add images here; editing and removing them live in Settings.
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
  const [dropping, setDropping] = useState(false);
  useBackToClose(true, onClose);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const upload = async (files: FileList) => {
    const ids = await saveImages(files);
    if (ids.length) onAddImages(ids);
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="animate-fade fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-bg"
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
      <div className="sticky top-0 z-10 flex items-center gap-1 bg-bg/85 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 backdrop-blur-xl sm:px-6">
        <IconButton label="Close" onClick={onClose} className="size-10 text-fg">
          <X className="size-5" />
        </IconButton>
        <span className="flex-1 text-center text-[12px] font-medium text-faint">
          {label}
          {images.length > 0 && ` · ${images.length} image${images.length === 1 ? "" : "s"}`}
        </span>
        <ImageUploadButton plain onAdd={onAddImages} className="size-10 rounded-full text-muted hover:bg-surface-2 hover:text-fg">
          <ImagePlus className="size-[18px]" />
          <span className="sr-only">Add images</span>
        </ImageUploadButton>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-6 pb-[max(3rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-10">
        <h1 className="text-[30px] leading-[1.15] font-semibold tracking-[-0.025em] text-balance whitespace-pre-wrap sm:text-[44px]">{title}</h1>
        {children && <div className="mt-3 text-[14px] leading-relaxed text-muted">{children}</div>}

        {images.length === 0 ? (
          <ImageUploadButton onAdd={onAddImages} className="mt-10 aspect-[4/3] w-full flex-col gap-2 text-[15px] sm:aspect-[16/9]">
            <ImagePlus className="size-7" />
            Add images to see it
            <span className="text-[12px] text-faint">Pick several at once — or drop them here</span>
          </ImageUploadButton>
        ) : (
          // Each image whole, at its own shape, one after another.
          <div className="mt-8 space-y-4 sm:space-y-6">
            {images.map((id) => (
              <StoredImage key={id} id={id} className="block h-auto min-h-40 w-full rounded-2xl bg-surface object-contain" />
            ))}
          </div>
        )}
      </div>

      {dropping && (
        <div className="pointer-events-none fixed inset-3 z-20 flex items-center justify-center rounded-3xl border-2 border-dashed border-fg/30 bg-black/70 text-[15px]">
          Drop images to add them
        </div>
      )}
    </div>,
    document.body,
  );
}
