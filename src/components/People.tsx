"use client";

import { Check, Copy, KeyRound, Link2, Share2, Trash2, UserPlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { confirmDialog, promptDialog } from "./dialog";
import { Button, Card, Input, SectionTitle, toast } from "./ui";

/*
 * Sharing Alexander. The owner adds people (a name and a password) and sends them the link; each
 * person then has their own private Alexander — and everyone can race in the Arena.
 */

export interface Me {
  id: string;
  role: "owner" | "member";
  name: string | null;
  accounts: boolean;
}

/** Who is signed in, from the server. */
export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Me>) : null))
      .then(setMe)
      .catch(() => {});
  }, []);
  return me;
}

type Person = { id: string; name: string; createdAt: number };
type Invite = { id: string; createdAt: number; expiresAt: number };

const inviteUrl = (id: string) => `${window.location.origin}/join#${id}`;
const daysLeft = (t: number) => Math.max(1, Math.ceil((t - Date.now()) / 86_400_000));

/** The phone's share sheet (WhatsApp, Messages…) where there is one; otherwise copy the link. */
async function share(url: string) {
  const text = "Join me on Alexander — your own private command center. We can race each other in the Arena.";
  if (navigator.share) {
    try {
      await navigator.share({ title: "Join me on Alexander", text, url });
      return "shared";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "cancelled";
    }
  }
  try {
    await navigator.clipboard.writeText(`${text}
${url}`);
    return "copied";
  } catch {
    return "failed";
  }
}

const send = async (method: string, body?: unknown, query = "") => {
  const res = await fetch(`/api/people${query}`, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
  const data = res ? await res.json().catch(() => ({})) : { error: "You're offline." };
  return { ok: !!res?.ok, data: data as { error?: string; people?: Person[]; person?: Person } };
};

/** An easy-to-type starter password, e.g. "cedar-4182". */
const WORDS = ["lion", "cedar", "river", "storm", "falcon", "marble", "ember", "harbor", "summit", "arrow", "ivory", "comet"];
const suggest = () => `${WORDS[Math.floor(Math.random() * WORDS.length)]}-${1000 + Math.floor(Math.random() * 9000)}`;

const signOut = async () => {
  await fetch("/api/auth", { method: "DELETE" });
  window.location.replace("/login");
};

/** Settings card: People for the owner, Your account for everyone else. */
export function AccountSection() {
  const me = useMe();
  if (!me) return null;
  return me.role === "owner" ? <PeopleCard enabled={me.accounts} /> : <AccountCard name={me.name ?? ""} />;
}

function PeopleCard({ enabled }: { enabled: boolean }) {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState(suggest);
  const [error, setError] = useState("");
  const [invite, setInvite] = useState<{ name: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [links, setLinks] = useState<Invite[]>([]);
  const [making, setMaking] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    send("GET").then(({ ok, data }) => ok && setPeople(data.people ?? []));
    fetch("/api/invites", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ invites: Invite[] }>) : { invites: [] }))
      .then((d) => setLinks(d.invites))
      .catch(() => {});
  }, [enabled]);

  // One tap: make a link and hand it straight to the share sheet.
  const inviteSomeone = async () => {
    setMaking(true);
    const res = await fetch("/api/invites", { method: "POST" }).catch(() => null);
    const data = (res ? await res.json().catch(() => ({})) : {}) as { invite?: Invite; error?: string };
    setMaking(false);
    if (!res?.ok || !data.invite) return toast(data.error ?? "Couldn't make a link — are you online?");
    setLinks((l) => [data.invite!, ...l]);
    const how = await share(inviteUrl(data.invite.id));
    if (how === "copied") toast("Invite link copied — paste it in a message");
    else if (how === "failed") toast("Your link is ready below");
  };

  if (!enabled)
    return (
      <Card>
        <SectionTitle>People</SectionTitle>
        <p className="text-[13px] leading-relaxed text-muted">
          Invite friends to their own private Alexander and race them in the Arena. This needs the site online with{" "}
          <code className="rounded bg-surface-3 px-1 font-mono text-[12px] text-fg">ALEXANDER_PASSWORD</code> set and a database connected.
        </p>
      </Card>
    );

  const link = typeof window === "undefined" ? "" : `${window.location.origin}/login`;
  const message = invite ? `Join me on Alexander: ${link}\nName: ${invite.name}\nPassword: ${invite.password}` : "";

  return (
    <Card>
      <SectionTitle>People</SectionTitle>
      <p className="-mt-2 mb-4 text-[13px] leading-relaxed text-muted">
        Everyone you invite gets their own private Alexander — their own tasks, habits and journal. In the Arena you see each other&apos;s daily completion, never the tasks.
      </p>

      <Button onClick={inviteSomeone} disabled={making} className="w-full">
        <Share2 className="size-4" /> {making ? "Making a link…" : "Invite someone"}
      </Button>
      <p className="mt-2 text-center text-[11.5px] text-faint">Send the link however you like. They choose their own name and password. Each link works once, for 7 days.</p>

      {links.length > 0 && (
        <ul className="mt-4 space-y-2">
          {links.map((l) => (
            <li key={l.id} className="rounded-xl bg-surface-2 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Link2 className="size-3.5 shrink-0 text-faint" />
                <span className="min-w-0 flex-1 text-[12.5px] text-muted">
                  Open invite · {daysLeft(l.expiresAt)} day{daysLeft(l.expiresAt) === 1 ? "" : "s"} left
                </span>
                <button
                  aria-label="Cancel this invite"
                  onClick={async () => {
                    await fetch(`/api/invites?id=${encodeURIComponent(l.id)}`, { method: "DELETE" }).catch(() => null);
                    setLinks((all) => all.filter((x) => x.id !== l.id));
                  }}
                  className="hit flex size-7 items-center justify-center rounded-full text-faint transition-colors hover:text-danger"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              {/* The link itself, selectable, for when there's no share sheet. */}
              <p className="mt-1.5 text-[12px] break-all text-faint select-all">{inviteUrl(l.id)}</p>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(inviteUrl(l.id));
                      toast("Invite link copied");
                    } catch {
                      toast("Select the link above and copy it");
                    }
                  }}
                >
                  <Copy className="size-3.5" /> Copy
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const how = await share(inviteUrl(l.id));
                    if (how === "copied") toast("Invite link copied");
                    else if (how === "failed") toast("Select the link above and copy it");
                  }}
                >
                  <Share2 className="size-3.5" /> Send
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {people && people.length > 0 && (
        <ul className="mb-5 divide-y divide-line">
          {people.map((p) => (
            <li key={p.id} className="flex items-center gap-2 py-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[13px] font-semibold uppercase">{p.name.slice(0, 1)}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] break-words">{p.name}</span>
                <span className="block text-[11.5px] text-faint">Added {new Date(p.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>
              </span>
              <Button
                size="sm"
                variant="ghost"
                aria-label={`New password for ${p.name}`}
                onClick={async () => {
                  const next = await promptDialog(`New password for ${p.name}`, { detail: "They'll be signed out everywhere and use this from now on.", defaultValue: suggest() });
                  if (!next) return;
                  const { ok, data } = await send("PATCH", { id: p.id, password: next });
                  if (!ok) return toast(data.error ?? "Couldn't change it");
                  setInvite({ name: p.name, password: next });
                  setCopied(false);
                }}
              >
                <KeyRound className="size-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Remove ${p.name}`}
                className="hover:text-danger"
                onClick={async () => {
                  if (!(await confirmDialog(`Remove ${p.name}?`, { detail: "Their account and all their data are deleted. This can't be undone.", danger: true, confirmLabel: "Remove" }))) return;
                  const { ok, data } = await send("DELETE", undefined, `?id=${encodeURIComponent(p.id)}`);
                  if (!ok) return toast(data.error ?? "Couldn't remove them");
                  setPeople((list) => (list ?? []).filter((x) => x.id !== p.id));
                }}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <details className="group mt-5 border-t border-line pt-4">
        <summary className="cursor-pointer list-none text-[12.5px] text-faint transition-colors hover:text-fg [&::-webkit-details-marker]:hidden">
          <UserPlus className="mr-1.5 inline size-3.5 align-[-2px]" /> Or set their name and password yourself
        </summary>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          const { ok, data } = await send("POST", { name, password });
          if (!ok || !data.person) return setError(data.error ?? "Couldn't add them.");
          setPeople((list) => [...(list ?? []), data.person!]);
          setInvite({ name: data.person.name, password });
          setCopied(false);
          setName("");
          setPassword(suggest());
        }}
        className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Their name" aria-label="Their name" autoCapitalize="words" />
        <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="A password for them" aria-label="Their password" autoComplete="off" />
        <Button type="submit" disabled={!name.trim() || password.length < 6}>
          <UserPlus className="size-4" /> Add
        </Button>
      </form>
      {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}
      </details>

      {invite && (
        <div className="animate-fade mt-4 rounded-xl bg-surface-2 p-3.5">
          <p className="text-[12px] text-faint">Send this to {invite.name}:</p>
          <pre className="mt-1.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words font-sans">{message}</pre>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(message);
                  setCopied(true);
                } catch {
                  toast("Couldn't copy — select the text instead");
                }
              }}
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? "Copied" : "Copy"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setInvite(null)}>
              Done
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function AccountCard({ name }: { name: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <Card>
      <SectionTitle>Your account</SectionTitle>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[14px]">
          Signed in as <span className="font-medium">{name}</span>
        </p>
        <Button size="sm" variant="outline" onClick={signOut}>
          Sign out
        </Button>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await fetch("/api/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current, next }) }).catch(() => null);
          const data = (res ? await res.json().catch(() => ({})) : { error: "You're offline." }) as { error?: string };
          setMessage(res?.ok ? { ok: true, text: "Password changed. Other devices will ask you to sign in again." } : { ok: false, text: data.error ?? "Couldn't change it." });
          if (res?.ok) {
            setCurrent("");
            setNext("");
          }
        }}
        className="mt-5 grid gap-2 border-t border-line pt-5 sm:grid-cols-[1fr_1fr_auto]"
      >
        <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Current password" aria-label="Current password" autoComplete="current-password" />
        <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="New password" aria-label="New password" autoComplete="new-password" />
        <Button type="submit" variant="outline" disabled={!current || next.length < 6}>
          Change
        </Button>
      </form>
      {message && <p className={`mt-2 text-[12px] ${message.ok ? "text-success" : "text-danger"}`}>{message.text}</p>}
    </Card>
  );
}
