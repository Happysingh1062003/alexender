"use client";

import { createStore, del, get, set, type UseStore } from "idb-keyval";
import { useEffect, useState } from "react";
import { uid } from "./utils";

// Images live in their own IndexedDB store so the main data blob stays small.
let store: UseStore | undefined;
const imgStore = () => (store ??= createStore("alexender-images", "images"));

const urlCache = new Map<string, string>();

async function compress(file: File, max = 1600, quality = 0.85): Promise<Blob> {
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", quality),
  );
}

export async function saveImages(files: FileList | File[]): Promise<string[]> {
  const ids: string[] = [];
  for (const file of Array.from(files)) {
    if (!file.type.startsWith("image/")) continue;
    const id = uid();
    await set(id, await compress(file), imgStore());
    ids.push(id);
  }
  return ids;
}

export async function deleteImages(ids: string[]) {
  for (const id of ids) {
    await del(id, imgStore());
    const url = urlCache.get(id);
    if (url) URL.revokeObjectURL(url);
    urlCache.delete(id);
  }
}

export async function getImageUrl(id: string): Promise<string | null> {
  const cached = urlCache.get(id);
  if (cached) return cached;
  const blob = await get<Blob>(id, imgStore());
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(id, url);
  return url;
}

export function useImageUrl(id?: string) {
  const [url, setUrl] = useState<string | null>(id ? (urlCache.get(id) ?? null) : null);
  useEffect(() => {
    let alive = true;
    if (id) getImageUrl(id).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [id]);
  return id ? url : null;
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

export async function exportImages(ids: string[]) {
  const out: Record<string, string> = {};
  for (const id of ids) {
    const blob = await get<Blob>(id, imgStore());
    if (blob) out[id] = await blobToDataUrl(blob);
  }
  return out;
}

export async function importImages(images: Record<string, string>) {
  for (const [id, dataUrl] of Object.entries(images)) {
    const blob = await (await fetch(dataUrl)).blob();
    await set(id, blob, imgStore());
  }
}
