"use client";

import { Plus, X } from "lucide-react";
import { useState, type ReactNode, type TextareaHTMLAttributes } from "react";
import { useStore } from "@/lib/store";
import type { Strategy, StrategyItem } from "@/lib/strategy";
import { cn, uid } from "@/lib/utils";
import { EditableText, IconButton } from "../ui";

/** The strategy being edited, and a setter that saves a partial change. */
export function useStrategy(id: string) {
  const strategy = useStore((s) => s.strategies.find((x) => x.id === id));
  const update = useStore((s) => s.updateStrategy);
  return [strategy, (patch: Partial<Strategy>) => update(id, patch)] as const;
}

/** A calm text area that grows with what you write. */
export function Grow({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={2}
      {...props}
      className={cn(
        "block w-full resize-none rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[14.5px] leading-relaxed text-fg outline-none placeholder:text-faint [field-sizing:content] focus:border-line-strong",
        className,
      )}
    />
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium">{label}</span>
      {hint && <span className="-mt-1 mb-2 block text-[12px] text-faint">{hint}</span>}
      {children}
    </label>
  );
}

export function ToolIntro({ children }: { children: ReactNode }) {
  return <p className="mb-6 max-w-xl text-[13.5px] leading-relaxed text-muted">{children}</p>;
}

/** A short list you add to with Enter and edit in place. */
export function ItemList({ items, onChange, placeholder, dot }: { items: StrategyItem[]; onChange: (items: StrategyItem[]) => void; placeholder: string; dot?: string }) {
  const [text, setText] = useState("");
  return (
    <div>
      <ul>
        {items.map((item) => (
          <li key={item.id} className="group flex min-h-9 items-start gap-2.5">
            <span className="mt-[11px] size-1.5 shrink-0 rounded-full" style={{ background: dot ?? "var(--faint)" }} />
            <EditableText
              value={item.text}
              onSave={(t) => onChange(t ? items.map((x) => (x.id === item.id ? { ...x, text: t } : x)) : items.filter((x) => x.id !== item.id))}
              className="min-w-0 flex-1 py-1.5 text-[14px] leading-snug"
            />
            <IconButton label="Remove" onClick={() => onChange(items.filter((x) => x.id !== item.id))} className="size-8 hover:text-danger sm:opacity-0 sm:group-hover:opacity-100">
              <X className="size-3.5" />
            </IconButton>
          </li>
        ))}
      </ul>
      <form
        className="flex items-center gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          onChange([...items, { id: uid(), text: text.trim() }]);
          setText("");
        }}
      >
        <Plus className="size-3.5 shrink-0 text-faint" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          enterKeyHint="done"
          className="h-9 min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-faint"
        />
      </form>
    </div>
  );
}

/** A row of small choice buttons. */
export function Choice<T extends string | number>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-line p-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("rounded-md px-2.5 py-1 text-[12px] transition-colors", value === o.value ? "bg-surface-3 text-fg" : "text-faint hover:text-fg")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
