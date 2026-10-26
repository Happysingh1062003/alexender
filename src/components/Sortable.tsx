"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";
import type { HTMLAttributes, ReactNode, TouchEventHandler } from "react";
import { tap } from "@/lib/motion";
import { cn } from "@/lib/utils";

/*
 * Drag-to-reorder for any list. With a mouse, grab the handle. On a phone there is no handle:
 * press and hold the row itself (a normal swipe still scrolls). Keyboard: focus the handle,
 * then Enter / Space and the arrow keys.
 */

export type HandleProps = HTMLAttributes<HTMLElement>;

export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  children,
  className,
  as: Tag = "ul",
}: {
  items: T[];
  onReorder: (ids: string[]) => void;
  children: (item: T, handle: ReactNode, index: number) => ReactNode;
  className?: string;
  as?: "ul" | "ol" | "div";
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 260, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const ids = items.map((i) => i.id);
    onReorder(
      arrayMove(
        ids,
        ids.indexOf(String(active.id)),
        ids.indexOf(String(over.id)),
      ),
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={() => tap(10)}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <Tag className={className}>
          {items.map((item, index) => (
            <SortableRow
              key={item.id}
              id={item.id}
              as={Tag === "div" ? "div" : "li"}
            >
              {(handle) => children(item, handle, index)}
            </SortableRow>
          ))}
        </Tag>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id,
  as: Tag,
  children,
}: {
  id: string;
  as: "li" | "div";
  children: (handle: ReactNode) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  // Mouse and keyboard start from the handle; touch starts from a long press anywhere on the row.
  const { onTouchStart, ...handleListeners } = listeners ?? {};
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...handleListeners}
      aria-label="Drag to reorder"
      title="Drag to reorder"
      className="flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-faint/70 transition-colors hover:bg-surface-2 hover:text-muted active:cursor-grabbing pointer-coarse:hidden"
    >
      <GripVertical className="size-3.5" />
    </button>
  );
  return (
    <Tag
      ref={setNodeRef}
      onTouchStart={onTouchStart as TouchEventHandler | undefined}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        // Vertical lists only move up and down.
        transform: transform
          ? `translate3d(0, ${Math.round(transform.y)}px, 0)${isDragging ? " scale(1.02)" : ""}`
          : undefined,
        transition,
      }}
      className={cn(
        "relative pointer-coarse:select-none pointer-coarse:[-webkit-touch-callout:none]",
        isDragging &&
          "z-20 rounded-2xl bg-surface-2 shadow-[0_16px_48px_rgba(0,0,0,0.7)] ring-1 ring-line-strong",
      )}
    >
      {children(handle)}
    </Tag>
  );
}
