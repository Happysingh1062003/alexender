"use client";

import { todayKey } from "./date";
import { exportImages, importImages } from "./images";
import { allImageIds, useStore, type Data } from "./store";
import { downloadFile } from "./utils";

interface Backup {
  app: "alexender";
  version: 1;
  exportedAt: string;
  data: Data;
  images: Record<string, string>;
}

export async function exportBackup() {
  const s = useStore.getState();
  const data: Data = {
    tasks: s.tasks,
    routines: s.routines,
    days: s.days,
    goals: s.goals,
    videos: s.videos,
    books: s.books,
    learnings: s.learnings,
    plans: s.plans,
    settings: s.settings,
    focus: null,
  };
  const backup: Backup = {
    app: "alexender",
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
    images: await exportImages(allImageIds(data)),
  };
  downloadFile(`alexender-backup-${todayKey()}.json`, JSON.stringify(backup));
}

export async function importBackup(file: File) {
  const backup = JSON.parse(await file.text()) as Backup;
  if (backup.app !== "alexender" || !backup.data) throw new Error("This file is not an Alexender backup.");
  await importImages(backup.images ?? {});
  useStore.getState().replaceAll(backup.data);
}
