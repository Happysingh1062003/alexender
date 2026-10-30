"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { AsciiStatue } from "@/components/AsciiStatue";
import { Button, Input } from "@/components/ui";

export default function LoginPage() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-6">
      <form
        className="animate-sheet relative w-full max-w-xs text-center"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          const res = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, password }),
          });
          if (res.ok) {
            window.location.replace("/");
            return;
          }
          setBusy(false);
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setError(body.error ?? "Wrong password.");
          setPassword("");
        }}
      >
        <AsciiStatue size={5.2} className="mx-auto mb-6" />
        <h1 className="text-[28px] leading-none font-semibold tracking-tight" lang="grc">Ἀλέξανδρος</h1>
        <p className="mt-1 mb-8 text-[13px] text-muted">Private. Sign in to continue.</p>
        <Input
          autoFocus
          autoComplete="username"
          autoCapitalize="none"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          aria-label="Your name"
          className="mb-2 h-11 text-center"
        />
        <Input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          aria-label="Password"
          className="h-11 text-center"
        />
        {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}
        <Button className="mt-4 w-full" disabled={!password || busy}>
          {busy ? "Checking…" : "Enter"} <ArrowRight className="size-4" />
        </Button>
      </form>
    </div>
  );
}
