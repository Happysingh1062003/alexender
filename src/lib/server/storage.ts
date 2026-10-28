import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { OWNER, type PasswordHash } from "../auth";

/*
 * Where synced data lives on the server. Each person has one JSON document holding everything
 * except photos, which are stored one per row/file. Writes use a version number so two devices
 * saving at the same moment can't silently overwrite each other — the loser gets a conflict and
 * merges. The owner's data stays where it always was, so nothing moves when accounts are added.
 * Accounts and tournaments are shared by everyone on the site.
 */

export interface Doc {
  data: unknown;
  version: number;
}

export type PutResult = { ok: true; version: number } | { ok: false; current: Doc | null };

/** Someone the owner invited. */
export interface Account extends PasswordHash {
  id: string;
  name: string;
  /** Changes when the password does, which signs that person out everywhere. */
  session: number;
  createdAt: number;
}

export type TournamentGoal = "quest" | "days" | "tasks" | "streak";

/**
 * A race to a target: finish a main goal's task list first (quest), or be first to N winning days,
 * N tasks done, or an N-day streak.
 */
export interface Tournament {
  id: string;
  name: string;
  goal: TournamentGoal;
  target: number;
  /** Completion % that makes a day count as won. */
  line: number;
  /** YYYY-MM-DD; days before it don't count. */
  start: string;
  /** Account ids taking part ("owner" for the owner). */
  participants: string[];
  createdBy: string;
  createdAt: number;
  /** Quest: the main goal, and the tasks everyone must finish. */
  mainGoal?: string;
  tasks?: { id: string; text: string }[];
  /** Quest: who has finished which task, and when (ms). */
  progress?: Record<string, Record<string, number>>;
}

/** A link that lets one person join. Used once, then gone. */
export interface Invite {
  id: string;
  createdBy: string;
  createdAt: number;
  expiresAt: number;
}

export interface Storage {
  kind: "cloud" | "local";
  getDoc(user: string): Promise<Doc | null>;
  putDoc(user: string, data: unknown, baseVersion: number): Promise<PutResult>;
  /** Replace everything in one write and delete that person's photos (erase all / import a backup). */
  reset(user: string, data: unknown): Promise<number>;
  getImage(user: string, id: string): Promise<{ bytes: Buffer; type: string } | null>;
  putImage(user: string, id: string, bytes: Buffer, type: string): Promise<void>;
  deleteImage(user: string, id: string): Promise<void>;
  /** Removes every photo of one person. */
  clearImages(user: string): Promise<void>;

  listAccounts(): Promise<Account[]>;
  getAccount(id: string): Promise<Account | null>;
  saveAccount(account: Account): Promise<void>;
  /** Removes the account with its data and photos. */
  deleteAccount(id: string): Promise<void>;

  listTournaments(): Promise<Tournament[]>;
  saveTournament(t: Tournament): Promise<void>;
  deleteTournament(id: string): Promise<void>;
  /** Quest: tick (`at` = when) or untick (null) one task for one person, safely alongside others. */
  markQuestTask(id: string, user: string, taskId: string, at: number | null): Promise<Tournament | null>;

  listInvites(): Promise<Invite[]>;
  saveInvite(invite: Invite): Promise<void>;
  /** True if this call removed it — so an invite can only ever be used once. */
  deleteInvite(id: string): Promise<boolean>;
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
      await query(`alter table alexender_images add column if not exists owner text not null default 'owner'`);
      await query(`create table if not exists alexender_user_doc (user_id text primary key, data jsonb not null, version bigint not null)`);
      await query(`create table if not exists alexender_accounts (id text primary key, data jsonb not null)`);
      await query(`create table if not exists alexender_tournaments (id text primary key, data jsonb not null)`);
      await query(`create table if not exists alexender_invites (id text primary key, data jsonb not null)`);
    })().catch((error) => {
      ready = undefined;
      throw error;
    }));

  // The owner's document is the original single row; everyone else has a row of their own.
  const where = (user: string) =>
    user === OWNER ? { table: "alexender_doc", key: "id", value: 1 as unknown } : { table: "alexender_user_doc", key: "user_id", value: user as unknown };

  const getDoc = async (user: string): Promise<Doc | null> => {
    await init();
    const w = where(user);
    const rows = await query(`select data, version from ${w.table} where ${w.key} = $1`, [w.value]);
    return rows[0] ? { data: rows[0].data, version: Number(rows[0].version) } : null;
  };

  // Inserts the first time; afterwards, with a `baseVersion`, only updates if nobody saved since.
  const write = async (user: string, data: unknown, version: number, baseVersion?: number) => {
    const w = where(user);
    const upsert = `insert into ${w.table} (${w.key}, data, version) values ($1, $2::jsonb, $3)
      on conflict (${w.key}) do update set data = excluded.data, version = excluded.version`;
    const rows =
      baseVersion === undefined
        ? await query(`${upsert} returning version`, [w.value, JSON.stringify(data), version])
        : await query(`${upsert} where ${w.table}.version = $4 returning version`, [w.value, JSON.stringify(data), version, baseVersion]);
    return rows.length > 0;
  };

  return {
    kind: "cloud",
    getDoc,
    async putDoc(user, data, baseVersion) {
      await init();
      const version = nextVersion(baseVersion);
      return (await write(user, data, version, baseVersion)) ? { ok: true, version } : { ok: false, current: await getDoc(user) };
    },
    async reset(user, data) {
      await init();
      const version = nextVersion((await getDoc(user))?.version ?? 0);
      await write(user, data, version);
      await query(`delete from alexender_images where owner = $1`, [user]);
      return version;
    },
    async getImage(user, id) {
      await init();
      const rows = await query(`select type, data from alexender_images where id = $1 and owner = $2`, [id, user]);
      return rows[0] ? { type: String(rows[0].type), bytes: Buffer.from(String(rows[0].data), "base64") } : null;
    },
    async putImage(user, id, bytes, type) {
      await init();
      // Never overwrites a photo that belongs to someone else.
      await query(
        `insert into alexender_images (id, type, data, owner) values ($1, $2, $3, $4)
         on conflict (id) do update set type = excluded.type, data = excluded.data where alexender_images.owner = excluded.owner`,
        [id, type, bytes.toString("base64"), user],
      );
    },
    async deleteImage(user, id) {
      await init();
      await query(`delete from alexender_images where id = $1 and owner = $2`, [id, user]);
    },
    async clearImages(user) {
      await init();
      await query(`delete from alexender_images where owner = $1`, [user]);
    },

    async listAccounts() {
      await init();
      return (await query(`select data from alexender_accounts`)).map((r) => r.data as Account);
    },
    async getAccount(id) {
      await init();
      const rows = await query(`select data from alexender_accounts where id = $1`, [id]);
      return rows[0] ? (rows[0].data as Account) : null;
    },
    async saveAccount(account) {
      await init();
      await query(`insert into alexender_accounts (id, data) values ($1, $2::jsonb) on conflict (id) do update set data = excluded.data`, [account.id, JSON.stringify(account)]);
    },
    async deleteAccount(id) {
      await init();
      await query(`delete from alexender_accounts where id = $1`, [id]);
      await query(`delete from alexender_user_doc where user_id = $1`, [id]);
      await query(`delete from alexender_images where owner = $1`, [id]);
    },

    async listTournaments() {
      await init();
      return (await query(`select data from alexender_tournaments`)).map((r) => r.data as Tournament);
    },
    async saveTournament(t) {
      await init();
      await query(`insert into alexender_tournaments (id, data) values ($1, $2::jsonb) on conflict (id) do update set data = excluded.data`, [t.id, JSON.stringify(t)]);
    },
    async deleteTournament(id) {
      await init();
      await query(`delete from alexender_tournaments where id = $1`, [id]);
    },
    async markQuestTask(id, user, taskId, at) {
      await init();
      // One statement, so two people ticking at the same moment never erase each other's ticks.
      const mine = `coalesce(data->'progress'->$2, '{}'::jsonb)`;
      const next = at === null ? `${mine} - $3::text` : `${mine} || jsonb_build_object($3::text, $4::bigint)`;
      const rows = await query(
        `update alexender_tournaments
         set data = jsonb_set(data, '{progress}', coalesce(data->'progress', '{}'::jsonb) || jsonb_build_object($2::text, ${next}))
         where id = $1 returning data`,
        at === null ? [id, user, taskId] : [id, user, taskId, at],
      );
      return rows[0] ? (rows[0].data as Tournament) : null;
    },

    async listInvites() {
      await init();
      return (await query(`select data from alexender_invites`)).map((r) => r.data as Invite);
    },
    async saveInvite(invite) {
      await init();
      await query(`insert into alexender_invites (id, data) values ($1, $2::jsonb) on conflict (id) do update set data = excluded.data`, [invite.id, JSON.stringify(invite)]);
    },
    async deleteInvite(id) {
      await init();
      return (await query(`delete from alexender_invites where id = $1 returning id`, [id])).length > 0;
    },
  };
}

// ---------- Local folder (this computer) ----------

export function fileStorage(dir: string): Storage {
  const safeId = (id: string) => id.replace(/[^\w-]/g, "");
  // The owner's files stay where they always were; each invited person gets a folder.
  const home = (user: string) => (user === OWNER ? dir : path.join(dir, "users", safeId(user)));
  const docPath = (user: string) => path.join(home(user), "alexender.json");
  const imgDir = (user: string) => path.join(home(user), "images");
  const accountsPath = path.join(dir, "accounts.json");
  const tournamentsPath = path.join(dir, "tournaments.json");
  const invitesPath = path.join(dir, "invites.json");

  const readJson = async <T>(file: string, fallback: T): Promise<T> => {
    try {
      return JSON.parse(await readFile(file, "utf8")) as T;
    } catch {
      return fallback;
    }
  };
  const getDoc = (user: string) => readJson<Doc | null>(docPath(user), null);

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

  const updateList = <T extends { id: string }>(file: string, change: (list: T[]) => T[]) =>
    exclusive(async () => atomicWrite(file, JSON.stringify(change(await readJson<T[]>(file, [])))));

  return {
    kind: "local",
    getDoc,
    putDoc: (user, data, baseVersion) =>
      exclusive(async () => {
        const current = await getDoc(user);
        if ((current?.version ?? 0) !== baseVersion) return { ok: false as const, current };
        const version = nextVersion(baseVersion);
        await atomicWrite(docPath(user), JSON.stringify({ data, version }));
        return { ok: true as const, version };
      }),
    reset: (user, data) =>
      exclusive(async () => {
        const version = nextVersion((await getDoc(user))?.version ?? 0);
        await atomicWrite(docPath(user), JSON.stringify({ data, version }));
        await rm(imgDir(user), { recursive: true, force: true });
        return version;
      }),
    async getImage(user, id) {
      try {
        const file = path.join(imgDir(user), safeId(id));
        const [bytes, type] = await Promise.all([readFile(file), readFile(`${file}.type`, "utf8")]);
        return { bytes, type };
      } catch {
        return null;
      }
    },
    async putImage(user, id, bytes, type) {
      const file = path.join(imgDir(user), safeId(id));
      await atomicWrite(file, bytes);
      await atomicWrite(`${file}.type`, type);
    },
    async deleteImage(user, id) {
      const file = path.join(imgDir(user), safeId(id));
      await rm(file, { force: true });
      await rm(`${file}.type`, { force: true });
    },
    async clearImages(user) {
      await rm(imgDir(user), { recursive: true, force: true });
    },

    listAccounts: () => readJson<Account[]>(accountsPath, []),
    async getAccount(id) {
      return (await readJson<Account[]>(accountsPath, [])).find((a) => a.id === id) ?? null;
    },
    saveAccount: (account) => updateList<Account>(accountsPath, (list) => [...list.filter((a) => a.id !== account.id), account]),
    async deleteAccount(id) {
      await updateList<Account>(accountsPath, (list) => list.filter((a) => a.id !== id));
      if (safeId(id)) await rm(path.join(dir, "users", safeId(id)), { recursive: true, force: true });
    },

    listTournaments: () => readJson<Tournament[]>(tournamentsPath, []),
    saveTournament: (t) => updateList<Tournament>(tournamentsPath, (list) => [...list.filter((x) => x.id !== t.id), t]),
    deleteTournament: (id) => updateList<Tournament>(tournamentsPath, (list) => list.filter((x) => x.id !== id)),
    markQuestTask: (id, user, taskId, at) =>
      exclusive(async () => {
        const list = await readJson<Tournament[]>(tournamentsPath, []);
        const t = list.find((x) => x.id === id);
        if (!t) return null;
        const mine = { ...(t.progress?.[user] ?? {}) };
        if (at === null) delete mine[taskId];
        else mine[taskId] = at;
        const next = { ...t, progress: { ...t.progress, [user]: mine } };
        await atomicWrite(tournamentsPath, JSON.stringify(list.map((x) => (x.id === id ? next : x))));
        return next;
      }),

    listInvites: () => readJson<Invite[]>(invitesPath, []),
    saveInvite: (invite) => updateList<Invite>(invitesPath, (list) => [...list.filter((x) => x.id !== invite.id), invite]),
    deleteInvite: (id) =>
      exclusive(async () => {
        const list = await readJson<Invite[]>(invitesPath, []);
        if (!list.some((x) => x.id === id)) return false;
        await atomicWrite(invitesPath, JSON.stringify(list.filter((x) => x.id !== id)));
        return true;
      }),
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
