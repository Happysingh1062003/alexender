import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

/*
 * Where synced data lives on the server. One JSON document holds it, plus old photos stored one
 * per row/file from before photos stayed on the device. Writes use a version number so two
 * devices saving at the same moment can't silently overwrite each other — the loser gets a
 * conflict and merges.
 */

export interface Doc {
  data: unknown;
  version: number;
}

export type PutResult = { ok: true; version: number } | { ok: false; current: Doc | null };

export interface Storage {
  kind: "cloud" | "local";
  getDoc(): Promise<Doc | null>;
  putDoc(data: unknown, baseVersion: number): Promise<PutResult>;
  /** Replace everything in one write and delete all photos (erase all / import a backup). */
  reset(data: unknown): Promise<number>;
  getImage(id: string): Promise<{ bytes: Buffer; type: string } | null>;
  deleteImage(id: string): Promise<void>;
  /** Removes every stored photo. */
  clearImages(): Promise<void>;
}

/** Strictly increasing, so a new version is always greater than the one it replaces. */
const nextVersion = (prev: number) => Math.max(Date.now(), prev + 1);

// ---------- Postgres (Neon) ----------

type Query = (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

export function postgresStorage(query: Query): Storage {
  let ready: Promise<unknown> | undefined;
  // Creates the tables once per server instance. A failure (database briefly unreachable) is not
  // remembered, so the next request tries again instead of failing until the server restarts.
  const init = () =>
    (ready ??= (async () => {
      await query(`create table if not exists alexender_doc (id int primary key, data jsonb not null, version bigint not null)`);
      await query(`create table if not exists alexender_images (id text primary key, type text not null, data text not null)`);
    })().catch((error) => {
      ready = undefined;
      throw error;
    }));

  const getDoc = async (): Promise<Doc | null> => {
    await init();
    const rows = await query(`select data, version from alexender_doc where id = 1`);
    return rows[0] ? { data: rows[0].data, version: Number(rows[0].version) } : null;
  };

  return {
    kind: "cloud",
    getDoc,
    async putDoc(data, baseVersion) {
      await init();
      const version = nextVersion(baseVersion);
      // Inserts the first time; afterwards only updates if nobody saved since `baseVersion`.
      const rows = await query(
        `insert into alexender_doc (id, data, version) values (1, $1::jsonb, $2)
         on conflict (id) do update set data = excluded.data, version = excluded.version
         where alexender_doc.version = $3
         returning version`,
        [JSON.stringify(data), version, baseVersion],
      );
      return rows.length ? { ok: true, version } : { ok: false, current: await getDoc() };
    },
    async reset(data) {
      await init();
      const version = nextVersion((await getDoc())?.version ?? 0);
      await query(
        `insert into alexender_doc (id, data, version) values (1, $1::jsonb, $2)
         on conflict (id) do update set data = excluded.data, version = excluded.version`,
        [JSON.stringify(data), version],
      );
      await query(`delete from alexender_images`);
      return version;
    },
    async getImage(id) {
      await init();
      const rows = await query(`select type, data from alexender_images where id = $1`, [id]);
      return rows[0] ? { type: String(rows[0].type), bytes: Buffer.from(String(rows[0].data), "base64") } : null;
    },
    async deleteImage(id) {
      await init();
      await query(`delete from alexender_images where id = $1`, [id]);
    },
    async clearImages() {
      await init();
      await query(`delete from alexender_images`);
    },
  };
}

// ---------- Local folder (this computer) ----------

export function fileStorage(dir: string): Storage {
  const docPath = path.join(dir, "alexender.json");
  const imgDir = path.join(dir, "images");
  const safeId = (id: string) => id.replace(/[^\w-]/g, "");

  const getDoc = async (): Promise<Doc | null> => {
    try {
      return JSON.parse(await readFile(docPath, "utf8")) as Doc;
    } catch {
      return null;
    }
  };

  // Write to a temp file then rename, so a crash mid-write never leaves a half-written file.
  const atomicWrite = async (file: string, contents: string | Buffer) => {
    await mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    await writeFile(tmp, contents);
    await rename(tmp, file);
  };

  let queue = Promise.resolve<unknown>(undefined);
  // Serialise writes within this server process so version checks stay correct.
  const exclusive = <T>(fn: () => Promise<T>) => {
    const run = queue.then(fn, fn);
    queue = run.catch(() => {});
    return run;
  };

  return {
    kind: "local",
    getDoc,
    putDoc: (data, baseVersion) =>
      exclusive(async () => {
        const current = await getDoc();
        if ((current?.version ?? 0) !== baseVersion) return { ok: false as const, current };
        const version = nextVersion(baseVersion);
        await atomicWrite(docPath, JSON.stringify({ data, version }));
        return { ok: true as const, version };
      }),
    reset: (data) =>
      exclusive(async () => {
        const version = nextVersion((await getDoc())?.version ?? 0);
        await atomicWrite(docPath, JSON.stringify({ data, version }));
        await rm(imgDir, { recursive: true, force: true });
        return version;
      }),
    async getImage(id) {
      try {
        const file = path.join(imgDir, safeId(id));
        const [bytes, type] = await Promise.all([readFile(file), readFile(`${file}.type`, "utf8")]);
        return { bytes, type };
      } catch {
        return null;
      }
    },
    async deleteImage(id) {
      const file = path.join(imgDir, safeId(id));
      await rm(file, { force: true });
      await rm(`${file}.type`, { force: true });
    },
    async clearImages() {
      await rm(imgDir, { recursive: true, force: true });
    },
  };
}

// ---------- Choosing one ----------

let storage: Storage | null | undefined;

const isPostgresUrl = (value?: string) => !!value && /^postgres(ql)?:\/\//i.test(value.trim());

/**
 * The database connection string. Vercel's Neon integration sets DATABASE_URL (and POSTGRES_URL);
 * when a name prefix was chosen while connecting, the same variables carry it (e.g.
 * STORAGE_DATABASE_URL), so those are found too.
 */
export function databaseUrl(env: Record<string, string | undefined> = process.env): string | undefined {
  for (const name of ["DATABASE_URL", "POSTGRES_URL", "NEON_DATABASE_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"]) {
    if (isPostgresUrl(env[name])) return env[name]!.trim();
  }
  const prefixed = Object.keys(env)
    .filter((name) => /_(DATABASE_URL|POSTGRES_URL)$/.test(name) && isPostgresUrl(env[name]))
    .sort();
  return prefixed.length ? env[prefixed[0]]!.trim() : undefined;
}

/**
 * Neon when a database URL is configured (cloud). Otherwise a `.data` folder next to the app,
 * except on Vercel, whose servers can't keep files — there sync stays off until a database is added.
 */
export function getStorage(): Storage | null {
  if (storage !== undefined) return storage;
  const url = databaseUrl();
  if (url) {
    const sql = neon(url);
    storage = postgresStorage((text, params) => sql.query(text, params) as Promise<Record<string, unknown>[]>);
  } else if (process.env.VERCEL) {
    storage = null;
  } else {
    storage = fileStorage(path.join(process.cwd(), ".data"));
  }
  return storage;
}
