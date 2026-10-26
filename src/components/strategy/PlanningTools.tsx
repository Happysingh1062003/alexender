"use client";

import { CalendarPlus, Plus, Trophy, X } from "lucide-react";
import { useState } from "react";
import { useClock, useStore } from "@/lib/store";
import { optionScore, riskScore, type PlanPhase, type Risk, type Strategy, type StrategyOption } from "@/lib/strategy";
import { cn, uid } from "@/lib/utils";
import { Checkbox, EditableText, IconButton, ProgressBar, toast } from "../ui";
import { Choice, Field, Grow, ItemList, ToolIntro } from "./parts";

type Set = (patch: Partial<Strategy>) => void;

function AddLine({ placeholder, onAdd }: { placeholder: string; onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <form
      className="flex items-center gap-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onAdd(text.trim());
        setText("");
      }}
    >
      <Plus className="size-3.5 shrink-0 text-faint" />
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        enterKeyHint="done"
        className="h-10 min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-faint"
      />
    </form>
  );
}

// ---------- SWOT ----------

const QUADRANTS = [
  { key: "s", title: "Strengths", hint: "What you have that others don't", color: "var(--success)" },
  { key: "w", title: "Weaknesses", hint: "Where you are exposed", color: "var(--danger)" },
  { key: "o", title: "Opportunities", hint: "Openings you could use", color: "var(--crystal)" },
  { key: "t", title: "Threats", hint: "What could hurt you", color: "#d6b46a" },
] as const;

/** Strengths, weaknesses, opportunities, threats — then turned into moves. */
export function Swot({ s, set }: { s: Strategy; set: Set }) {
  const moves = s.swot.moves;
  const setMove = (key: keyof typeof moves, value: string) => set({ swot: { ...s.swot, moves: { ...moves, [key]: value } } });
  return (
    <div>
      <ToolIntro>See the whole field at once — then use it. The moves below turn the four lists into actions.</ToolIntro>
      <div className="grid gap-3 sm:grid-cols-2">
        {QUADRANTS.map((q) => (
          <section key={q.key} className="rounded-2xl border border-line p-4">
            <h3 className="flex items-center gap-2 text-[14px] font-semibold">
              <span className="size-2 rounded-full" style={{ background: q.color }} /> {q.title}
            </h3>
            <p className="mb-2 text-[12px] text-faint">{q.hint}</p>
            <ItemList items={s.swot[q.key]} dot={q.color} onChange={(items) => set({ swot: { ...s.swot, [q.key]: items } })} placeholder="Add…" />
          </section>
        ))}
      </div>
      <h3 className="mt-10 text-[14px] font-semibold">Turn it into moves</h3>
      <p className="mb-4 text-[12px] text-faint">Strategy is matching what you have to what the field offers.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Attack" hint="Use a strength to seize an opportunity">
          <Grow value={moves.so ?? ""} onChange={(e) => setMove("so", e.target.value)} />
        </Field>
        <Field label="Defend" hint="Use a strength to blunt a threat">
          <Grow value={moves.st ?? ""} onChange={(e) => setMove("st", e.target.value)} />
        </Field>
        <Field label="Build" hint="Fix a weakness to unlock an opportunity">
          <Grow value={moves.wo ?? ""} onChange={(e) => setMove("wo", e.target.value)} />
        </Field>
        <Field label="Avoid" hint="Where a weakness meets a threat — stay out">
          <Grow value={moves.wt ?? ""} onChange={(e) => setMove("wt", e.target.value)} />
        </Field>
      </div>
    </div>
  );
}

// ---------- Options (decision matrix) ----------

/** Weigh what matters, score each option against it, and see which wins. */
export function Options({ s, set }: { s: Strategy; set: Set }) {
  const ranked = [...s.options].map((o) => ({ o, score: optionScore(o, s.criteria) })).sort((a, b) => b.score - a.score);
  const best = ranked[0]?.score ? ranked[0].o.id : null;
  const setScore = (option: StrategyOption, criterion: string, value: number) =>
    set({ options: s.options.map((o) => (o.id === option.id ? { ...o, scores: { ...o.scores, [criterion]: value } } : o)) });

  return (
    <div>
      <ToolIntro>
        List your options and what matters in choosing. Give each criterion a weight (how much it matters), score every option 0–5, and let the numbers argue with your gut.
      </ToolIntro>
      <div className="grid gap-6 sm:grid-cols-2">
        <section>
          <h3 className="mb-2 text-[13px] font-medium">Options</h3>
          <ul>
            {s.options.map((o) => (
              <li key={o.id} className="group flex min-h-9 items-center gap-2">
                <EditableText value={o.name} onSave={(name) => name && set({ options: s.options.map((x) => (x.id === o.id ? { ...x, name } : x)) })} className="min-w-0 flex-1 text-[14px]" />
                <IconButton label="Remove option" onClick={() => set({ options: s.options.filter((x) => x.id !== o.id) })} className="size-8 hover:text-danger sm:opacity-0 sm:group-hover:opacity-100">
                  <X className="size-3.5" />
                </IconButton>
              </li>
            ))}
          </ul>
          <AddLine placeholder="Add an option" onAdd={(name) => set({ options: [...s.options, { id: uid(), name, scores: {} }] })} />
        </section>
        <section>
          <h3 className="mb-2 text-[13px] font-medium">What matters</h3>
          <ul>
            {s.criteria.map((c) => (
              <li key={c.id} className="group flex min-h-9 flex-wrap items-center gap-2 py-0.5">
                <EditableText value={c.name} onSave={(name) => name && set({ criteria: s.criteria.map((x) => (x.id === c.id ? { ...x, name } : x)) })} className="min-w-0 flex-1 text-[14px]" />
                <Choice
                  label={`Weight of ${c.name}`}
                  value={c.weight}
                  onChange={(weight) => set({ criteria: s.criteria.map((x) => (x.id === c.id ? { ...x, weight } : x)) })}
                  options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: `×${n}` }))}
                />
                <IconButton label="Remove criterion" onClick={() => set({ criteria: s.criteria.filter((x) => x.id !== c.id) })} className="size-8 hover:text-danger sm:opacity-0 sm:group-hover:opacity-100">
                  <X className="size-3.5" />
                </IconButton>
              </li>
            ))}
          </ul>
          <AddLine placeholder="Add a criterion (cost, speed, risk…)" onAdd={(name) => set({ criteria: [...s.criteria, { id: uid(), name, weight: 3 }] })} />
        </section>
      </div>

      {s.options.length > 0 && s.criteria.length > 0 && (
        <div className="mt-8 -mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-[480px] border-separate border-spacing-0 text-[13px]">
            <thead>
              <tr>
                <th className="py-2 pr-3 text-left font-medium text-faint">Option</th>
                {s.criteria.map((c) => (
                  <th key={c.id} className="px-1 py-2 text-center font-medium text-faint">
                    {c.name} <span className="text-faint/70">×{c.weight}</span>
                  </th>
                ))}
                <th className="py-2 pl-3 text-right font-medium text-faint">Score</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map(({ o, score }) => (
                <tr key={o.id} className={cn(o.id === best && "bg-crystal-soft")}>
                  <td className="rounded-l-xl py-2.5 pr-3 pl-2 font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      {o.id === best && <Trophy className="size-3.5 text-crystal" />}
                      {o.name}
                    </span>
                  </td>
                  {s.criteria.map((c) => (
                    <td key={c.id} className="px-1 py-2 text-center">
                      <select
                        value={o.scores[c.id] ?? 0}
                        onChange={(e) => setScore(o, c.id, Number(e.target.value))}
                        aria-label={`${o.name} — ${c.name}`}
                        className="h-8 rounded-md border border-line bg-surface px-1.5 text-center tabular-nums outline-none focus:border-line-strong"
                      >
                        {[0, 1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </td>
                  ))}
                  <td className="rounded-r-xl py-2 pr-2 pl-3 text-right">
                    <span className={cn("text-[15px] font-semibold tabular-nums", o.id === best && "text-crystal")}>{score}</span>
                    <span className="text-faint">%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------- Risks (pre-mortem) ----------

const LEVELS = [
  { value: 1 as const, label: "Low" },
  { value: 2 as const, label: "Med" },
  { value: 3 as const, label: "High" },
];

/** Imagine it already failed. Why? Rate each reason and decide how to prevent it. */
export function Risks({ s, set }: { s: Strategy; set: Set }) {
  const update = (id: string, patch: Partial<Risk>) => set({ risks: s.risks.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const sorted = [...s.risks].sort((a, b) => riskScore(b) - riskScore(a));
  return (
    <div>
      <ToolIntro>
        A pre-mortem: picture a year from now — this strategy has failed. Write down why. Then rate how likely and how damaging each reason is, and decide what you&apos;ll do about the worst ones now.
      </ToolIntro>

      {/* Where the risks sit: likelihood up, impact across. */}
      {s.risks.length > 0 && (
        <div className="mb-8 flex items-end gap-3">
          <div className="grid grid-cols-3 gap-1">
            {[3, 2, 1].flatMap((l) =>
              [1, 2, 3].map((i) => {
                const count = s.risks.filter((r) => r.likelihood === l && r.impact === i).length;
                const heat = l * i;
                return (
                  <div
                    key={`${l}-${i}`}
                    title={`Likelihood ${l}, impact ${i}`}
                    className="flex size-10 items-center justify-center rounded-lg text-[12px] tabular-nums"
                    style={{ background: `color-mix(in oklab, var(--danger) ${heat * 9}%, var(--surface-2))` }}
                  >
                    {count || ""}
                  </div>
                );
              }),
            )}
          </div>
          <p className="pb-1 text-[11px] leading-relaxed text-faint">
            ↑ more likely
            <br />→ more damaging
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {sorted.map((r) => {
          const score = riskScore(r);
          return (
            <li key={r.id} className="group rounded-2xl border border-line p-4">
              <div className="flex items-start gap-2">
                <span
                  className="mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums"
                  style={{ background: `color-mix(in oklab, var(--danger) ${score * 9}%, var(--surface-2))` }}
                >
                  {score}
                </span>
                <input value={r.text} onChange={(e) => update(r.id, { text: e.target.value })} aria-label="Risk" className="min-w-0 flex-1 bg-transparent text-[14.5px] font-medium outline-none" />
                <IconButton label="Remove risk" onClick={() => set({ risks: s.risks.filter((x) => x.id !== r.id) })} className="size-7 hover:text-danger sm:opacity-0 sm:group-hover:opacity-100">
                  <X className="size-3.5" />
                </IconButton>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-faint">
                <span className="flex items-center gap-2">
                  Likelihood <Choice label="Likelihood" value={r.likelihood} onChange={(likelihood) => update(r.id, { likelihood })} options={LEVELS} />
                </span>
                <span className="flex items-center gap-2">
                  Impact <Choice label="Impact" value={r.impact} onChange={(impact) => update(r.id, { impact })} options={LEVELS} />
                </span>
              </div>
              <input
                value={r.mitigation ?? ""}
                onChange={(e) => update(r.id, { mitigation: e.target.value || undefined })}
                placeholder="What I'll do to prevent or soften it"
                className="mt-3 h-9 w-full rounded-lg bg-surface-2 px-3 text-[13px] outline-none placeholder:text-faint"
              />
            </li>
          );
        })}
      </ul>
      <div className="mt-4">
        <AddLine placeholder="It failed because…" onAdd={(text) => set({ risks: [...s.risks, { id: uid(), text, likelihood: 2, impact: 2 }] })} />
      </div>
    </div>
  );
}

// ---------- Plan ----------

/** Phases and steps, with the next action always in view — and one tap to put it on Today. */
export function Plan({ s, set }: { s: Strategy; set: Set }) {
  const today = useClock((x) => x.today);
  const addTask = useStore((x) => x.addTask);
  const steps = s.phases.flatMap((p) => p.steps);
  const done = steps.filter((x) => x.done).length;
  const next = s.phases.flatMap((p) => p.steps.map((step) => ({ phase: p, step }))).find(({ step }) => !step.done);
  const setPhase = (id: string, patch: Partial<PlanPhase>) => set({ phases: s.phases.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

  const toToday = (text: string) => {
    addTask({ title: text, date: today });
    toast("Added to Today");
  };

  return (
    <div>
      <ToolIntro>Break the strategy into phases, and each phase into concrete steps. The next undone step is always shown at the top — send it to Today when you&apos;re ready.</ToolIntro>

      {steps.length > 0 && (
        <div className="mb-8">
          <div className="flex items-baseline justify-between text-[12px] text-faint">
            <span>Progress</span>
            <span className="tabular-nums">
              {done}/{steps.length} steps
            </span>
          </div>
          <ProgressBar value={(done / steps.length) * 100} tone="crystal" className="mt-1.5" />
          {next && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-crystal/40 bg-crystal-soft px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-faint">Next action · {next.phase.title}</p>
                <p className="mt-0.5 text-[14.5px] font-medium">{next.step.text}</p>
              </div>
              <button
                onClick={() => toToday(next.step.text)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line-strong bg-bg px-3 py-1.5 text-[12px] font-medium transition-colors hover:border-faint"
              >
                <CalendarPlus className="size-3.5" /> Today
              </button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        {s.phases.map((p, i) => {
          const pDone = p.steps.filter((x) => x.done).length;
          return (
            <section key={p.id} className="group/phase rounded-2xl border border-line p-4">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-[11px] text-faint tabular-nums">Phase {i + 1}</span>
                <span className="flex-1" />
                <span className="text-[11px] text-faint tabular-nums">
                  {pDone}/{p.steps.length}
                </span>
                <IconButton
                  label="Remove phase"
                  onClick={() => (p.steps.length === 0 || confirm(`Remove “${p.title}” and its steps?`)) && set({ phases: s.phases.filter((x) => x.id !== p.id) })}
                  className="size-7 hover:text-danger sm:opacity-0 sm:group-hover/phase:opacity-100"
                >
                  <X className="size-3.5" />
                </IconButton>
              </div>
              <EditableText value={p.title} onSave={(title) => title && setPhase(p.id, { title })} className="text-[15px] font-semibold" />
              <ul className="mt-2">
                {p.steps.map((step) => (
                  <li key={step.id} className="group/step flex min-h-10 items-center gap-3">
                    <Checkbox size="sm" checked={step.done} label={step.text} onChange={() => setPhase(p.id, { steps: p.steps.map((x) => (x.id === step.id ? { ...x, done: !x.done } : x)) })} />
                    <EditableText
                      value={step.text}
                      onSave={(text) => text && setPhase(p.id, { steps: p.steps.map((x) => (x.id === step.id ? { ...x, text } : x)) })}
                      className={cn("min-w-0 flex-1 text-[14px] leading-snug", step.done && "text-faint line-through")}
                    />
                    {!step.done && (
                      <IconButton label="Add to Today" onClick={() => toToday(step.text)} className="size-7 sm:opacity-0 sm:group-hover/step:opacity-100">
                        <CalendarPlus className="size-3.5" />
                      </IconButton>
                    )}
                    <IconButton
                      label="Remove step"
                      onClick={() => setPhase(p.id, { steps: p.steps.filter((x) => x.id !== step.id) })}
                      className="size-7 hover:text-danger sm:opacity-0 sm:group-hover/step:opacity-100"
                    >
                      <X className="size-3" />
                    </IconButton>
                  </li>
                ))}
              </ul>
              <AddLine placeholder="Add a step" onAdd={(text) => setPhase(p.id, { steps: [...p.steps, { id: uid(), text, done: false }] })} />
            </section>
          );
        })}
      </div>
      <div className="mt-4">
        <AddLine
          placeholder={s.phases.length ? "Add a phase" : "First phase — e.g. Foundation"}
          onAdd={(title) => set({ phases: [...s.phases, { id: uid(), title, steps: [] }] })}
        />
      </div>
    </div>
  );
}
