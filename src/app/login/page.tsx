"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Statue } from "@/components/brand";
import { Button, Input } from "@/components/ui";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-6">
      <form
        className="animate-sheet relative w-full max-w-xs text-center"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(false);
          const res = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
          });
          if (res.ok) {
            window.location.replace("/");
            return;
          }
          setBusy(false);
          setError(true);
          setPassword("");
        }}
      >
        <Statue priority className="mx-auto mb-6 h-36 w-auto" />
        <h1 className="text-[28px] leading-none font-semibold tracking-tight">Alexander</h1>
        <p className="mt-1 mb-8 text-[13px] text-muted">Private. Enter your password to continue.</p>
        <Input
          autoFocus
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="h-11 text-center"
        />
        {error && <p className="mt-2 text-[12px] text-danger">Wrong password.</p>}
        <Button className="mt-4 w-full" disabled={!password || busy}>
          {busy ? "Checking…" : "Enter"} <ArrowRight className="size-4" />
        </Button>
      </form>
    </div>
  );
}
