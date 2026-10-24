"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Logo } from "./Logo";
import { Button, Input, Textarea } from "./ui";

export function Onboarding() {
  const updateSettings = useStore((s) => s.updateSettings);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [mission, setMission] = useState("");

  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div className="animate-rise w-full max-w-sm">
        <Logo className="mb-8 size-12" />
        {step === 0 ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) setStep(1);
            }}
          >
            <p className="text-sm text-muted">I am Alexender, your personal command center.</p>
            <h1 className="mt-2 mb-8 font-serif text-4xl leading-tight">What should I call you?</h1>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            <Button className="mt-4 w-full" disabled={!name.trim()}>
              Continue <ArrowRight className="size-4" />
            </Button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateSettings({ name: name.trim(), mission: mission.trim() });
            }}
          >
            <p className="text-sm text-muted">Welcome, {name.trim()}.</p>
            <h1 className="mt-2 mb-8 font-serif text-4xl leading-tight">What is your mission?</h1>
            <Textarea
              autoFocus
              rows={5}
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              placeholder="The life you are building, in your own words. You can refine it any time."
            />
            <Button className="mt-4 w-full">
              {mission.trim() ? "Begin the conquest" : "Skip for now"} <ArrowRight className="size-4" />
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
