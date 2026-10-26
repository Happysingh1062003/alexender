"use client";

import { ChevronDown, Plus, X } from "lucide-react";
import { useState } from "react";
import { SortableList } from "@/components/Sortable";
import { Checkbox, EditableText, IconButton, ProgressBar, SectionTop, toast } from "@/components/ui";
import { byOrder, useStore } from "@/lib/store";
import type { Plan } from "@/lib/types";
import { cn, uid } from "@/lib/utils";

/** Plan anything: a trip, a launch, a week. Each plan has steps to tick off and free notes. */
export default function PlansPage() {
  const plans = useStore((s) => s.plans);
  const { addPlan, reorder } = useStore.getState();
  const [open, setOpen] = useState<Set<string>>(new Set());
  const sorted = [...plans].sort(byOrder);

  const toggle = (id: string) =>
    setOpen((o) => {
      const next = new Set(o);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="mx-auto max-w-xl">
      <SectionTop
        actions={[
          {
            label: "Add plan",
            placeholder: "Trip to Japan",
            onAdd: (title) => {
              const id = addPlan(title);
              setOpen((o) => new Set(o).add(id));
            },
          },
        ]}
      />

      {plans.length === 0 && (
        <p className="mx-auto max-w-sm text-center text-[15px] leading-relaxed text-faint">
          Plan anything — a trip, a launch, a week. Break it into steps and keep your notes beside them.
        </p>
      )}

      <SortableList items={sorted} onReorder={(ids) => reorder("plans", ids)} className="space-y-3">
        {(plan, handle) => <PlanCard plan={plan} handle={handle} open={open.has(plan.id)} onToggle={() => toggle(plan.id)} />}
      </SortableList>
    </div>
  );
}

function PlanCard({ plan, handle, open, onToggle }: { plan: Plan; handle: React.ReactNode; open: boolean; onToggle: () => void }) {
  const { updatePlan, deletePlan, restore } = useStore.getState();
  const done = plan.steps.filter((s) => s.done).length;
  const total = plan.steps.length;

  const remove = () => {
    if (total > 0 && !confirm(`Delete “${plan.title}” and its ${total} step${total === 1 ? "" : "s"}?`)) return;
    deletePlan(plan.id);
    toast("Plan deleted", { label: "Undo", run: () => restore("plans", plan) });
  };

  return (
    <div className={cn("group rounded-2xl border transition-colors duration-200", open ? "border-line-strong bg-surface" : "border-line hover:bg-surface")}>
      <div className="flex items-center gap-2 px-2 py-2">
        <div className="flex w-7 shrink-0 justify-center pointer-coarse:hidden sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">{handle}</div>
        <div className="ml-1 min-w-0 flex-1 py-1 pointer-coarse:ml-2">
          <EditableText value={plan.title} onSave={(t) => t && updatePlan(plan.id, { title: t })} className="line-clamp-2 text-[15px] leading-snug font-medium" />
          {total > 0 && (
            <div className="mt-1.5 flex items-center gap-2">
              <ProgressBar value={(done / total) * 100} tone="crystal" className="max-w-24" />
              <span className="text-[11px] text-faint tabular-nums">
                {done}/{total}
              </span>
            </div>
          )}
        </div>
        <IconButton label="Delete plan" onClick={remove} className="hover:text-danger sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100">
          <X className="size-3.5" />
        </IconButton>
        <IconButton label={open ? "Collapse" : "Open plan"} aria-expanded={open} onClick={onToggle}>
          <ChevronDown className={cn("size-4 transition-transform duration-300", open && "rotate-180")} />
        </IconButton>
      </div>
      {open && <PlanBody plan={plan} />}
    </div>
  );
}

function PlanBody({ plan }: { plan: Plan }) {
  const updatePlan = useStore((s) => s.updatePlan);
  const [step, setStep] = useState("");
  const [note, setNote] = useState(plan.note ?? "");
  const setSteps = (steps: Plan["steps"]) => updatePlan(plan.id, { steps });

  return (
    <div className="animate-fade border-t border-line px-4 pt-3 pb-4">
      <ul>
        {plan.steps.map((s) => (
          <li key={s.id} className="group/step flex min-h-10 items-center gap-3">
            <Checkbox size="sm" checked={s.done} label={s.text} onChange={() => setSteps(plan.steps.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))} />
            <EditableText
              value={s.text}
              onSave={(text) => text && setSteps(plan.steps.map((x) => (x.id === s.id ? { ...x, text } : x)))}
              className={cn("min-w-0 flex-1 text-[14px] leading-snug", s.done && "text-faint line-through")}
            />
            <IconButton
              label="Remove step"
              onClick={() => setSteps(plan.steps.filter((x) => x.id !== s.id))}
              className="size-7 hover:text-danger sm:opacity-0 sm:group-hover/step:opacity-100 sm:focus-visible:opacity-100"
            >
              <X className="size-3" />
            </IconButton>
          </li>
        ))}
      </ul>
      <form
        className="mt-1 flex items-center gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!step.trim()) return;
          setSteps([...plan.steps, { id: uid(), text: step.trim(), done: false }]);
          setStep("");
        }}
      >
        <Plus className="size-4 shrink-0 text-faint" />
        <input
          value={step}
          onChange={(e) => setStep(e.target.value)}
          placeholder="Add a step"
          enterKeyHint="done"
          className="h-10 min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-faint"
        />
      </form>
      <textarea
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          updatePlan(plan.id, { note: e.target.value.trim() ? e.target.value : undefined });
        }}
        rows={Math.max(2, note.split("\n").length)}
        placeholder="Notes, ideas, links…"
        className="mt-3 block w-full resize-none rounded-xl bg-surface-2 px-3 py-2.5 text-[13.5px] leading-relaxed text-fg outline-none placeholder:text-faint [field-sizing:content] focus:ring-1 focus:ring-line-strong"
      />
    </div>
  );
}
