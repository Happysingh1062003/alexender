"use client";

import { BookOpen, ImagePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { DoneRow, DoneSection, QueueRow } from "@/components/Queue";
import { SortableList } from "@/components/Sortable";
import { Button, ImageUploadButton, Modal, ProgressBar, SectionTop, StoredImage, Textarea } from "@/components/ui";
import { addBook, lookupBook, splitBook } from "@/lib/capture";
import { deleteImages } from "@/lib/images";
import { byOrder, useStore } from "@/lib/store";
import type { Book } from "@/lib/types";
import { cn, pct } from "@/lib/utils";

/** The cover doubles as its own upload button: tap it to use your own photo of the book. */
function Cover({ book }: { book: Book }) {
  const updateBook = useStore((s) => s.updateBook);
  const art = book.coverId ? (
    <StoredImage id={book.coverId} className="size-full" />
  ) : book.coverUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={book.coverUrl} alt="" className="size-full object-cover" />
  ) : (
    <span className="flex size-full flex-col items-center justify-center gap-1 bg-surface-3 p-1 text-faint">
      <ImagePlus className="size-3.5" />
      <span className="line-clamp-2 text-center text-[7.5px] leading-tight">{book.title}</span>
    </span>
  );
  return (
    <ImageUploadButton
      plain
      multiple={false}
      onAdd={([id]) => {
        if (!id) return;
        if (book.coverId) deleteImages([book.coverId]);
        updateBook(book.id, { coverId: id });
      }}
      className="group/cover relative h-[72px] w-12 shrink-0 overflow-hidden rounded-md shadow-[0_6px_18px_rgba(0,0,0,0.55)] ring-1 ring-line-strong"
    >
      {art}
      <span className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity group-hover/cover:opacity-100" title="Upload a cover">
        <ImagePlus className="size-4 text-white" />
      </span>
    </ImageUploadButton>
  );
}

/** Page tracker for the book being read: "p. 80 / 254" with a thin bar. */
function Progress({ book, onPause }: { book: Book; onPause?: () => void }) {
  const updateBook = useStore((s) => s.updateBook);
  const num = (v: string) => Number(v.replace(/\D/g, "")) || 0;
  const inputClass = "w-10 rounded bg-transparent px-1 text-center font-mono text-[11px] outline-none hover:bg-surface-3 focus:bg-surface-2";
  return (
    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-faint">
      <span className="shrink-0">
        p.
        <input
          aria-label="Current page"
          inputMode="numeric"
          value={book.currentPage ?? 0}
          onChange={(e) => updateBook(book.id, { currentPage: book.totalPages ? Math.min(book.totalPages, num(e.target.value)) : num(e.target.value) })}
          className={cn(inputClass, "text-fg")}
        />
        /
        <input
          aria-label="Total pages"
          inputMode="numeric"
          placeholder="–"
          value={book.totalPages ?? ""}
          onChange={(e) => updateBook(book.id, { totalPages: num(e.target.value) || undefined })}
          className={inputClass}
        />
      </span>
      {book.totalPages ? <ProgressBar value={pct(book.currentPage ?? 0, book.totalPages)} className="max-w-28" tone="crystal" /> : null}
      {onPause && (
        <button onClick={onPause} className="ml-auto shrink-0 rounded px-1 text-[11px] text-faint transition-colors hover:text-fg" title="Move back to up next">
          Pause
        </button>
      )}
    </div>
  );
}

/** After the last page: what will you do differently because of this book? */
function ActionModal({ book, onClose }: { book: Book | null; onClose: () => void }) {
  return (
    <Modal open={!!book} onClose={onClose} title={book?.done ? "Your action" : "Finished — well read"}>
      {book && <ActionForm key={book.id} book={book} onClose={onClose} />}
    </Modal>
  );
}

function ActionForm({ book, onClose }: { book: Book; onClose: () => void }) {
  const { completeBook, updateBook } = useStore.getState();
  const [text, setText] = useState(book.action ?? "");
  const editing = book.done;

  const save = () => {
    if (editing) updateBook(book.id, { action: text.trim() || undefined });
    else completeBook(book.id, text);
    onClose();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <p className="text-[13px] text-muted">
        <span className="text-fg">{book.title}</span>
        {book.author && ` — ${book.author}`}
      </p>
      <label className="mt-5 block text-[11px] font-medium tracking-[0.2em] text-faint uppercase" htmlFor="book-action">
        What action will you take?
      </label>
      <Textarea
        id="book-action"
        autoFocus
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && save()}
        placeholder="One thing you will do because of this book…"
        className="mt-2 text-[15px]"
      />
      <div className="mt-4 flex justify-end gap-2">
        {!editing && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              completeBook(book.id);
              onClose();
            }}
          >
            Skip
          </Button>
        )}
        <Button type="submit">{editing ? "Save" : "Mark as read"}</Button>
      </div>
    </form>
  );
}

/** Books with page progress count as being read, so earlier data shows correctly. */
const isReading = (b: Book) => b.reading ?? (b.currentPage ?? 0) > 0;

function Group({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-2 flex items-baseline gap-2 text-[13px] font-medium text-muted">
        {title} <span className="text-[12px] font-normal text-faint tabular-nums">{count}</span>
      </h2>
      {children}
    </section>
  );
}

export default function BooksPage() {
  const books = useStore((s) => s.books);
  const { reopenBook, updateBook, deleteBook, reorder } = useStore.getState();
  const [finishing, setFinishing] = useState<Book | null>(null);

  useEffect(() => {
    books.filter((b) => !b.coverChecked).forEach((b) => lookupBook(b.id));
  }, [books]);

  const open = books.filter((b) => !b.done).sort(byOrder);
  const reading = open.filter(isReading);
  const upNext = open.filter((b) => !isReading(b));
  const done = books.filter((b) => b.done).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

  return (
    <div className="mx-auto max-w-xl">
      <SectionTop
        actions={[
          {
            label: "Add book",
            placeholder: "Title by Author",
            keepOpen: true,
            onAdd: (text) => {
              const { title, author } = splitBook(text);
              addBook(title, author);
            },
          },
        ]}
      />

      {books.length > 0 && (
        <div className="mx-auto mb-10 max-w-[240px] text-center">
          <ProgressBar value={(done.length / books.length) * 100} tone="crystal" />
          <p className="mt-2.5 font-mono text-[12px] text-faint tabular-nums">
            <span className="text-fg">{done.length}</span>/{books.length} read
          </p>
        </div>
      )}

      {books.length === 0 && (
        <p className="text-center text-[15px] leading-relaxed text-faint">
          Add a book as “Title by Author” — the cover is found for you.
          <br />
          Tap a cover to use your own photo.
        </p>
      )}
      {books.length > 0 && open.length === 0 && <p className="text-center text-[15px] text-faint">Every book read.</p>}

      {/* Read as many at once as you like; each keeps its own page. */}
      {reading.length > 0 && (
        <Group title="Reading" count={reading.length}>
          <SortableList items={reading} onReorder={(ids) => reorder("books", [...ids, ...upNext.map((b) => b.id)])}>
            {(b, handle) => (
              <QueueRow
                handle={handle}
                media={<Cover book={b} />}
                title={b.title}
                subtitle={b.author}
                extra={<Progress book={b} onPause={() => updateBook(b.id, { reading: false })} />}
                onRemove={() => confirm(`Remove “${b.title}”?`) && deleteBook(b.id)}
                onComplete={() => setFinishing(b)}
                completeLabel="Mark as read"
                onRename={(title) => updateBook(b.id, { title })}
              />
            )}
          </SortableList>
        </Group>
      )}

      {upNext.length > 0 && (
        <Group title={reading.length ? "Up next" : "To read"} count={upNext.length}>
          <SortableList items={upNext} onReorder={(ids) => reorder("books", [...reading.map((b) => b.id), ...ids])}>
            {(b, handle) => (
              <QueueRow
                handle={handle}
                media={<Cover book={b} />}
                title={b.title}
                subtitle={b.author}
                extra={
                  <button
                    onClick={() => updateBook(b.id, { reading: true })}
                    className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-line-strong px-2.5 py-0.5 text-[11px] text-muted transition-colors hover:border-faint hover:text-fg"
                  >
                    <BookOpen className="size-3" /> Start reading
                  </button>
                }
                onRemove={() => confirm(`Remove “${b.title}”?`) && deleteBook(b.id)}
                onComplete={() => setFinishing(b)}
                completeLabel="Mark as read"
                onRename={(title) => updateBook(b.id, { title })}
              />
            )}
          </SortableList>
        </Group>
      )}

      <DoneSection label="Read" count={done.length} defaultOpen>
        {done.map((b) => (
          <DoneRow
            key={b.id}
            media={<Cover book={b} />}
            title={b.author ? `${b.title} — ${b.author}` : b.title}
            completedAt={b.completedAt}
            onReopen={() => reopenBook(b.id)}
            extra={
              <button
                onClick={() => setFinishing(b)}
                className={cn(
                  "mt-2 block w-full border-l-2 py-1 pl-3 text-left text-[13px] leading-relaxed transition-colors",
                  b.action ? "border-crystal/70 text-fg/90 hover:text-fg" : "border-line-strong text-faint hover:text-muted",
                )}
              >
                {b.action ?? "+ What action will you take?"}
              </button>
            }
          />
        ))}
      </DoneSection>

      <ActionModal book={finishing} onClose={() => setFinishing(null)} />
    </div>
  );
}
