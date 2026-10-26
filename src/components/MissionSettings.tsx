"use client";

import { ChevronRight, ImagePlus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { deleteImages } from "@/lib/images";
import { byOrder, useStore } from "@/lib/store";
import type { Goal, Mission } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SortableList } from "./Sortable";
import { Button, Card, ImageUploadButton, Input, Modal, SectionTitle, StoredImage, Textarea } from "./ui";

type Editing = { kind: "mission" | "goal"; id: string } | null;

/** The only place missions and goals are added, edited, reordered and have images removed. Edits save as you type. */
export function MissionsAndGoals() {
  const missions = useStore((s) => s.missions);
  const goals = useStore((s) => s.goals);
  const { addMission, addGoal, reorder } = useStore.getState();
  const [editing, setEditing] = useState<Editing>(null);

  const sortedMissions = [...missions].sort(byOrder);
  const sortedGoals = [...goals].sort(byOrder);

  return (
    <Card id="missions" className="scroll-mt-20">
      <SectionTitle>Missions & goals</SectionTitle>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <Column label="Missions" placeholder="Add a mission" onAdd={addMission}>
          <SortableList items={sortedMissions} onReorder={(ids) => reorder("missions", ids)}>
            {(m, handle) => <Row handle={handle} text={m.text} images={m.images} onOpen={() => setEditing({ kind: "mission", id: m.id })} />}
          </SortableList>
        </Column>
        <Column label="Goals" placeholder="Add a goal" onAdd={(title) => addGoal({ title })}>
          <SortableList items={sortedGoals} onReorder={(ids) => reorder("goals", ids)}>
            {(g, handle) => <Row handle={handle} text={g.title} done={g.achieved} images={g.images} onOpen={() => setEditing({ kind: "goal", id: g.id })} />}
          </SortableList>
        </Column>
      </div>
      <p className="mt-5 text-[12px] leading-relaxed text-faint">Drag ⋮⋮ to change the order on the Mission page. Tap one to edit its words or manage its images.</p>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.kind === "goal" ? "Goal" : "Mission"}>
        {editing?.kind === "mission" && <MissionEditor key={editing.id} id={editing.id} onDone={() => setEditing(null)} />}
        {editing?.kind === "goal" && <GoalEditor key={editing.id} id={editing.id} onDone={() => setEditing(null)} />}
      </Modal>
    </Card>
  );
}

function Column({ label, placeholder, onAdd, children }: { label: string; placeholder: string; onAdd: (text: string) => void; children: React.ReactNode }) {
  const [text, setText] = useState("");
  return (
    <div>
      <p className="mb-2 text-[12px] text-faint">{label}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          onAdd(text.trim());
          setText("");
        }}
      >
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={`${placeholder}, then Enter`} enterKeyHint="done" />
      </form>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Row({ handle, text, images, done, onOpen }: { handle: React.ReactNode; text: string; images: string[]; done?: boolean; onOpen: () => void }) {
  return (
    <div className="group -mx-2 flex items-center gap-1.5 rounded-xl px-1 transition-colors hover:bg-surface-2">
      {handle}
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2 py-2.5 text-left text-[14px]">
        <span className={cn("min-w-0 flex-1 truncate", done && "text-faint line-through")}>{text}</span>
        {images.length > 0 && <span className="shrink-0 font-mono text-[11px] text-faint">{images.length} img</span>}
        <ChevronRight className="size-3.5 shrink-0 text-faint" />
      </button>
    </div>
  );
}

/** Thumbnails with a remove button each, plus upload. */
function ImagesEditor({ images, onChange }: { images: string[]; onChange: (images: string[]) => void }) {
  return (
    <div>
      <p className="mb-2 text-[12px] text-faint">Images · {images.length}</p>
      <div className="grid grid-cols-3 gap-2">
        {images.map((img) => (
          <div key={img} className="relative aspect-square overflow-hidden rounded-xl">
            <StoredImage id={img} className="size-full" />
            <button
              aria-label="Remove image"
              onClick={() => {
                if (!confirm("Remove this image?")) return;
                deleteImages([img]);
                onChange(images.filter((x) => x !== img));
              }}
              className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur transition-colors hover:bg-danger"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        <ImageUploadButton onAdd={(ids) => onChange([...images, ...ids])} className="aspect-square flex-col gap-1 text-[11px]">
          <ImagePlus className="size-5" />
          Add
        </ImageUploadButton>
      </div>
    </div>
  );
}

function MissionEditor({ id, onDone }: { id: string; onDone: () => void }) {
  const mission = useStore((s) => s.missions.find((m) => m.id === id));
  const { updateMission, deleteMission } = useStore.getState();
  if (!mission) return null;
  const set = (patch: Partial<Mission>) => updateMission(id, patch);
  return (
    <div className="space-y-6">
      <Textarea
        aria-label="Mission"
        rows={3}
        defaultValue={mission.text}
        onChange={(e) => e.target.value.trim() && set({ text: e.target.value.trim() })}
        className="text-[18px] leading-snug font-medium tracking-tight"
      />
      <ImagesEditor images={mission.images} onChange={(images) => set({ images })} />
      <DeleteButton
        label="Delete mission"
        onDelete={() => {
          if (!confirm("Delete this mission and all its images?")) return;
          deleteMission(id);
          onDone();
        }}
      />
    </div>
  );
}

function GoalEditor({ id, onDone }: { id: string; onDone: () => void }) {
  const goal = useStore((s) => s.goals.find((g) => g.id === id));
  const { updateGoal, deleteGoal } = useStore.getState();
  if (!goal) return null;
  const set = (patch: Partial<Goal>) => updateGoal(id, patch);
  return (
    <div className="space-y-6">
      <Input
        aria-label="Goal"
        defaultValue={goal.title}
        onChange={(e) => e.target.value.trim() && set({ title: e.target.value.trim() })}
        className="h-12 text-[17px]"
      />
      <label className="block">
        <span className="mb-1.5 block text-[12px] text-faint">Why it matters</span>
        <Textarea rows={3} defaultValue={goal.why} onChange={(e) => set({ why: e.target.value.trim() })} placeholder="The reason you will not give up on it" />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-[12px] text-faint">
          Deadline
          <Input type="date" value={goal.deadline ?? ""} onChange={(e) => set({ deadline: e.target.value || undefined })} className="h-9 w-auto px-2 text-[13px]" />
        </label>
        <Button size="sm" variant={goal.achieved ? "outline" : "primary"} onClick={() => set({ achieved: !goal.achieved, achievedAt: goal.achieved ? undefined : Date.now() })}>
          {goal.achieved ? "Conquered ✓" : "Mark conquered"}
        </Button>
      </div>
      <ImagesEditor images={goal.images} onChange={(images) => set({ images })} />
      <DeleteButton
        label="Delete goal"
        onDelete={() => {
          if (!confirm(`Delete “${goal.title}” and all its images?`)) return;
          deleteGoal(id);
          onDone();
        }}
      />
    </div>
  );
}

function DeleteButton({ label, onDelete }: { label: string; onDelete: () => void }) {
  return (
    <div className="border-t border-line pt-4">
      <Button variant="danger" size="sm" onClick={onDelete}>
        <Trash2 className="size-3.5" /> {label}
      </Button>
    </div>
  );
}
