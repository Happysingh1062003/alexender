"use client";

import { Check, ExternalLink, X } from "lucide-react";
import { useStore, byOrder, type ListKind } from "@/lib/store";
import type { ListItem } from "@/lib/types";
import { cn, parseYouTubeId } from "@/lib/utils";
import { DoneRow, DoneSection } from "./Queue";
import { SortableList } from "./Sortable";
import { EditableText, IconButton, ProgressBar, SectionTop, toast } from "./ui";

/*
 * One calm list for the simple sections — to-do, don't-do, podcasts. Drag to reorder, tap to edit,
 * an optional note under each entry, and undo on delete.
 */

export interface ListConfig {
  kind: ListKind;
  addLabel: string;
  placeholder: string;
  empty: string;
  /** Entries can be ticked off (to-dos, podcasts). Rules you keep (don't-do) cannot. */
  completable?: boolean;
  completeLabel?: string;
  doneLabel?: string;
  /** Entries may carry a link; pasting one fills the title in where possible. */
  links?: boolean;
}

const looksLikeLink = (text: string) => /^https?:\/\//i.test(text) || /^[\w-]+(\.[\w-]+)+\/\S*$/.test(text);

/** A readable placeholder title for a link: "open.spotify.com" → "Spotify". */
function titleFromLink(url: string) {
  try {
    const host = new URL(/^https?:/i.test(url) ? url : `https://${url}`).hostname.replace(/^(www|open|m)\./, "");
    const name = host.split(".")[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return url;
  }
}

async function addEntry(kind: ListKind, text: string, links?: boolean) {
  const { addItem, updateItem } = useStore.getState();
  if (!links || !looksLikeLink(text)) {
    addItem(kind, { title: text });
    return;
  }
  const url = /^https?:/i.test(text) ? text : `https://${text}`;
  const id = addItem(kind, { title: titleFromLink(url), url });
  // YouTube links (many podcasts live there) get their real title.
  const youtubeId = parseYouTubeId(url);
  if (!youtubeId) return;
  try {
    const res = await fetch(`/api/oembed?id=${youtubeId}`);
    const data = res.ok ? ((await res.json()) as { title?: string }) : {};
    if (data.title) updateItem(kind, id, { title: data.title });
  } catch {
    // offline — the placeholder title stays and can be renamed
  }
}

export function SimpleList({ config }: { config: ListConfig }) {
  const { kind, completable, links } = config;
  const items = useStore((s) => s[kind]);
  const { reorder, toggleItem } = useStore.getState();
  const open = items.filter((i) => !completable || !i.done).sort(byOrder);
  const done = completable ? items.filter((i) => i.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0)) : [];

  return (
    <div className="mx-auto max-w-xl">
      <SectionTop actions={[{ label: config.addLabel, placeholder: config.placeholder, keepOpen: true, onAdd: (text) => addEntry(kind, text, links) }]} />

      {completable && items.length > 0 && (
        <div className="mx-auto mb-10 max-w-[240px] text-center">
          <ProgressBar value={(done.length / items.length) * 100} tone="crystal" />
          <p className="mt-2.5 text-[12px] text-faint tabular-nums">
            <span className="text-fg">{done.length}</span>/{items.length} {config.doneLabel?.toLowerCase() ?? "done"}
          </p>
        </div>
      )}

      {items.length === 0 && <p className="mx-auto max-w-sm text-center text-[15px] leading-relaxed text-faint">{config.empty}</p>}

      <SortableList items={open} onReorder={(ids) => reorder(kind, ids)}>
        {(item, handle) => <Row item={item} config={config} handle={handle} />}
      </SortableList>

      {completable && (
        <DoneSection label={config.doneLabel ?? "Done"} count={done.length}>
          {done.map((item) => (
            <DoneRow
              key={item.id}
              title={item.title}
              completedAt={item.doneAt}
              onReopen={() => toggleItem(kind, item.id)}
              extra={item.note ? <p className="mt-1 text-[12px] whitespace-pre-wrap text-faint">{item.note}</p> : undefined}
            />
          ))}
        </DoneSection>
      )}
    </div>
  );
}

function Row({ item, config, handle }: { item: ListItem; config: ListConfig; handle: React.ReactNode }) {
  const { kind, completable } = config;
  const { updateItem, toggleItem, deleteItem, restore } = useStore.getState();

  const remove = () => {
    deleteItem(kind, item.id);
    toast("Removed", { label: "Undo", run: () => restore(kind, item) });
  };

  return (
    <div className="group -mx-2 flex items-start gap-2.5 rounded-2xl px-2 py-2.5 transition-colors duration-200 hover:bg-surface">
      <div className="flex w-7 shrink-0 justify-center pt-0.5 pointer-coarse:hidden sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">{handle}</div>
      {!completable && <span aria-hidden className="mt-[9px] size-1.5 shrink-0 rounded-full bg-faint" />}
      <div className="ml-0.5 min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <EditableText value={item.title} onSave={(t) => t && updateItem(kind, item.id, { title: t })} className="line-clamp-2 text-[15px] leading-snug" />
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open link"
              title={item.url}
              className="shrink-0 rounded-md p-1 text-faint transition-colors hover:bg-surface-2 hover:text-fg"
            >
              <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
        <EditableText
          value={item.note ?? ""}
          placeholder="Add a note"
          onSave={(note) => updateItem(kind, item.id, { note: note || undefined })}
          className={cn("mt-0.5 text-[12.5px] text-faint", !item.note && "sm:opacity-0 sm:group-hover:opacity-100")}
        />
      </div>
      <IconButton label="Remove" onClick={remove} className="shrink-0 hover:text-danger sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100">
        <X className="size-3.5" />
      </IconButton>
      {completable && (
        <button
          aria-label={config.completeLabel ?? "Mark done"}
          title={config.completeLabel ?? "Mark done"}
          onClick={() => toggleItem(kind, item.id)}
          className="mt-1 flex size-[24px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-faint text-transparent transition-[border-color,color,transform] duration-200 hover:border-crystal hover:text-crystal active:scale-90"
        >
          <Check className="size-3" strokeWidth={3} />
        </button>
      )}
    </div>
  );
}
