"use client";

import { useEffect } from "react";
import { DoneRow, DoneSection, QueueRow } from "@/components/Queue";
import { ProgressBar, SectionTop } from "@/components/ui";
import { addBook, lookupBook, splitBook } from "@/lib/capture";
import { useStore } from "@/lib/store";
import type { Book } from "@/lib/types";
import { cn, pct } from "@/lib/utils";

function Cover({ book }: { book: Book }) {
  return book.coverUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={book.coverUrl} alt="" className="h-16 w-11 shrink-0 rounded object-cover" />
  ) : (
    <div className="flex h-16 w-11 shrink-0 items-end rounded bg-surface-3 p-1">
      <span className="line-clamp-3 text-[8px] leading-tight font-medium text-muted">{book.title}</span>
    </div>
  );
}

/** Page tracker for the book being read: "p. 80 / 254" with a thin bar. */
function Progress({ book }: { book: Book }) {
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
      {book.totalPages ? <ProgressBar value={pct(book.currentPage ?? 0, book.totalPages)} className="max-w-28" /> : null}
    </div>
  );
}

export default function BooksPage() {
  const books = useStore((s) => s.books);
  const { completeBook, moveBook, deleteBook, reopenBook, updateBook } = useStore.getState();

  useEffect(() => {
    books.filter((b) => !b.coverChecked).forEach((b) => lookupBook(b.id));
  }, [books]);

  const queue = books.filter((b) => !b.done).sort((a, b) => a.order - b.order);
  const done = books.filter((b) => b.done).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

  return (
    <div className="mx-auto max-w-xl">
      <SectionTop
        label="Books"
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
          <ProgressBar value={(done.length / books.length) * 100} />
          <p className="mt-2.5 font-mono text-[12px] text-faint tabular-nums">
            <span className="text-fg">{done.length}</span>/{books.length} read
          </p>
        </div>
      )}

      {books.length === 0 && <p className="text-center text-[15px] text-faint">Add a book as “Title by Author” — the cover is found for you.</p>}

      <ul>
        {queue.map((b, i) => (
          <QueueRow
            key={b.id}
            media={<Cover book={b} />}
            title={b.title}
            subtitle={b.author}
            extra={i === 0 || b.currentPage ? <Progress book={b} /> : undefined}
            isFirst={i === 0}
            isLast={i === queue.length - 1}
            onMove={(dir) => moveBook(b.id, dir)}
            onRemove={() => confirm("Remove this book?") && deleteBook(b.id)}
            onComplete={() => completeBook(b.id)}
            onRename={(title) => updateBook(b.id, { title })}
          />
        ))}
      </ul>

      <DoneSection label="Read" count={done.length}>
        {done.map((b) => (
          <DoneRow key={b.id} media={<Cover book={b} />} title={b.author ? `${b.title} — ${b.author}` : b.title} completedAt={b.completedAt} onReopen={() => reopenBook(b.id)} />
        ))}
      </DoneSection>
    </div>
  );
}
