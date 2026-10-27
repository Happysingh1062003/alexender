"use client";

import { del, get, set } from "idb-keyval";
import { create } from "zustand";
import { clearImages, getImageBlob, getOrFetchImage } from "./images";
import { mergeData, stableStringify } from "./merge";
import {
  allImageIds,
  DATA_KEYS,
  normalize,
  pickData,
  useStore,
  type Data,
} from "./store";
import { uid } from "./utils";

/*
 * Keeps this device and the server in step. Every device works from its own local copy (fast,
 * offline-friendly); this module pulls the server copy, merges record by record, and pushes the
 * result. Operations run one at a time. A "generation" id (epoch) marks resets: when another
 * device erases or imports, devices on an older generation adopt the server copy instead of
 * merging their old data back in.
 */

export type SyncStatus =
  "starting" | "syncing" | "synced" | "offline" | "off" | "error";

export const useSync = create<{
  status: SyncStatus;
  storage?: "cloud" | "local";
  lastSynced?: number;
  message?: string;
  /** Why sync is off or failing, from the server ("no-password", "no-storage") or "signed-out". */
  code?: string;
  /** When this device's data was last replaced by another device's (to refresh Settings). */
  replacedAt?: number;
  /** First sync attempt has finished (so a new device knows whether data exists). */
  ready: boolean;
}>(() => ({ status: "starting", ready: false }));

/** What this device held before another device's "use my data everywhere" replaced it. */
export type Replaced = { at: number; data: Data };
const REPLACED_KEY = "alexender-replaced";
export const readReplaced = () =>
  get<Replaced>(REPLACED_KEY).catch(() => undefined);
export const forgetReplaced = () => del(REPLACED_KEY).catch(() => {});

/** Anything you made yourself — worth keeping a copy of before it's replaced. */
const hasContent = (d: Data) =>
  [d.tasks, d.missions, d.goals, d.videos, d.books, d.bucket, d.donts, d.podcasts, d.plans, d.ideas, d.habits, d.timerTasks, d.timerSessions, d.myStories].some((list) => list.length > 0) ||
  Object.keys(d.journal).length > 0;

type ServerDoc = { data: Partial<Data> & { epoch?: string }; version: number };

const META_KEY = "alex-sync";
// A request that never answers would stall every later sync and keep a new device on the
// loading screen, so each one gives up after this long and counts as offline.
const REQUEST_TIMEOUT_MS = 15_000;
const UPLOADED_KEY = "alex-uploaded-images";
// Generations started by a deliberate reset ("use this device everywhere", import, erase) carry
// this prefix, so even a device that has never synced takes that copy instead of merging its own.
const RESET_PREFIX = "r-";

function readMeta(): { version: number; epoch?: string } {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) ?? "") ?? { version: 0 };
  } catch {
    return { version: 0 };
  }
}
const writeMeta = (meta: { version: number; epoch?: string }) => {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {}
};

function readUploaded(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(UPLOADED_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}
const writeUploaded = (ids: Set<string>) => {
  try {
    localStorage.setItem(UPLOADED_KEY, JSON.stringify([...ids]));
  } catch {}
};

let started = false;
let applying = false;
let pushTimer: ReturnType<typeof setTimeout> | undefined;
let chain: Promise<unknown> = Promise.resolve();

let retryTimer: ReturnType<typeof setTimeout> | undefined;
/** After a failure, try again soon rather than waiting for the 30-second heartbeat. */
const retrySoon = () => {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(syncNow, 10_000);
};

/** Run sync steps strictly one after another. */
const run = (fn: () => Promise<void>) =>
  (chain = chain.then(fn, fn).catch(() => {
    useSync.setState({
      status: "error",
      message: "Couldn't save to the cloud — retrying.",
    });
    retrySoon();
  }));

export const syncNow = () => run(sync);

export function startSync() {
  if (started) return;
  started = true;

  useStore.subscribe((s, prev) => {
    if (applying) return;
    if (DATA_KEYS.some((k) => s[k] !== prev[k])) {
      clearTimeout(pushTimer);
      pushTimer = setTimeout(syncNow, 1500);
    }
  });

  window.addEventListener("online", syncNow);
  document.addEventListener("visibilitychange", () => {
    // Coming back: fetch what other devices did. Leaving: flush pending edits right away.
    if (!document.hidden || pushTimer) {
      clearTimeout(pushTimer);
      pushTimer = undefined;
      syncNow();
    }
  });
  setInterval(() => !document.hidden && syncNow(), 30_000);

  syncNow().finally(() => useSync.setState({ ready: true }));
}

async function sync() {
  // While sync is off (no database or password yet) keep checking quietly, so it switches on by
  // itself once the site is set up — no reload needed.
  const quiet = useSync.getState().status === "off";
  pushTimer = undefined;
  if (!quiet) useSync.setState({ status: "syncing" });

  let res: Response;
  try {
    res = await fetch("/api/sync", {
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    useSync.setState({ status: "offline" });
    retrySoon();
    return;
  }
  if (res.status === 401) {
    // The session cookie expired or the password changed: changes stay on this device until sign-in.
    useSync.setState({
      status: "error",
      code: "signed-out",
      message: "Signed out — sign in again to keep syncing.",
    });
    return;
  }
  if ([403, 404, 503].includes(res.status)) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
    };
    if (body.code === "db-error") {
      // Set up correctly but the database didn't answer: a temporary problem, so retry soon.
      useSync.setState({ status: "error", code: body.code, message: body.error });
      retrySoon();
      return;
    }
    useSync.setState({ status: "off", code: body.code, message: body.error });
    return;
  }
  if (!res.ok) throw new Error(`sync ${res.status}`);
  const { storage, doc } = (await res.json()) as {
    storage: "cloud" | "local";
    doc: ServerDoc | null;
  };
  useSync.setState({ storage });
  await reconcile(doc);
}

function apply(data: Data) {
  applying = true;
  try {
    useStore.getState().applySynced(data);
  } finally {
    applying = false;
  }
}

async function reconcile(doc: ServerDoc | null, attempt = 0): Promise<void> {
  const meta = readMeta();
  // Read local state and apply the merge without awaiting in between, so edits made while the
  // request was in flight are part of the merge rather than overwritten.
  const local = pickData(useStore.getState());
  let merged: Data;
  let epoch = meta.epoch;

  if (!doc) {
    merged = local;
    epoch ??= uid();
  } else {
    const remote = normalize(doc.data);
    const serverEpoch = doc.data.epoch;
    const resetElsewhere =
      !!serverEpoch &&
      serverEpoch !== meta.epoch &&
      (!!meta.epoch || serverEpoch.startsWith(RESET_PREFIX));
    if (resetElsewhere) {
      merged = remote; // another device replaced everything
      epoch = doc.data.epoch;
      writeUploaded(new Set());
      // Nothing is lost silently: keep what this device had (photos stay on the device too), so it
      // can be downloaded from Settings. With nothing worth keeping, free the space instead.
      if (
        hasContent(local) &&
        stableStringify(local) !== stableStringify(remote)
      )
        void set(REPLACED_KEY, {
          at: Date.now(),
          data: local,
        } satisfies Replaced)
          .then(() => useSync.setState({ replacedAt: Date.now() }))
          .catch(() => {});
      else clearImages().catch(() => {});
    } else {
      merged = mergeData(local, remote);
      epoch = doc.data.epoch ?? epoch ?? uid();
    }
  }

  if (stableStringify(merged) !== stableStringify(local)) apply(merged);

  const serverUpToDate =
    doc &&
    doc.data.epoch === epoch &&
    stableStringify(normalize(doc.data)) === stableStringify(merged);
  if (serverUpToDate) {
    writeMeta({ version: doc.version, epoch });
  } else {
    const body = JSON.stringify({
      data: { ...merged, epoch },
      baseVersion: doc?.version ?? 0,
    });
    let put: Response;
    try {
      put = await fetch("/api/sync", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: body.length < 60_000, // lets a small save finish while the app is closing
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      useSync.setState({ status: "offline" });
      return;
    }
    if (put.status === 409 && attempt < 3) {
      const { current } = (await put.json()) as { current: ServerDoc | null };
      return reconcile(current, attempt + 1);
    }
    if (!put.ok) throw new Error(`save ${put.status}`);
    const { version } = (await put.json()) as { version: number };
    writeMeta({ version, epoch });
  }

  useSync.setState({
    status: "synced",
    lastSynced: Date.now(),
    message: undefined,
    code: undefined,
  });
  await uploadImages(merged);
}

/** Send photos this device has that the server doesn't yet. */
async function uploadImages(data: Data) {
  const uploaded = readUploaded();
  const pending = allImageIds(data).filter((id) => !uploaded.has(id));
  for (const id of pending) {
    const blob = await getImageBlob(id);
    if (blob) {
      try {
        const res = await fetch(`/api/images?id=${encodeURIComponent(id)}`, {
          method: "PUT",
          headers: { "Content-Type": blob.type || "application/octet-stream" },
          body: blob,
        });
        if (!res.ok) continue;
      } catch {
        return; // offline — try again on the next sync
      }
    }
    // Uploaded now, or it came from another device and the server already has it.
    uploaded.add(id);
    writeUploaded(uploaded);
  }
}

/**
 * Replace everything on every device (erase all, import a backup). Starts a new generation, so
 * other devices adopt this data instead of merging their old copy back in.
 */
export async function resetEverywhere(data: Partial<Data>) {
  const fresh = normalize(data);
  // The server's photos are replaced too, so first make sure this device holds every photo it uses.
  if (useSync.getState().status !== "off")
    for (const id of allImageIds(fresh)) await getOrFetchImage(id);
  apply(fresh);
  writeUploaded(new Set());
  if (useSync.getState().status === "off") return true;
  await chain;
  const epoch = RESET_PREFIX + uid();
  try {
    const res = await fetch("/api/sync?reset=1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: { ...fresh, epoch } }),
    });
    if (!res.ok) return false;
    const { version } = (await res.json()) as { version: number };
    writeMeta({ version, epoch });
    useSync.setState({ status: "synced", lastSynced: Date.now() });
    await uploadImages(fresh);
    return true;
  } catch {
    return false;
  }
}

/**
 * Make this device's data the only copy: the server and every other device take it, and their
 * own differing data is dropped. Returns false when sync isn't available or the save failed.
 */
export async function makeThisDeviceTheSource() {
  if (useSync.getState().status === "off") return false;
  return resetEverywhere(pickData(useStore.getState()));
}
