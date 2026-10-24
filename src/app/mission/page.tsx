"use client";

import { CalendarClock, ImagePlus, Plus, Target, Trash2, Trophy } from "lucide-react";
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
  SectionTitle,
  StepList,
  StoredImage,
  Textarea,
} from "@/components/ui";
import { daysBetween, formatShort, toKey } from "@/lib/date";
import { deleteImages } from "@/lib/images";
import { useClock, useStore } from "@/lib/store";
import type { Goal } from "@/lib/types";
import { cn, pct } from "@/lib/utils";

export default function MissionPage() {
  const settings = useStore((s) => s.settings);
  const goals = useStore((s) => s.goals);
  const addGoal = useStore((s) => s.addGoal);
  const [editingMission, setEditingMission] = useState(false);
  const [openGoal, setOpenGoal] = useState<string | null>(null);
  const [newGoal, setNewGoal] = useState("");

  const active = goals.filter((g) => !g.achieved);
  const achieved = goals.filter((g) => g.achieved);

  return (
    <div className="animate-rise">
      <PageHeader title="Mission" subtitle="Know what you are conquering, and see it every day." />

      <Card className="mb-6">
        <SectionTitle>
          <span className="flex items-center gap-1.5">
            <Trophy className="size-3.5 text-accent" /> My mission
          </span>
        </SectionTitle>
        <button onClick={() => setEditingMission(true)} className="block w-full text-left" title="Edit mission & vision">
          {settings.mission ? (
            <p className="font-serif text-2xl leading-snug whitespace-pre-wrap sm:text-3xl">{settings.mission}</p>
          ) : (
            <p className="font-serif text-2xl text-muted">Tap to write your mission…</p>
          )}
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
            <ImagePlus className="size-3.5" /> Tap to edit and add vision images
          </p>
        </button>
        {settings.missionImages.length > 0 && (
          <div className="mt-5">
            <ImageGrid ids={settings.missionImages} />
          </div>
        )}
      </Card>

      <SectionTitle>Goals</SectionTitle>
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newGoal.trim()) return;
          setOpenGoal(addGoal({ title: newGoal.trim() }));
          setNewGoal("");
        }}
      >
        <Input value={newGoal} onChange={(e) => setNewGoal(e.target.value)} placeholder="A goal worth fighting for…" />
        <Button aria-label="Add goal" disabled={!newGoal.trim()}>
          <Plus className="size-4" />
        </Button>
      </form>

      {active.length === 0 && achieved.length === 0 ? (
        <Empty icon={<Target className="size-5" />} title="No goals yet" hint="Break your mission into goals. Add images to make each one vivid." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {active.map((g) => (
            <GoalCard key={g.id} goal={g} onOpen={() => setOpenGoal(g.id)} />
          ))}
        </div>
      )}

      {achieved.length > 0 && (
        <div className="mt-8">
          <SectionTitle>Conquered · {achieved.length}</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {achieved.map((g) => (
              <GoalCard key={g.id} goal={g} onOpen={() => setOpenGoal(g.id)} />
            ))}
          </div>
        </div>
      )}

      <MissionModal open={editingMission} onClose={() => setEditingMission(false)} />
      {openGoal && <GoalModal id={openGoal} onClose={() => setOpenGoal(null)} />}
    </div>
  );
}

function GoalCard({ goal, onOpen }: { goal: Goal; onOpen: () => void }) {
  const today = useClock((s) => s.today);
  const progress = pct(goal.steps.filter((s) => s.done).length, goal.steps.length);
  const left = goal.deadline ? daysBetween(today, goal.deadline) : null;

  return (
    <button onClick={onOpen} className="group text-left">
      <Card className={cn("h-full overflow-hidden p-0 transition group-hover:border-accent/40 sm:p-0", goal.achieved && "opacity-70")}>
        {goal.images[0] && <StoredImage id={goal.images[0]} className="h-36 w-full" />}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium">{goal.title}</h3>
            {goal.achieved && <Trophy className="size-4 shrink-0 text-accent" />}
          </div>
          {goal.why && <p className="mt-1 line-clamp-2 text-sm text-muted">{goal.why}</p>}
          <div className="mt-3 flex items-center gap-3 text-[11px] text-muted">
            {goal.steps.length > 0 && (
              <span>
                {goal.steps.filter((s) => s.done).length}/{goal.steps.length} steps
              </span>
            )}
            {left !== null && !goal.achieved && (
              <span className={cn("flex items-center gap-1", left < 0 && "text-danger", left >= 0 && left <= 7 && "text-accent")}>
                <CalendarClock className="size-3" />
                {left < 0 ? `${-left}d overdue` : left === 0 ? "Due today" : `${left}d left`}
              </span>
            )}
            {goal.images.length > 1 && <span>{goal.images.length} images</span>}
          </div>
          {goal.steps.length > 0 && <ProgressBar value={progress} className="mt-2" />}
        </div>
      </Card>
    </button>
  );
}

function MissionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  return (
    <Modal open={open} onClose={onClose} title="Mission & vision" wide>
      <Textarea
        rows={6}
        autoFocus
        defaultValue={settings.mission}
        onBlur={(e) => updateSettings({ mission: e.target.value })}
        placeholder="Write your whole mission. Who are you becoming? What will your life look like?"
        className="font-serif text-xl leading-snug"
      />
      <p className="mt-5 mb-2 text-xs font-medium text-muted">Vision board</p>
      <ImageUploadButton
        className="mb-3 h-20 w-full"
        onAdd={(ids) => updateSettings({ missionImages: [...useStore.getState().settings.missionImages, ...ids] })}
      />
      <ImageGrid
        ids={settings.missionImages}
        onRemove={(id) => {
          deleteImages([id]);
          updateSettings({ missionImages: settings.missionImages.filter((x) => x !== id) });
        }}
      />
      <Button className="mt-4 w-full" onClick={onClose}>
        Done
      </Button>
    </Modal>
  );
}

function GoalModal({ id, onClose }: { id: string; onClose: () => void }) {
  const goal = useStore((s) => s.goals.find((g) => g.id === id));
  const updateGoal = useStore((s) => s.updateGoal);
  const deleteGoal = useStore((s) => s.deleteGoal);
  if (!goal) return null;

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={
        <input
          defaultValue={goal.title}
          onBlur={(e) => e.target.value.trim() && updateGoal(id, { title: e.target.value.trim() })}
          className="w-full bg-transparent font-serif text-2xl outline-none"
        />
      }
    >
      <div className="space-y-5">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">Why this matters</span>
          <Textarea
            rows={3}
            defaultValue={goal.why}
            onBlur={(e) => updateGoal(id, { why: e.target.value })}
            placeholder="The reason that will keep you going on hard days."
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">Deadline</span>
          <Input type="date" value={goal.deadline ?? ""} onChange={(e) => updateGoal(id, { deadline: e.target.value || undefined })} />
        </label>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-muted">Visualise it</span>
          <ImageUploadButton
            className="mb-3 h-20 w-full"
            onAdd={(ids) => updateGoal(id, { images: [...(useStore.getState().goals.find((g) => g.id === id)?.images ?? []), ...ids] })}
          />
          <ImageGrid
            ids={goal.images}
            onRemove={(img) => {
              deleteImages([img]);
              updateGoal(id, { images: goal.images.filter((x) => x !== img) });
            }}
          />
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-muted">Milestones</span>
          <StepList steps={goal.steps} onChange={(steps) => updateGoal(id, { steps })} placeholder="Add a milestone…" />
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-line pt-4">
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (confirm(`Delete “${goal.title}”?`)) {
                deleteGoal(id);
                onClose();
              }
            }}
          >
            <Trash2 className="size-3.5" /> Delete
          </Button>
          <Button
            variant={goal.achieved ? "outline" : "primary"}
            onClick={() => updateGoal(id, { achieved: !goal.achieved, achievedAt: goal.achieved ? undefined : Date.now() })}
          >
            <Trophy className="size-4" /> {goal.achieved ? "Mark as active" : "Mark conquered"}
          </Button>
        </div>
        {goal.achievedAt && <p className="text-center text-xs text-muted">Conquered on {formatShort(toKey(new Date(goal.achievedAt)))}</p>}
      </div>
    </Modal>
  );
}
