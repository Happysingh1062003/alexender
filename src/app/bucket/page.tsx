"use client";

import { ImagePlus } from "lucide-react";
import { DoneRow, DoneSection, QueueRow } from "@/components/Queue";
import { SortableList } from "@/components/Sortable";
import {
  EditableText,
  ImageUploadButton,
  ProgressBar,
  SectionTop,
  StoredImage,
  toast,
} from "@/components/ui";
import { deleteImages } from "@/lib/images";
import { byOrder, useStore } from "@/lib/store";
import type { BucketItem } from "@/lib/types";

/** A photo of the place or the moment — tap to add or change it. */
function Photo({ item }: { item: BucketItem }) {
  const updateBucket = useStore((s) => s.updateBucket);
  return (
    <ImageUploadButton
      plain
      multiple={false}
      onAdd={([id]) => {
        if (!id) return;
        if (item.imageId) deleteImages([item.imageId]);
        updateBucket(item.id, { imageId: id });
      }}
      className="group/photo relative size-12 shrink-0 overflow-hidden rounded-xl ring-1 ring-line-strong"
    >
      {item.imageId ? (
        <StoredImage id={item.imageId} className="size-full" />
      ) : (
        <span className="flex size-full items-center justify-center bg-surface-2 text-faint transition-colors group-hover/photo:text-muted">
          <ImagePlus className="size-4" />
        </span>
      )}
    </ImageUploadButton>
  );
}

export default function BucketPage() {
  const bucket = useStore((s) => s.bucket);
  const {
    addBucket,
    updateBucket,
    toggleBucket,
    deleteBucket,
    reorder,
    restore,
  } = useStore.getState();

  const open = bucket.filter((b) => !b.done).sort(byOrder);
  const lived = bucket
    .filter((b) => b.done)
    .sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));

  // The photo is kept until the Undo has expired, so removing never needs a question first.
  const remove = (item: BucketItem) => {
    deleteBucket(item.id);
    toast("Removed", { label: "Undo", run: () => restore("bucket", item) });
  };

  return (
    <div className="mx-auto max-w-xl">
      <SectionTop
        actions={[
          {
            label: "Add to the list",
            placeholder: "See the northern lights",
            keepOpen: true,
            onAdd: (text) => addBucket(text),
          },
        ]}
      />

      {bucket.length > 0 && (
        <div className="mx-auto mb-10 max-w-[240px] text-center">
          <ProgressBar
            value={(lived.length / bucket.length) * 100}
            tone="crystal"
          />
          <p className="mt-2.5 font-mono text-[12px] text-faint tabular-nums">
            <span className="text-fg">{lived.length}</span>/{bucket.length}{" "}
            lived
          </p>
        </div>
      )}

      {bucket.length === 0 && (
        <p className="mx-auto max-w-sm text-center text-[15px] leading-relaxed text-faint">
          Places to see, things to try, moments to have — the life outside work.
          Not tasks: adventures.
        </p>
      )}

      <SortableList items={open} onReorder={(ids) => reorder("bucket", ids)}>
        {(item, handle) => (
          <QueueRow
            handle={handle}
            media={<Photo item={item} />}
            title={item.title}
            extra={
              <EditableText
                value={item.note ?? ""}
                placeholder="Add a note"
                onSave={(note) =>
                  updateBucket(item.id, { note: note || undefined })
                }
                className="mt-0.5 text-[12px] text-faint"
              />
            }
            onRemove={() => remove(item)}
            onComplete={() => {
              toggleBucket(item.id);
              toast("Lived. One more story.", {
                label: "Undo",
                run: () => toggleBucket(item.id),
              });
            }}
            completeLabel="Mark as lived"
            onRename={(title) => updateBucket(item.id, { title })}
          />
        )}
      </SortableList>

      <DoneSection label="Lived" count={lived.length} defaultOpen>
        {lived.map((item) => (
          <DoneRow
            key={item.id}
            media={<Photo item={item} />}
            title={item.title}
            completedAt={item.doneAt}
            onReopen={() => toggleBucket(item.id)}
            extra={
              item.note ? (
                <p className="mt-1 text-[12px] text-faint">{item.note}</p>
              ) : undefined
            }
          />
        ))}
      </DoneSection>
    </div>
  );
}
