"use client";

import { useState } from "react";
import Link from "next/link";
import { VisionBoard } from "@/components/VisionBoard";
import { daysBetween } from "@/lib/date";
import { byOrder, useClock, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type Open = { kind: "mission" | "goal"; id: string } | null;

/** Pure words. Tap one to see it — its images, one at a time. Adding and editing live in Settings. */
export default function MissionPage() {
  const missions = useStore((s) => s.missions);
  const goals = useStore((s) => s.goals);
  const [open, setOpen] = useState<Open>(null);

  const sortedMissions = [...missions].sort(byOrder);
  // Active goals first (in your order), conquered ones after.
  const sortedGoals = [...goals].sort(
    (a, b) => Number(a.achieved) - Number(b.achieved) || byOrder(a, b),
  );

  return (
    <div className="mx-auto max-w-4xl pt-10 text-center sm:pt-16">
      {missions.length === 0 && goals.length === 0 && (
        <p className="text-[15px] text-faint">
          Add your missions and goals in{" "}
          <Link
            href="/settings#missions"
            className="text-muted underline underline-offset-4 hover:text-fg"
          >
            Settings
          </Link>
          .
        </p>
      )}

      <ul className="stagger space-y-12 sm:space-y-16">
        {sortedMissions.map((m, i) => (
          <li key={m.id} style={{ ["--i" as string]: i }}>
            <button
              onClick={() => setOpen({ kind: "mission", id: m.id })}
              className="text-[32px] leading-[1.1] font-semibold tracking-[-0.025em] text-balance transition-[opacity,transform] duration-300 hover:opacity-75 active:scale-[0.99] sm:text-[52px]"
            >
              {m.text}
            </button>
          </li>
        ))}
      </ul>

      {sortedGoals.length > 0 && (
        <>
          <ul
            className={cn(
              "stagger space-y-6 pb-10 sm:space-y-8",
              missions.length > 0 && "mt-20 sm:mt-28",
            )}
          >
            {sortedGoals.map((g, i) => (
              <li key={g.id} style={{ ["--i" as string]: i }}>
                <button
                  onClick={() => setOpen({ kind: "goal", id: g.id })}
                  className={cn(
                    "text-[23px] leading-snug font-medium tracking-tight text-balance text-muted transition-colors duration-300 hover:text-fg sm:text-[30px]",
                    g.achieved && "text-faint line-through decoration-1",
                  )}
                >
                  {g.title}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {open?.kind === "mission" && (
        <MissionBoard id={open.id} onClose={() => setOpen(null)} />
      )}
      {open?.kind === "goal" && (
        <GoalBoard id={open.id} onClose={() => setOpen(null)} />
      )}
    </div>
  );
}

function MissionBoard({ id, onClose }: { id: string; onClose: () => void }) {
  const mission = useStore((s) => s.missions.find((m) => m.id === id));
  const updateMission = useStore((s) => s.updateMission);
  if (!mission) return null;
  return (
    <VisionBoard
      label="Mission"
      title={mission.text}
      images={mission.images}
      onAddImages={(ids) =>
        updateMission(id, {
          images: [
            ...(useStore.getState().missions.find((m) => m.id === id)?.images ??
              []),
            ...ids,
          ],
        })
      }
      onClose={onClose}
    />
  );
}

function GoalBoard({ id, onClose }: { id: string; onClose: () => void }) {
  const goal = useStore((s) => s.goals.find((g) => g.id === id));
  const today = useClock((s) => s.today);
  const updateGoal = useStore((s) => s.updateGoal);
  if (!goal) return null;
  const left = goal.deadline ? daysBetween(today, goal.deadline) : null;

  return (
    <VisionBoard
      label={goal.achieved ? "Conquered" : "Goal"}
      title={goal.title}
      images={goal.images}
      onAddImages={(ids) =>
        updateGoal(id, {
          images: [
            ...(useStore.getState().goals.find((g) => g.id === id)?.images ??
              []),
            ...ids,
          ],
        })
      }
      onClose={onClose}
    >
      {goal.why && <p className="max-w-2xl">{goal.why}</p>}
      {left !== null && !goal.achieved && (
        <p
          className={cn(
            "mt-2 font-mono text-[12px]",
            left < 0 ? "text-danger" : "text-crystal",
          )}
        >
          {left < 0
            ? `${-left} days overdue`
            : left === 0
              ? "Due today"
              : `${left} days left`}
        </p>
      )}
    </VisionBoard>
  );
}
