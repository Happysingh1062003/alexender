"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { Button, EditableText, Input } from "@/components/ui";
import { VisionBoard } from "@/components/VisionBoard";
import { daysBetween } from "@/lib/date";
import { deleteImages } from "@/lib/images";
import { useClock, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type Open = { kind: "mission" | "goal"; id: string } | null;

export default function MissionPage() {
  const missions = useStore((s) => s.missions);
  const goals = useStore((s) => s.goals);
  const [open, setOpen] = useState<Open>(null);

  // Active goals first, conquered ones after.
  const sortedGoals = [...goals].sort((a, b) => Number(a.achieved) - Number(b.achieved));

  return (
    <div className="mx-auto max-w-4xl pt-8 text-center sm:pt-16">
      {missions.length === 0 && goals.length === 0 && (
        <p className="pt-20 text-[15px] text-faint">
          Add your missions and goals in{" "}
          <Link href="/settings" className="text-muted underline underline-offset-4 hover:text-fg">
            Settings
          </Link>
          .
        </p>
      )}

      <ul className="space-y-12 sm:space-y-16">
        {missions.map((m) => (
          <li key={m.id}>
            <button
              onClick={() => setOpen({ kind: "mission", id: m.id })}
              className="text-[34px] leading-[1.12] font-semibold tracking-tight text-balance transition-opacity hover:opacity-75 sm:text-[56px]"
            >
              {m.text}
            </button>
          </li>
        ))}
      </ul>

      {sortedGoals.length > 0 && (
        <ul className={cn("space-y-6 pb-10 sm:space-y-8", missions.length > 0 && "mt-20 border-t border-line pt-16 sm:mt-28 sm:pt-20")}>
          {sortedGoals.map((g) => (
            <li key={g.id}>
              <button
                onClick={() => setOpen({ kind: "goal", id: g.id })}
                className={cn(
                  "text-[22px] leading-snug font-medium tracking-tight text-balance text-muted transition-colors hover:text-fg sm:text-[30px]",
                  g.achieved && "text-faint line-through decoration-1",
                )}
              >
                {g.title}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open?.kind === "mission" && <MissionBoard id={open.id} onClose={() => setOpen(null)} />}
      {open?.kind === "goal" && <GoalBoard id={open.id} onClose={() => setOpen(null)} />}
    </div>
  );
}

function MissionBoard({ id, onClose }: { id: string; onClose: () => void }) {
  const mission = useStore((s) => s.missions.find((m) => m.id === id));
  const { updateMission, deleteMission } = useStore.getState();
  if (!mission) return null;
  return (
    <VisionBoard
      label="Mission"
      title={mission.text}
      onTitleChange={(text) => updateMission(id, { text })}
      images={mission.images}
      onAddImages={(ids) => updateMission(id, { images: [...(useStore.getState().missions.find((m) => m.id === id)?.images ?? []), ...ids] })}
      onRemoveImage={(img) => {
        deleteImages([img]);
        updateMission(id, { images: mission.images.filter((x) => x !== img) });
      }}
      onDelete={() => {
        if (confirm("Delete this mission and its images?")) {
          deleteMission(id);
          onClose();
        }
      }}
      onClose={onClose}
    />
  );
}

function GoalBoard({ id, onClose }: { id: string; onClose: () => void }) {
  const goal = useStore((s) => s.goals.find((g) => g.id === id));
  const today = useClock((s) => s.today);
  const { updateGoal, deleteGoal } = useStore.getState();
  if (!goal) return null;
  const left = goal.deadline ? daysBetween(today, goal.deadline) : null;

  return (
    <VisionBoard
      label="Goal"
      title={goal.title}
      onTitleChange={(title) => updateGoal(id, { title })}
      images={goal.images}
      onAddImages={(ids) => updateGoal(id, { images: [...(useStore.getState().goals.find((g) => g.id === id)?.images ?? []), ...ids] })}
      onRemoveImage={(img) => {
        deleteImages([img]);
        updateGoal(id, { images: goal.images.filter((x) => x !== img) });
      }}
      onDelete={() => {
        if (confirm(`Delete “${goal.title}”?`)) {
          deleteGoal(id);
          onClose();
        }
      }}
      onClose={onClose}
    >
      <EditableText
        value={goal.why}
        placeholder="Why does this matter? Tap to write."
        onSave={(why) => updateGoal(id, { why })}
        className="max-w-2xl text-[15px] leading-relaxed text-muted"
      />
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          variant={goal.achieved ? "outline" : "primary"}
          onClick={() => updateGoal(id, { achieved: !goal.achieved, achievedAt: goal.achieved ? undefined : Date.now() })}
        >
          <Check className="size-3.5" /> {goal.achieved ? "Conquered" : "Mark conquered"}
        </Button>
        <label className="flex items-center gap-2 text-[12px] text-faint">
          Deadline
          <Input
            type="date"
            value={goal.deadline ?? ""}
            onChange={(e) => updateGoal(id, { deadline: e.target.value || undefined })}
            className="h-8 w-auto px-2 text-[12px]"
          />
        </label>
        {left !== null && !goal.achieved && (
          <span className={cn("text-[12px]", left < 0 ? "text-danger" : "text-faint")}>
            {left < 0 ? `${-left} days overdue` : left === 0 ? "Due today" : `${left} days left`}
          </span>
        )}
      </div>
    </VisionBoard>
  );
}
