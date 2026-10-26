"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { PasscodeSetup } from "./Lock";
import { Statue } from "./brand";
import { Button, Input, Textarea } from "./ui";

export function Onboarding() {
  const { updateSettings, addMission } = useStore.getState();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [mission, setMission] = useState("");

  // Name is saved last: it is what marks onboarding as finished.
  const finish = () => {
    if (mission.trim() && useStore.getState().missions.length === 0) addMission(mission.trim());
    updateSettings({ name: name.trim() });
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-6">
      <div key={step} className="animate-sheet relative w-full max-w-sm">
        <Statue priority className="mb-8 h-28 w-auto" />
        <p className="mb-2 font-mono text-[11px] text-faint">{step + 1} / 3</p>

        {step === 0 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) setStep(1);
            }}
          >
            <p className="text-sm text-muted">I am Alexander, your personal command center.</p>
            <h1 className="mt-2 mb-8 text-[28px] leading-tight font-semibold tracking-tight">What should I call you?</h1>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="h-11" />
            <Button className="mt-4 w-full" disabled={!name.trim()}>
              Continue <ArrowRight className="size-4" />
            </Button>
          </form>
        )}

        {step === 1 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setStep(2);
            }}
          >
            <p className="text-sm text-muted">Welcome, {name.trim()}.</p>
            <h1 className="mt-2 mb-8 text-[28px] leading-tight font-semibold tracking-tight">What is your mission?</h1>
            <Textarea
              autoFocus
              rows={4}
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              placeholder="The life you are building, in your own words. You can add more missions later."
            />
            <Button className="mt-4 w-full">
              {mission.trim() ? "Continue" : "Skip for now"} <ArrowRight className="size-4" />
            </Button>
          </form>
        )}

        {step === 2 && (
          <div>
            <p className="text-sm text-muted">Only you get in.</p>
            <h1 className="mt-2 mb-3 text-[28px] leading-tight font-semibold tracking-tight">Set a passcode</h1>
            <p className="mb-6 text-[13px] leading-relaxed text-muted">
              Alexander will ask for it every time it opens, and again after 5 minutes in the background.
            </p>
            <PasscodeSetup onDone={finish} />
            <button onClick={finish} className="mt-4 w-full text-center text-[12px] text-faint hover:text-muted">
              Skip — set it later in Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
