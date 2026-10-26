"use client";

import { todayKey } from "./date";
import { exportImages, importImages } from "./images";
import { allImageIds, pickData, useStore, type Data } from "./store";
import { resetEverywhere } from "./sync";
import { downloadFile } from "./utils";

interface Backup {
  app: "alexender";
  version: 1;
  exportedAt: string;
  data: Data;
  images: Record<string, string>;
}

/** Download a backup file: this device's data, or another copy such as the one a reset replaced. */
export async function exportBackup(data: Data = pickData(useStore.getState()), label = "backup") {
  const backup: Backup = {
    app: "alexender",
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
    images: await exportImages(allImageIds(data)),
  };
  downloadFile(`alexander-${label}-${todayKey()}.json`, JSON.stringify(backup));
}

export async function importBackup(file: File) {
  const backup = JSON.parse(await file.text()) as Backup;
  if (backup.app !== "alexender" || !backup.data) throw new Error("This file is not an Alexander backup.");
  await importImages(backup.images ?? {});
  await resetEverywhere(backup.data);
}
