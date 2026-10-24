"use client";

import { CalendarClock, CalendarPlus, ImagePlus, Map as MapIcon, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  Button,
  Card,
  Empty,
  ImageGrid,
  ImageUploadButton,
  Input,
  Modal,
  PageHeader,
  ProgressBar,
  Segmented,
  StepList,
  StoredImage,
  Textarea,
} from "@/components/ui";
import { daysBetween } from "@/lib/date";
import { deleteImages } from "@/lib/images";
import { useClock, useStore } from "@/lib/store";
import type { Plan, PlanStatus } from "@/lib/types";
import { cn, pct } from "@/lib/utils";

const COLUMNS: { status: PlanStatus; label: string; hint: string }[] = [
  { status: "idea", label: "Ideas", hint: "Dream it" },
  { status: "active", label: "In motion", hint: "Build it" },
  { status: "done", label: "Done", hint: "Conquered" },
];

export default function PlansPage() {
  const plans = useStore((s) => s.plans);
  const addPlan = useStore((s) => s.addPlan);
  const [title, setTitle] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [mobileCol, setMobileCol] = useState<PlanStatus>(() => (plans.some((p) => p.status === "active") ? "active" : "idea"));

  return (
    <div className="animate-rise">
      <PageHeader title="Plans" subtitle="Visualise anything — a trip, a project, a new life chapter." />

      <form
        className="mb-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          setOpen(addPlan({ title: title.trim(), status: "idea" }));
          setMobileCol("idea");
          setTitle("");
        }}
      >
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What do you want to plan?" />
        <Button aria-label="Create plan" disabled={!title.trim()}>
          <Plus className="size-4" />
        </Button>
      </form>

      {plans.length === 0 ? (
        <Empty icon={<MapIcon className="size-5" />} title="No plans yet" hint="Give each plan a cover image, steps and a target date. Send steps straight into your day." />
      ) : (
        <>
          <div className="mb-4 md:hidden">
            <Segmented
              value={mobileCol}
              onChange={setMobileCol}
              options={COLUMNS.map((c) => ({ value: c.status, label: `${c.label} · ${plans.filter((p) => p.status === c.status).length}` }))}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {COLUMNS.map((col) => {
              const items = plans.filter((p) => p.status === col.status);
              return (
                <section key={col.status} className={cn(col.status !== mobileCol && "hidden md:block")}>
                  <div className="mb-3 hidden items-baseline justify-between md:flex">
                    <h2 className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">
                      {col.label} · {items.length}
                    </h2>
                    <span className="text-[11px] text-muted">{col.hint}</span>
                  </div>
                  <div className="space-y-3">
                    {items.map((p) => (
                      <PlanCard key={p.id} plan={p} onOpen={() => setOpen(p.id)} />
                    ))}
                    {items.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-line py-8 text-center text-xs text-muted">Empty</div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}

      {open && <PlanModal id={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function PlanCard({ plan, onOpen }: { plan: Plan; onOpen: () => void }) {
  const today = useClock((s) => s.today);
  const done = plan.steps.filter((s) => s.done).length;
  const left = plan.targetDate ? daysBetween(today, plan.targetDate) : null;
  return (
    <button onClick={onOpen} className="group block w-full text-left">
      <Card className="overflow-hidden p-0 transition group-hover:border-accent/40 sm:p-0">
        {plan.coverId && <StoredImage id={plan.coverId} className="h-32 w-full" />}
        <div className="p-4">
          <h3 className="font-medium">{plan.title}</h3>
          {plan.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{plan.description}</p>}
          <div className="mt-3 flex items-center gap-3 text-[11px] text-muted">
            {plan.steps.length > 0 && (
              <span>
                {done}/{plan.steps.length} steps
              </span>
            )}
            {left !== null && plan.status !== "done" && (
              <span className={cn("flex items-center gap-1", left < 0 && "text-danger")}>
                <CalendarClock className="size-3" />
                {left < 0 ? `${-left}d overdue` : `${left}d left`}
              </span>
            )}
            {plan.images.length > 0 && <span>{plan.images.length} images</span>}
          </div>
          {plan.steps.length > 0 && <ProgressBar value={pct(done, plan.steps.length)} className="mt-2" />}
        </div>
      </Card>
    </button>
  );
}

function PlanModal({ id, onClose }: { id: string; onClose: () => void }) {
  const plan = useStore((s) => s.plans.find((p) => p.id === id));
  const today = useClock((s) => s.today);
  const { updatePlan, deletePlan, addTask } = useStore.getState();
  const [sent, setSent] = useState(false);
  if (!plan) return null;
  const nextStep = plan.steps.find((s) => !s.done);

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={
        <input
          defaultValue={plan.title}
          onBlur={(e) => e.target.value.trim() && updatePlan(id, { title: e.target.value.trim() })}
          className="w-full bg-transparent font-serif text-2xl outline-none"
        />
      }
    >
      <div className="space-y-5">
        {plan.coverId ? (
          <div className="group relative overflow-hidden rounded-2xl">
            <StoredImage id={plan.coverId} className="h-44 w-full" />
            <ImageUploadButton
              multiple={false}
              plain
              className="absolute right-2 bottom-2 bg-black/60 px-3 py-1.5 text-xs text-white"
              onAdd={([img]) => {
                if (plan.coverId) deleteImages([plan.coverId]);
                updatePlan(id, { coverId: img });
              }}
            >
              <ImagePlus className="size-3.5" /> Change cover
            </ImageUploadButton>
          </div>
        ) : (
          <ImageUploadButton multiple={false} className="h-24 w-full" onAdd={([img]) => updatePlan(id, { coverId: img })}>
            <ImagePlus className="size-4" /> Add a cover image
          </ImageUploadButton>
        )}

        <Segmented
          value={plan.status}
          onChange={(status) => updatePlan(id, { status })}
          options={COLUMNS.map((c) => ({ value: c.status, label: c.label }))}
        />

        <Textarea
          rows={3}
          defaultValue={plan.description}
          onBlur={(e) => updatePlan(id, { description: e.target.value })}
          placeholder="Describe the plan — what does success look like?"
        />

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">Target date</span>
          <Input type="date" value={plan.targetDate ?? ""} onChange={(e) => updatePlan(id, { targetDate: e.target.value || undefined })} />
        </label>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Steps</span>
            {nextStep && (
              <button
                disabled={sent}
                onClick={() => {
                  addTask({ title: `${nextStep.title} · ${plan.title}`, date: today, priority: "high" });
                  setSent(true);
                }}
                className="flex items-center gap-1 text-xs font-medium text-accent disabled:text-muted"
              >
                <CalendarPlus className="size-3.5" /> {sent ? "Added to today ✓" : "Do next step today"}
              </button>
            )}
          </div>
          <StepList steps={plan.steps} onChange={(steps) => updatePlan(id, { steps })} />
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-muted">Visual board</span>
          <ImageUploadButton
            className="mb-3 h-16 w-full"
            onAdd={(ids) => updatePlan(id, { images: [...(useStore.getState().plans.find((p) => p.id === id)?.images ?? []), ...ids] })}
          />
          <ImageGrid
            ids={plan.images}
            onRemove={(img) => {
              deleteImages([img]);
              updatePlan(id, { images: plan.images.filter((x) => x !== img) });
            }}
          />
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">Notes</span>
          <Textarea rows={4} defaultValue={plan.notes} onBlur={(e) => updatePlan(id, { notes: e.target.value })} placeholder="Budget, links, ideas…" />
        </label>

        <div className="flex justify-between border-t border-line pt-4">
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (confirm(`Delete “${plan.title}”?`)) {
                deletePlan(id);
                onClose();
              }
            }}
          >
            <Trash2 className="size-3.5" /> Delete plan
          </Button>
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
