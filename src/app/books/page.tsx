"use client";

import { ArrowDown, ArrowUp, BookOpen, Check, Lightbulb, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { LearnModal } from "@/components/LearnModal";
import { Button, Card, Empty, IconButton, Input, PageHeader, ProgressBar, Segmented } from "@/components/ui";
import { addBook, lookupBook } from "@/lib/capture";
import { formatShort, toKey } from "@/lib/date";
import { useStore } from "@/lib/store";
import type { Book } from "@/lib/types";
import { cn, pct } from "@/lib/utils";

function Cover({ book, className }: { book: Book; className?: string }) {
  return book.coverUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={book.coverUrl} alt="" className={cn("rounded-md object-cover shadow-sm", className)} />
  ) : (
    <div className={cn("flex items-center justify-center rounded-md bg-surface-2 p-1 text-center", className)}>
      <span className="line-clamp-3 font-serif text-[10px] leading-tight text-muted">{book.title}</span>
    </div>
  );
}

export default function BooksPage() {
  const books = useStore((s) => s.books);
  const learnings = useStore((s) => s.learnings);
  const completeBook = useStore((s) => s.completeBook);
  const updateBook = useStore((s) => s.updateBook);
  const [tab, setTab] = useState<"queue" | "done">("queue");
  const [form, setForm] = useState({ title: "", author: "", pages: "" });
  const [completing, setCompleting] = useState<Book | null>(null);

  useEffect(() => {
    books.filter((b) => !b.coverChecked).forEach((b) => lookupBook(b.id));
  }, [books]);

  const queue = books.filter((b) => !b.done).sort((a, b) => a.order - b.order);
  const done = books.filter((b) => b.done).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

  return (
    <div className="animate-rise">
      <PageHeader
        title="Books"
        subtitle={books.length ? `${done.length} read · ${queue.length} on the list` : "Alexander slept with the Iliad under his pillow."}
      />

      <form
        className="mb-4 grid gap-2 sm:grid-cols-[1fr_1fr_100px_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.title.trim()) return;
          addBook(form.title, form.author, Number(form.pages) || undefined);
          setForm({ title: "", author: "", pages: "" });
          setTab("queue");
        }}
      >
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Book title" />
        <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Author (optional)" />
        <Input
          value={form.pages}
          onChange={(e) => setForm({ ...form, pages: e.target.value.replace(/\D/g, "") })}
          placeholder="Pages"
          inputMode="numeric"
        />
        <Button disabled={!form.title.trim()}>Add</Button>
      </form>

      {books.length > 0 && (
        <div className="mb-4">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "queue", label: `Reading list · ${queue.length}` },
              { value: "done", label: `Completed · ${done.length}` },
            ]}
          />
        </div>
      )}

      {tab === "queue" &&
        (queue.length === 0 ? (
          <Empty icon={<BookOpen className="size-5" />} title={books.length ? "List finished. Add the next." : "No books yet"} hint="Covers are found automatically from Open Library." />
        ) : (
          <div className="space-y-3">
            {queue.map((b, i) => (
              <Card key={b.id} className={cn("p-3 sm:p-3", i === 0 && "border-accent/40")}>
                <div className="flex items-center gap-3">
                  <span className="w-5 shrink-0 text-center font-mono text-xs text-muted">{i + 1}</span>
                  <Cover book={b} className="h-20 w-14 shrink-0" />
                  <div className="min-w-0 flex-1">
                    {i === 0 && <p className="text-[10px] font-semibold tracking-wider text-accent uppercase">Reading now</p>}
                    <p className="line-clamp-2 text-sm font-medium">{b.title}</p>
                    {b.author && <p className="truncate text-xs text-muted">{b.author}</p>}
                    {b.totalPages ? (
                      <div className="mt-2 flex items-center gap-2">
                        <ProgressBar value={pct(b.currentPage ?? 0, b.totalPages)} className="flex-1" />
                        <span className="flex items-center text-[11px] text-muted">
                          <input
                            aria-label="Current page"
                            inputMode="numeric"
                            value={b.currentPage ?? 0}
                            onChange={(e) =>
                              updateBook(b.id, { currentPage: Math.min(b.totalPages!, Number(e.target.value.replace(/\D/g, "")) || 0) })
                            }
                            className="w-10 rounded bg-surface-2 px-1 text-right text-[11px] outline-none"
                          />
                          /{b.totalPages}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-center gap-0.5 sm:flex-row">
                    <div className="flex">
                      <IconButton label="Move up" disabled={i === 0} onClick={() => useStore.getState().moveBook(b.id, -1)}>
                        <ArrowUp className="size-3.5" />
                      </IconButton>
                      <IconButton label="Move down" disabled={i === queue.length - 1} onClick={() => useStore.getState().moveBook(b.id, 1)}>
                        <ArrowDown className="size-3.5" />
                      </IconButton>
                    </div>
                    <div className="flex">
                      <IconButton label="Delete" className="hover:text-danger" onClick={() => confirm("Remove this book?") && useStore.getState().deleteBook(b.id)}>
                        <Trash2 className="size-3.5" />
                      </IconButton>
                      <IconButton label="Mark complete" className="text-accent hover:text-accent" onClick={() => setCompleting(b)}>
                        <Check className="size-4" strokeWidth={2.5} />
                      </IconButton>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ))}

      {tab === "done" &&
        (done.length === 0 ? (
          <Empty icon={<Check className="size-5" />} title="No books finished yet" hint="Complete a book and capture its lessons." />
        ) : (
          <div className="space-y-3">
            {done.map((b) => {
              const learning = learnings.find((l) => l.id === b.learningId);
              return (
                <Card key={b.id} className="p-3 sm:p-3">
                  <div className="flex items-start gap-3">
                    <Cover book={b} className="h-20 w-14 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium">{b.title}</p>
                      <p className="text-xs text-muted">
                        {b.author && `${b.author} · `}Finished {b.completedAt && formatShort(toKey(new Date(b.completedAt)))}
                      </p>
                      {learning && (
                        <p className="mt-2 flex gap-1.5 rounded-lg bg-accent-soft/60 p-2 text-xs leading-relaxed">
                          <Lightbulb className="mt-0.5 size-3 shrink-0 text-accent" />
                          {learning.text}
                        </p>
                      )}
                    </div>
                    <IconButton label="Move back to reading list" onClick={() => useStore.getState().reopenBook(b.id)}>
                      <RotateCcw className="size-3.5" />
                    </IconButton>
                  </div>
                </Card>
              );
            })}
          </div>
        ))}

      <LearnModal
        open={!!completing}
        title={completing?.title ?? ""}
        onClose={() => setCompleting(null)}
        onComplete={(learning) => {
          if (completing) completeBook(completing.id, learning);
          setCompleting(null);
        }}
      />
    </div>
  );
}
