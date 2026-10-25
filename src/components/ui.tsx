"use client";

import { Check, ImagePlus, Plus, X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { saveImages, useImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "outline" | "danger";

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" }) {
  return (
    <button
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-medium transition-colors active:scale-[0.98] disabled:pointer-events-none disabled:opacity-35",
        size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
        variant === "primary" && "bg-fg text-bg hover:bg-white",
        variant === "ghost" && "text-muted hover:bg-surface-2 hover:text-fg",
        variant === "outline" && "border border-line-strong text-fg hover:bg-surface-2",
        variant === "danger" && "text-danger hover:bg-danger/10",
        className,
      )}
      {...props}
    />
  );
}

export function IconButton({
  className,
  label,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-fg active:scale-95 disabled:opacity-25",
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, children, ...props }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-2xl border border-line bg-surface p-4 sm:p-5", className)} {...props}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex min-h-8 items-center justify-between gap-2">
      <h2 className="text-[13px] font-medium text-muted">{children}</h2>
      {action}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-line bg-surface px-3 text-fg outline-none transition-colors placeholder:text-faint focus:border-line-strong focus:bg-surface-2",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full resize-none rounded-lg border border-line bg-surface p-3 text-fg outline-none transition-colors placeholder:text-faint focus:border-line-strong focus:bg-surface-2",
        className,
      )}
      {...props}
    />
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  size = "md",
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors",
        size === "sm" ? "size-4" : "size-[22px]",
        checked ? "border-fg bg-fg text-bg" : "border-faint hover:border-fg",
      )}
    >
      {checked && <Check className={cn("animate-check", size === "sm" ? "size-2.5" : "size-3.5")} strokeWidth={3.2} />}
    </button>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  // Portal to <body> so animated (transformed) page containers can't trap the fixed overlay.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="animate-fade absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "animate-sheet relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-line-strong bg-surface sm:rounded-2xl",
          wide ? "sm:max-w-2xl" : "sm:max-w-md",
        )}
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
          <div className="min-w-0 flex-1 text-[15px] font-semibold">{title}</div>
          <IconButton label="Close" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>
        <div className="overflow-y-auto px-5 pt-1 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/** Completion ring with a small tick marking the success target. */
export function ProgressRing({
  value,
  target,
  size = 168,
  stroke = 8,
  success,
  children,
}: {
  value: number;
  target?: number;
  size?: number;
  stroke?: number;
  success?: boolean;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const angle = ((target ?? 0) / 100) * 2 * Math.PI - Math.PI / 2;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={success ? "var(--success)" : "var(--fg)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (Math.min(100, value) / 100) * c}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.2, 0.8, 0.2, 1), stroke 0.3s" }}
        />
      </svg>
      {target !== undefined && (
        <span
          title={`Success at ${target}%`}
          className="absolute size-1.5 rounded-full bg-success"
          style={{
            left: size / 2 + r * Math.cos(angle) - 3,
            top: size / 2 + r * Math.sin(angle) - 3,
          }}
        />
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export function ProgressBar({ value, className, tone }: { value: number; className?: string; tone?: "success" }) {
  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-surface-3", className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", tone === "success" ? "bg-success" : "bg-fg")}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
}) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-surface p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            value === o.value ? "bg-surface-3 text-fg" : "text-muted hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function StoredImage({ id, className, alt = "" }: { id?: string; className?: string; alt?: string }) {
  const url = useImageUrl(id);
  if (!url) return <div className={cn("animate-pulse bg-surface-2", className)} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={cn("object-cover", className)} />;
}

export function ImageUploadButton({
  onAdd,
  multiple = true,
  className,
  children,
  plain,
}: {
  onAdd: (ids: string[]) => void;
  multiple?: boolean;
  className?: string;
  children?: ReactNode;
  plain?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        onChange={async (e) => {
          if (e.target.files?.length) onAdd(await saveImages(e.target.files));
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          ref.current?.click();
        }}
        className={cn(
          "flex items-center justify-center gap-2 rounded-xl text-sm transition-colors",
          !plain && "border border-dashed border-line-strong text-muted hover:border-faint hover:text-fg",
          className,
        )}
      >
        {children ?? (
          <>
            <ImagePlus className="size-4" /> Add images
          </>
        )}
      </button>
    </>
  );
}

/** Text that turns into an input on click; saves on Enter or blur, cancels on Escape. */
export function EditableText({
  value,
  onSave,
  className,
  placeholder,
}: {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  // Set once Enter or Escape has handled the edit, so the blur that follows doesn't act again.
  const handled = useRef(false);
  if (editing) {
    const finish = (input: HTMLInputElement) => {
      if (handled.current) return;
      handled.current = true;
      setEditing(false);
      const next = input.value.trim();
      if (next !== value) onSave(next);
    };
    return (
      <input
        autoFocus
        defaultValue={value}
        placeholder={placeholder}
        onClick={(e) => e.stopPropagation()}
        onBlur={(e) => finish(e.currentTarget)}
        onKeyDown={(e) => {
          if (e.key === "Enter") finish(e.currentTarget);
          if (e.key === "Escape") {
            handled.current = true;
            setEditing(false);
          }
        }}
        className={cn("w-full rounded-md bg-surface-2 px-1 -mx-1 outline-none", className)}
      />
    );
  }
  return (
    <button
      type="button"
      title="Click to edit"
      onClick={(e) => {
        e.stopPropagation();
        handled.current = false;
        setEditing(true);
      }}
      className={cn("block max-w-full cursor-text text-left", !value && "text-faint", className)}
    >
      {value || placeholder}
    </button>
  );
}

/** The small round "+ Add …" button used at the top of sections. */
export function PillButton({ active, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors",
        active ? "border-fg text-fg" : "border-line-strong text-muted hover:border-faint hover:text-fg",
      )}
    >
      <Plus className={cn("size-3.5 transition-transform", active && "rotate-45")} />
      {children}
    </button>
  );
}

export interface AddAction {
  label: string;
  placeholder: string;
  onAdd: (text: string) => void;
  /** Keep the input open after adding, for entering several in a row. */
  keepOpen?: boolean;
}

/** The top of every section: a quiet label, small add buttons, and an input only while adding. */
export function SectionTop({ label, actions = [], children }: { label?: string; actions?: AddAction[]; children?: ReactNode }) {
  const [open, setOpen] = useState<number | null>(null);
  const [text, setText] = useState("");
  const action = open !== null ? actions[open] : null;

  return (
    <div className="mb-10 flex flex-col items-center gap-4 text-center sm:mb-14">
      {label && <p className="text-[11px] font-medium tracking-[0.2em] text-faint uppercase">{label}</p>}
      {(children || actions.length > 0) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {children}
          {actions.map((a, i) => (
            <PillButton
              key={a.label}
              active={open === i}
              onClick={() => {
                setOpen(open === i ? null : i);
                setText("");
              }}
            >
              {a.label}
            </PillButton>
          ))}
        </div>
      )}
      {action && (
        <form
          className="w-full max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            const value = text.trim();
            if (!value) return;
            action.onAdd(value);
            setText("");
            if (!action.keepOpen) setOpen(null);
          }}
        >
          <Input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setOpen(null)}
            aria-label={action.label}
            placeholder={action.placeholder}
            className="h-11 text-center"
          />
        </form>
      )}
    </div>
  );
}
