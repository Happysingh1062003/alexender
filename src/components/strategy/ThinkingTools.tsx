"use client";

import { ArrowDown, Plus, X } from "lucide-react";
import { useState } from "react";
import { QUESTION_COUNT, QUESTION_GROUPS, type Assumption, type Strategy } from "@/lib/strategy";
import { cn, uid } from "@/lib/utils";
import { IconButton, Input } from "../ui";
import { Choice, Field, Grow, ToolIntro } from "./parts";

type Set = (patch: Partial<Strategy>) => void;

/** Where you are, where you're going, and why it truly matters. */
export function Overview({ s, set }: { s: Strategy; set: Set }) {
  // Ask "why?" again and again; the next question appears once the last is answered.
  const whys = s.whys.length && s.whys[s.whys.length - 1]?.trim() && s.whys.length < 5 ? [...s.whys, ""] : s.whys.length ? s.whys : [""];
  return (
    <div className="space-y-7">
      <Field label="What does winning look like?" hint="Describe the result, not the activity.">
        <Grow value={s.objective ?? ""} onChange={(e) => set({ objective: e.target.value })} placeholder="By the end of next year, I…" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Where I am now">
          <Grow value={s.current ?? ""} onChange={(e) => set({ current: e.target.value })} placeholder="Honest starting point" />
        </Field>
        <Field label="Where I want to be">
          <Grow value={s.desired ?? ""} onChange={(e) => set({ desired: e.target.value })} placeholder="The end state" />
        </Field>
      </div>
      <Field label="By when">
        <Input type="date" value={s.deadline ?? ""} onChange={(e) => set({ deadline: e.target.value || undefined })} className="h-10 w-auto" />
      </Field>
      <div>
        <p className="text-[13px] font-medium">Why does it matter?</p>
        <p className="mb-3 text-[12px] text-faint">Ask why, then why again — up to five times — until you reach the real reason.</p>
        <ol className="space-y-1.5">
          {whys.map((w, i) => (
            <li key={i}>
              {i > 0 && <ArrowDown className="mx-auto mb-1.5 size-3.5 text-faint" />}
              <div className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-[12px] text-faint">Why {i + 1}</span>
                <Input
                  value={w}
                  onChange={(e) => {
                    const next = [...whys];
                    next[i] = e.target.value;
                    while (next.length > 1 && !next[next.length - 1].trim() && !next[next.length - 2]?.trim()) next.pop();
                    set({ whys: next });
                  }}
                  placeholder={i === 0 ? "Because…" : "And why is that important?"}
                  className="h-10"
                />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/** A bank of strategic questions, answered in your own words. */
export function Questions({ s, set }: { s: Strategy; set: Set }) {
  const [text, setText] = useState("");
  const answered = Object.values(s.answers).filter((a) => a.trim()).length + s.myQuestions.filter((q) => q.answer?.trim()).length;
  const answer = (id: string, value: string) => set({ answers: { ...s.answers, [id]: value } });
  return (
    <div>
      <ToolIntro>
        Good strategy starts with good questions. Answer the ones that matter for this challenge — skip the rest.{" "}
        <span className="text-faint tabular-nums">
          {answered} of {QUESTION_COUNT + s.myQuestions.length} answered
        </span>
      </ToolIntro>
      <div className="space-y-10">
        {QUESTION_GROUPS.map((g) => (
          <section key={g.title}>
            <h3 className="text-[14px] font-semibold">{g.title}</h3>
            <p className="mb-4 text-[12px] text-faint">{g.hint}</p>
            <div className="space-y-4">
              {g.questions.map((q) => (
                <Field key={q.id} label={q.text}>
                  <Grow value={s.answers[q.id] ?? ""} onChange={(e) => answer(q.id, e.target.value)} placeholder="Your answer" />
                </Field>
              ))}
            </div>
          </section>
        ))}
        <section>
          <h3 className="text-[14px] font-semibold">Your questions</h3>
          <p className="mb-4 text-[12px] text-faint">The questions only you would think to ask.</p>
          <div className="space-y-4">
            {s.myQuestions.map((q) => (
              <div key={q.id} className="group">
                <div className="mb-1.5 flex items-start gap-2">
                  <p className="min-w-0 flex-1 text-[13px] font-medium">{q.text}</p>
                  <IconButton
                    label="Remove question"
                    onClick={() => set({ myQuestions: s.myQuestions.filter((x) => x.id !== q.id) })}
                    className="size-7 hover:text-danger sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <X className="size-3.5" />
                  </IconButton>
                </div>
                <Grow
                  value={q.answer ?? ""}
                  onChange={(e) => set({ myQuestions: s.myQuestions.map((x) => (x.id === q.id ? { ...x, answer: e.target.value } : x)) })}
                  placeholder="Your answer"
                />
              </div>
            ))}
          </div>
          <form
            className="mt-4 flex items-center gap-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim()) return;
              set({ myQuestions: [...s.myQuestions, { id: uid(), text: text.trim() }] });
              setText("");
            }}
          >
            <Plus className="size-3.5 shrink-0 text-faint" />
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add a question"
              enterKeyHint="done"
              className="h-10 min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-faint"
            />
          </form>
        </section>
      </div>
    </div>
  );
}

const STATUS: { value: Assumption["status"]; label: string }[] = [
  { value: "untested", label: "Untested" },
  { value: "confirmed", label: "Confirmed" },
  { value: "wrong", label: "Wrong" },
];

/** What must be true for the plan to work — and which of it you actually know. */
export function Assumptions({ s, set }: { s: Strategy; set: Set }) {
  const [text, setText] = useState("");
  const update = (id: string, patch: Partial<Assumption>) => set({ assumptions: s.assumptions.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
  const untested = s.assumptions.filter((a) => a.kind === "assumption" && a.status === "untested").length;
  return (
    <div>
      <ToolIntro>
        List what must be true for this strategy to work. Mark each as something you <em>know</em> or something you only <em>believe</em> — then test the beliefs before betting on them.
        {untested > 0 && <span className="text-faint"> {untested} still untested.</span>}
      </ToolIntro>
      <ul className="space-y-3">
        {s.assumptions.map((a) => (
          <li key={a.id} className={cn("group rounded-2xl border p-4 transition-colors", a.status === "wrong" ? "border-danger/40" : a.status === "confirmed" ? "border-success/40" : "border-line")}>
            <div className="flex items-start gap-2">
              <input
                value={a.text}
                onChange={(e) => update(a.id, { text: e.target.value })}
                className={cn("min-w-0 flex-1 bg-transparent text-[14.5px] font-medium outline-none", a.status === "wrong" && "text-faint line-through")}
              />
              <IconButton label="Remove" onClick={() => set({ assumptions: s.assumptions.filter((x) => x.id !== a.id) })} className="size-7 hover:text-danger sm:opacity-0 sm:group-hover:opacity-100">
                <X className="size-3.5" />
              </IconButton>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Choice
                label="Fact or assumption"
                value={a.kind}
                onChange={(kind) => update(a.id, { kind })}
                options={[
                  { value: "fact", label: "I know this" },
                  { value: "assumption", label: "I believe this" },
                ]}
              />
              {a.kind === "assumption" && <Choice label="Status" value={a.status} onChange={(status) => update(a.id, { status })} options={STATUS} />}
            </div>
            {a.kind === "assumption" && (
              <input
                value={a.test ?? ""}
                onChange={(e) => update(a.id, { test: e.target.value || undefined })}
                placeholder="How could I test this cheaply?"
                className="mt-3 h-9 w-full rounded-lg bg-surface-2 px-3 text-[13px] outline-none placeholder:text-faint"
              />
            )}
          </li>
        ))}
      </ul>
      <form
        className="mt-4 flex items-center gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          set({ assumptions: [...s.assumptions, { id: uid(), text: text.trim(), kind: "assumption", status: "untested" }] });
          setText("");
        }}
      >
        <Plus className="size-3.5 shrink-0 text-faint" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Something that must be true…"
          enterKeyHint="done"
          className="h-10 min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-faint"
        />
      </form>
    </div>
  );
}
