"use client";

import { useStore } from "./store";
import { parsePlaylistId, parseYouTubeId } from "./utils";

export const PENDING_TITLE = "Loading title…";
// Lookups are tried once per session; a failed one is retried the next time the app opens.
const triedVideos = new Set<string>();

/** Reads a video's title and details through our own oEmbed proxy. */
export async function fetchVideoTitle(id: string) {
  const video = useStore.getState().videos.find((v) => v.id === id);
  if (!video || triedVideos.has(id)) return;
  triedVideos.add(id);
  try {
    const res = await fetch(`/api/oembed?id=${video.youtubeId}`);
    const data = res.ok
      ? ((await res.json()) as { title?: string; author?: string; durationSec?: number; views?: number; published?: string })
      : {};
    useStore.getState().updateVideo(id, {
      title: data.title || "Untitled video",
      channel: data.author,
      durationSec: data.durationSec,
      views: data.views,
      published: data.published,
    });
  } catch {
    // offline — retried next session
  }
}

/** Adds a YouTube video immediately; the title is filled in the background. */
export function addVideoFromUrl(url: string): "added" | "invalid" | "duplicate" {
  const youtubeId = parseYouTubeId(url);
  if (!youtubeId) return "invalid";
  if (useStore.getState().videos.some((v) => v.youtubeId === youtubeId && !v.done)) return "duplicate";
  const id = useStore.getState().addVideo({ url: url.trim(), youtubeId, title: PENDING_TITLE });
  fetchVideoTitle(id);
  return "added";
}

const triedBooks = new Set<string>();

/** Finds cover, author and page count on Open Library. Marks the book checked once a lookup completes. */
export async function lookupBook(id: string) {
  const book = useStore.getState().books.find((b) => b.id === id);
  if (!book || book.coverChecked || triedBooks.has(id)) return;
  triedBooks.add(id);
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
    // offline — retried next session
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

const triedPlaylists = new Set<string>();

/** Title, channel and cover of a playlist, through our oEmbed proxy. */
export async function fetchPlaylistTitle(id: string) {
  const playlist = useStore.getState().playlists.find((p) => p.id === id);
  if (!playlist || triedPlaylists.has(id)) return;
  triedPlaylists.add(id);
  try {
    const res = await fetch(`/api/oembed?list=${encodeURIComponent(playlist.listId)}`);
    const data = res.ok ? ((await res.json()) as { title?: string; author?: string; thumbnail?: string }) : {};
    useStore.getState().updatePlaylist(id, { title: data.title || "Untitled playlist", channel: data.author, thumb: data.thumbnail });
  } catch {
    // offline — retried next session
  }
}

/** Adds a playlist from its link; the title and cover fill in a moment later. */
export function addPlaylistFromUrl(url: string): "added" | "invalid" | "duplicate" {
  const listId = parsePlaylistId(url);
  if (!listId) return "invalid";
  if (useStore.getState().playlists.some((p) => p.listId === listId && !p.done)) return "duplicate";
  const id = useStore.getState().addPlaylist({ url: url.trim(), listId, title: PENDING_TITLE });
  fetchPlaylistTitle(id);
  return "added";
}
