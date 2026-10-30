"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { AsciiStatue } from "@/components/AsciiStatue";
import { Button, Input } from "@/components/ui";

/**
 * Opened from an invite link (/join#code): choose a name and a password, and you're in. The code
 * sits after the #, so it never travels to the server in a page request or lands in its logs.
 */
export default function JoinPage() {
  const [state, setState] = useState<{ ok: boolean; token?: string; from?: string | null; error?: string } | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const token = window.location.hash.slice(1);
    fetch(`/api/join?token=${encodeURIComponent(token)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((res: { ok: boolean; from?: string | null; error?: string }) => setState({ ...res, token }))
      .catch(() => setState({ ok: false, error: "Couldn't reach Alexander. Check your connection and open the link again." }));
  }, []);

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-6 py-10">
      <div className="animate-sheet relative w-full max-w-xs text-center">
        <AsciiStatue size={5} className="mx-auto mb-6" />
        <h1 className="text-[28px] leading-none font-semibold tracking-tight" lang="grc">
          Ἀλέξανδρος
        </h1>

        {!state && <p className="mt-6 text-[13px] text-faint">Opening your invite…</p>}

        {state && !state.ok && <p className="mt-6 text-[14px] leading-relaxed text-muted">{state.error}</p>}

        {state?.ok && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const res = await fetch("/api/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: state.token, name, password }),
              }).catch(() => null);
              if (res?.ok) {
                window.location.replace("/");
                return;
              }
              const body = (res ? await res.json().catch(() => ({})) : { error: "You're offline." }) as { error?: string };
              setError(body.error ?? "Couldn't join.");
              setBusy(false);
            }}
          >
            <p className="mt-2 mb-8 text-[13.5px] leading-relaxed text-muted">
              {state.from ? `${state.from} invited you` : "You're invited"} — your own private command center, and a seat in the Arena.
            </p>
            <Input autoFocus autoCapitalize="words" autoComplete="username" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" aria-label="Your name" className="mb-2 h-11 text-center" />
            <Input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Choose a password"
              aria-label="Choose a password"
              className="h-11 text-center"
            />
            <p className="mt-2 text-[11.5px] text-faint">At least 6 characters. You&apos;ll sign in with your name and this password.</p>
            {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}
            <Button className="mt-4 w-full" disabled={!name.trim() || password.length < 6 || busy}>
              {busy ? "Joining…" : "Join"} <ArrowRight className="size-4" />
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
