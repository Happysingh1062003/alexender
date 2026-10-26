"use client";

import { Link2, Minus, Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LINK_LABELS, NODE_KINDS, type MapNode, type NodeKind, type Strategy } from "@/lib/strategy";
import { cn, uid } from "@/lib/utils";
import { IconButton } from "../ui";
import { ToolIntro } from "./parts";

type Set = (patch: Partial<Strategy>) => void;

const W = 1800;
const H = 1200;
const kindColor = (kind: NodeKind) => NODE_KINDS.find((k) => k.kind === kind)?.color ?? "var(--muted)";

/**
 * A board of connected ideas. Drag boxes to arrange them; select one to edit it, change what
 * it is, or connect it to another. Links carry a meaning — leads to, because, needs, blocks.
 */
export function MindMap({ s, set }: { s: Strategy; set: Set }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedLink, setSelectedLink] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const scroller = useRef<HTMLDivElement>(null);
  // The live drag position is kept here too: on release it must be read directly, not from a render snapshot.
  const press = useRef<{ id: string; px: number; py: number; nx: number; ny: number; moved: boolean; x: number; y: number } | null>(null);

  const node = s.nodes.find((n) => n.id === selected);
  const link = s.links.find((l) => l.id === selectedLink);
  const pos = (n: MapNode) => (drag?.id === n.id ? drag : n);

  // Open centred on the ideas (or the middle of the board).
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const xs = s.nodes.map((n) => n.x);
    const ys = s.nodes.map((n) => n.y);
    const cx = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : W / 2;
    const cy = ys.length ? (Math.min(...ys) + Math.max(...ys)) / 2 : H / 2;
    el.scrollLeft = cx - el.clientWidth / 2;
    el.scrollTop = cy - el.clientHeight / 2;
    // Only when the map first opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = (id: string | null) => {
    setSelected(id);
    setSelectedLink(null);
    setConnecting(false);
  };

  /** A new idea — branching from the selected one, or in the middle of the view. */
  const addIdea = (text = "New idea") => {
    const el = scroller.current;
    const from = node;
    const siblings = from ? s.links.filter((l) => l.from === from.id).length : 0;
    const x = from ? from.x + 230 : el ? (el.scrollLeft + el.clientWidth / 2) / zoom : W / 2;
    const y = from ? from.y - 60 + siblings * 90 : el ? (el.scrollTop + el.clientHeight / 2) / zoom : H / 2;
    const id = uid();
    const fresh: MapNode = { id, text, x: Math.min(W - 100, Math.max(100, x)), y: Math.min(H - 50, Math.max(50, y)), kind: s.nodes.length ? "idea" : "goal" };
    set({ nodes: [...s.nodes, fresh], links: from ? [...s.links, { id: uid(), from: from.id, to: id }] : s.links });
    setSelected(id);
    setSelectedLink(null);
  };

  const updateNode = (id: string, patch: Partial<MapNode>) => set({ nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) });
  const removeNode = (id: string) => {
    set({ nodes: s.nodes.filter((n) => n.id !== id), links: s.links.filter((l) => l.from !== id && l.to !== id) });
    select(null);
  };

  const tapNode = (id: string) => {
    if (connecting && selected && selected !== id) {
      const exists = s.links.some((l) => (l.from === selected && l.to === id) || (l.from === id && l.to === selected));
      if (!exists) set({ links: [...s.links, { id: uid(), from: selected, to: id }] });
      setConnecting(false);
      setSelected(id);
      return;
    }
    select(id);
  };

  return (
    <div>
      <ToolIntro>
        Lay out the pieces and how they connect. Tap <strong>Idea</strong> to add one — with a box selected, the new idea branches from it. Drag to arrange; tap a box to edit it or connect it to another.
      </ToolIntro>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button
          onClick={() => addIdea(s.nodes.length ? "New idea" : s.objective?.trim() || s.title)}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-3.5 text-[13px] font-medium text-muted transition-colors hover:border-faint hover:text-fg"
        >
          <Plus className="size-3.5" /> Idea
        </button>
        {node && (
          <button
            onClick={() => setConnecting((c) => !c)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors",
              connecting ? "border-crystal/70 bg-crystal-soft text-fg" : "border-line-strong text-muted hover:border-faint hover:text-fg",
            )}
          >
            <Link2 className="size-3.5" /> {connecting ? "Tap a box to connect…" : "Connect"}
          </button>
        )}
        <span className="flex-1" />
        <IconButton label="Zoom out" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(1)))}>
          <Minus className="size-4" />
        </IconButton>
        <span className="w-10 text-center text-[12px] text-faint tabular-nums">{Math.round(zoom * 100)}%</span>
        <IconButton label="Zoom in" onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(1)))}>
          <Plus className="size-4" />
        </IconButton>
      </div>

      <div ref={scroller} className="relative h-[58dvh] min-h-[340px] overflow-auto overscroll-contain rounded-2xl border border-line bg-surface sm:h-[560px]">
        <div style={{ width: W * zoom, height: H * zoom }}>
          <div
            className="relative origin-top-left"
            style={{
              width: W,
              height: H,
              transform: `scale(${zoom})`,
              backgroundImage: "radial-gradient(var(--line-strong) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
            onClick={(e) => e.target === e.currentTarget && select(null)}
          >
            <svg width={W} height={H} className="absolute inset-0">
              <defs>
                <marker id="map-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill="var(--faint)" />
                </marker>
              </defs>
              {s.links.map((l) => {
                const a = s.nodes.find((n) => n.id === l.from);
                const b = s.nodes.find((n) => n.id === l.to);
                if (!a || !b) return null;
                const p = pos(a);
                const q = pos(b);
                // Stop short of the target box so the arrowhead shows.
                const dx = q.x - p.x;
                const dy = q.y - p.y;
                const len = Math.hypot(dx, dy) || 1;
                const end = { x: q.x - (dx / len) * 70, y: q.y - (dy / len) * 34 };
                const active = l.id === selectedLink;
                return (
                  <g key={l.id}>
                    <line x1={p.x} y1={p.y} x2={end.x} y2={end.y} stroke={active ? "var(--crystal)" : "var(--faint)"} strokeWidth={active ? 2 : 1.5} markerEnd="url(#map-arrow)" />
                    <line
                      x1={p.x}
                      y1={p.y}
                      x2={q.x}
                      y2={q.y}
                      stroke="transparent"
                      strokeWidth={18}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedLink(l.id);
                        setSelected(null);
                        setConnecting(false);
                      }}
                    />
                    {l.label && (
                      <text x={(p.x + q.x) / 2} y={(p.y + q.y) / 2 - 6} textAnchor="middle" className="pointer-events-none fill-muted text-[11px]" style={{ paintOrder: "stroke", stroke: "var(--surface)", strokeWidth: 4 }}>
                        {l.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {s.nodes.map((n) => {
              const p = pos(n);
              const active = n.id === selected;
              return (
                <div
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  aria-label={n.text}
                  aria-pressed={active}
                  onPointerDown={(e) => {
                    // Keep receiving moves even if the finger leaves the box; harmless if the pointer is already gone.
                    try {
                      e.currentTarget.setPointerCapture(e.pointerId);
                    } catch {}
                    press.current = { id: n.id, px: e.clientX, py: e.clientY, nx: n.x, ny: n.y, moved: false, x: n.x, y: n.y };
                  }}
                  onPointerMove={(e) => {
                    const pr = press.current;
                    if (!pr || pr.id !== n.id) return;
                    const dx = (e.clientX - pr.px) / zoom;
                    const dy = (e.clientY - pr.py) / zoom;
                    if (!pr.moved && Math.hypot(dx, dy) < 4) return;
                    pr.moved = true;
                    pr.x = Math.min(W - 60, Math.max(60, pr.nx + dx));
                    pr.y = Math.min(H - 30, Math.max(30, pr.ny + dy));
                    setDrag({ id: n.id, x: pr.x, y: pr.y });
                  }}
                  onPointerCancel={() => {
                    press.current = null;
                    setDrag(null);
                  }}
                  onPointerUp={() => {
                    const pr = press.current;
                    press.current = null;
                    if (!pr) return;
                    if (pr.moved) updateNode(n.id, { x: Math.round(pr.x), y: Math.round(pr.y) });
                    else tapNode(n.id);
                    setDrag(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && tapNode(n.id)}
                  className={cn(
                    "absolute w-max max-w-[180px] min-w-[96px] -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-xl border bg-bg px-3 py-2 text-center text-[13px] leading-snug select-none active:cursor-grabbing",
                    active ? "shadow-[0_0_0_2px_var(--crystal)]" : connecting ? "hover:shadow-[0_0_0_2px_var(--crystal)]" : "",
                  )}
                  style={{ left: p.x, top: p.y, borderColor: kindColor(n.kind) }}
                >
                  <span className="mb-0.5 block text-[9.5px] font-medium tracking-wide uppercase" style={{ color: kindColor(n.kind) }}>
                    {NODE_KINDS.find((k) => k.kind === n.kind)?.label}
                  </span>
                  {n.text}
                </div>
              );
            })}

            {s.nodes.length === 0 && (
              <button
                onClick={() => addIdea(s.objective?.trim() || s.title)}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-dashed border-line-strong px-5 py-4 text-[14px] text-muted hover:border-faint hover:text-fg"
              >
                Start the map with your goal
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Edit what is selected. */}
      {node && (
        <div className="animate-fade mt-3 rounded-2xl border border-line p-3">
          <div className="flex items-center gap-2">
            <input
              value={node.text}
              onChange={(e) => updateNode(node.id, { text: e.target.value })}
              aria-label="Idea text"
              className="h-10 min-w-0 flex-1 rounded-lg bg-surface-2 px-3 text-[14px] outline-none"
            />
            <IconButton label="Delete idea" onClick={() => removeNode(node.id)} className="hover:text-danger">
              <Trash2 className="size-4" />
            </IconButton>
            <IconButton label="Done" onClick={() => select(null)}>
              <X className="size-4" />
            </IconButton>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {NODE_KINDS.map((k) => (
              <button
                key={k.kind}
                onClick={() => updateNode(node.id, { kind: k.kind })}
                className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-colors", node.kind === k.kind ? "border-line-strong bg-surface-2 text-fg" : "border-line text-faint hover:text-fg")}
              >
                <span className="size-2 rounded-full" style={{ background: k.color }} /> {k.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {link && (
        <div className="animate-fade mt-3 rounded-2xl border border-line p-3">
          <p className="mb-2 text-[12px] text-faint">
            {s.nodes.find((n) => n.id === link.from)?.text} → {s.nodes.find((n) => n.id === link.to)?.text}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {LINK_LABELS.map((label) => (
              <button
                key={label}
                onClick={() => set({ links: s.links.map((l) => (l.id === link.id ? { ...l, label: l.label === label ? undefined : label } : l)) })}
                className={cn("rounded-full border px-2.5 py-1 text-[12px] transition-colors", link.label === label ? "border-line-strong bg-surface-2 text-fg" : "border-line text-faint hover:text-fg")}
              >
                {label}
              </button>
            ))}
            <span className="flex-1" />
            <IconButton
              label="Delete connection"
              onClick={() => {
                set({ links: s.links.filter((l) => l.id !== link.id) });
                setSelectedLink(null);
              }}
              className="hover:text-danger"
            >
              <Trash2 className="size-4" />
            </IconButton>
          </div>
        </div>
      )}
    </div>
  );
}
