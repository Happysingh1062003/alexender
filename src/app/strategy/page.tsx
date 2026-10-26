"use client";

import { ChevronRight, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MindMap } from "@/components/strategy/MindMap";
import { useStrategy } from "@/components/strategy/parts";
import { Options, Plan, Risks, Swot } from "@/components/strategy/PlanningTools";
import { Assumptions, Overview, Questions } from "@/components/strategy/ThinkingTools";
import { IconButton, ProgressBar, SectionTop, toast } from "@/components/ui";
import { byOrder, useStore } from "@/lib/store";
import { strategyProgress, type Strategy } from "@/lib/strategy";
import { useBackToClose } from "@/lib/useBackToClose";
import { cn } from "@/lib/utils";

const TOOLS = [
  { id: "overview", label: "Overview", Tool: Overview },
  { id: "questions", label: "Questions", Tool: Questions },
  { id: "map", label: "Map", Tool: MindMap },
  { id: "swot", label: "SWOT", Tool: Swot },
  { id: "options", label: "Options", Tool: Options },
  { id: "risks", label: "Risks", Tool: Risks },
  { id: "plan", label: "Plan", Tool: Plan },
  { id: "assumptions", label: "Assumptions", Tool: Assumptions },
] as const;
type ToolId = (typeof TOOLS)[number]["id"];

/** Strategy workspaces — one per challenge, each with the full set of thinking tools. */
export default function StrategyPage() {
  const strategies = useStore((s) => s.strategies);
  const addStrategy = useStore((s) => s.addStrategy);
  const [open, setOpen] = useState<string | null>(null);
  const sorted = [...strategies].sort(byOrder);

  return (
    <div className="mx-auto max-w-2xl">
      <SectionTop
        actions={[
          {
            label: "New strategy",
            placeholder: "The challenge — e.g. Launch my company",
            onAdd: (title) => setOpen(addStrategy(title)),
          },
        ]}
      />

      {strategies.length === 0 && (
        <div className="mx-auto max-w-md text-center">
          <p className="text-[15px] leading-relaxed text-faint">Think a challenge all the way through: question it, map it, weigh the options, imagine the failure, then plan the moves.</p>
          <p className="mt-6 text-[12px] leading-relaxed text-faint/80">Overview · Questions · Map · SWOT · Options · Risks · Plan · Assumptions</p>
        </div>
      )}

      <ul className="space-y-3">
        {sorted.map((s) => (
          <li key={s.id}>
            <StrategyCard s={s} onOpen={() => setOpen(s.id)} />
          </li>
        ))}
      </ul>

      {open && <Workspace id={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function StrategyCard({ s, onOpen }: { s: Strategy; onOpen: () => void }) {
  const p = strategyProgress(s);
  return (
    <button onClick={onOpen} className="flex w-full items-center gap-4 rounded-2xl border border-line px-5 py-4 text-left transition-colors hover:bg-surface active:bg-surface">
      <div className="min-w-0 flex-1">
        <p className="text-[16px] leading-snug font-semibold">{s.title}</p>
        {s.objective && <p className="mt-1 line-clamp-2 text-[13px] text-muted">{s.objective}</p>}
        <p className="mt-2 text-[11.5px] text-faint tabular-nums">
          {p.answered}/{p.questions} questions · {p.ideas} ideas · {p.risks} risks
          {p.steps > 0 && ` · ${p.stepsDone}/${p.steps} steps`}
        </p>
        {p.steps > 0 && <ProgressBar value={(p.stepsDone / p.steps) * 100} tone="crystal" className="mt-2 max-w-48" />}
      </div>
      <ChevronRight className="size-4 shrink-0 text-faint" />
    </button>
  );
}

/** The full-screen workspace: one tab per tool. */
function Workspace({ id, onClose }: { id: string; onClose: () => void }) {
  const [s, set] = useStrategy(id);
  const deleteStrategy = useStore((x) => x.deleteStrategy);
  const restore = useStore((x) => x.restore);
  const [tool, setTool] = useState<ToolId>("overview");
  useBackToClose(true, onClose);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!s) return null;
  const Tool = TOOLS.find((t) => t.id === tool)!.Tool;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={s.title} className="animate-fade fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-bg">
      <div className="sticky top-0 z-20 border-b border-line/70 bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-1 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-6">
          <IconButton label="Back to strategies" onClick={onClose} className="size-10 text-fg">
            <X className="size-5" />
          </IconButton>
          <input value={s.title} onChange={(e) => set({ title: e.target.value })} aria-label="Strategy name" className="h-10 min-w-0 flex-1 bg-transparent text-[16px] font-semibold outline-none" />
          <IconButton
            label="Delete strategy"
            onClick={() => {
              if (!confirm(`Delete “${s.title}” and everything in it?`)) return;
              const copy = s;
              deleteStrategy(s.id);
              onClose();
              toast("Strategy deleted", { label: "Undo", run: () => restore("strategies", copy) });
            }}
            className="size-10 hover:text-danger"
          >
            <Trash2 className="size-4" />
          </IconButton>
        </div>
        {/* Tools — scroll sideways on a phone. */}
        <nav className="mx-auto max-w-3xl overflow-x-auto px-3 [scrollbar-width:none] sm:px-6">
          <div className="flex w-max gap-1 pt-1 pb-2">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                aria-current={tool === t.id ? "page" : undefined}
                className={cn("rounded-full px-3.5 py-1.5 text-[13px] transition-colors", tool === t.id ? "bg-surface-3 font-medium text-fg" : "text-muted hover:text-fg")}
              >
                {t.label}
              </button>
            ))}
          </div>
        </nav>
      </div>

      <div key={tool} className="animate-fade mx-auto max-w-3xl px-4 pt-6 pb-[max(4rem,env(safe-area-inset-bottom))] sm:px-6">
        <Tool s={s} set={set} />
      </div>
    </div>,
    document.body,
  );
}
