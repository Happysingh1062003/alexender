"use client";

import { useStore } from "./store";
import { parseYouTubeId } from "./utils";

export const PENDING_TITLE = "Loading title…";
const inFlight = new Set<string>();

/** Reads a video's title through our own oEmbed proxy. Safe to call repeatedly. */
export async function fetchVideoTitle(id: string) {
  const video = useStore.getState().videos.find((v) => v.id === id);
  if (!video || inFlight.has(id)) return;
  inFlight.add(id);
  try {
    const res = await fetch(`/api/oembed?id=${video.youtubeId}`);
    const data = res.ok ? ((await res.json()) as { title?: string; author?: string }) : {};
    useStore.getState().updateVideo(id, { title: data.title || "Untitled video", channel: data.author });
  } catch {
    // offline — the Videos page retries pending titles on its next visit
  } finally {
    inFlight.delete(id);
  }
}

/** Adds a YouTube video immediately; the title is filled in the background. Returns false for invalid links. */
export function addVideoFromUrl(url: string, title?: string) {
  const youtubeId = parseYouTubeId(url);
  if (!youtubeId) return false;
  const id = useStore.getState().addVideo({ url: url.trim(), youtubeId, title: title?.trim() || PENDING_TITLE });
  if (!title?.trim()) fetchVideoTitle(id);
  return true;
}

const lookups = new Set<string>();

/** Finds cover, author and page count on Open Library. Marks the book checked once a lookup completes. */
export async function lookupBook(id: string) {
  const book = useStore.getState().books.find((b) => b.id === id);
  if (!book || book.coverChecked || lookups.has(id)) return;
  lookups.add(id);
  try {
    const q = new URLSearchParams({ title: book.title, limit: "5", fields: "cover_i,author_name,number_of_pages_median" });
    if (book.author) q.set("author", book.author);
    const res = await fetch(`https://openlibrary.org/search.json?${q}`);
    if (!res.ok) return;
    const data = (await res.json()) as { docs?: { cover_i?: number; author_name?: string[]; number_of_pages_median?: number }[] };
    const doc = data.docs?.find((d) => d.cover_i) ?? data.docs?.[0];
    const latest = useStore.getState().books.find((b) => b.id === id);
    if (!latest) return;
    useStore.getState().updateBook(id, {
      coverChecked: true,
      coverUrl: latest.coverUrl ?? (doc?.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined),
      author: latest.author || doc?.author_name?.[0] || "",
      totalPages: latest.totalPages ?? doc?.number_of_pages_median,
    });
  } catch {
    // offline — the Books page retries on its next visit
  } finally {
    lookups.delete(id);
  }
}

/** Adds a book and looks up its cover in the background. */
export function addBook(title: string, author = "", totalPages?: number) {
  const id = useStore.getState().addBook({ title: title.trim(), author: author.trim(), totalPages });
  lookupBook(id);
  return id;
}

export const splitBook = (text: string) => {
  const [title, author = ""] = text.split(/\s+by\s+/i);
  return { title, author };
};
