"use client";

import { Check, ImagePlus, X } from "lucide-react";
import {
  useEffect,
  useRef,
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
        "inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
        size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
        variant === "primary" && "bg-fg text-bg hover:opacity-90",
        variant === "ghost" && "text-muted hover:bg-surface-2 hover:text-fg",
        variant === "outline" && "border border-line bg-surface hover:bg-surface-2",
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
        "inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg active:scale-90 disabled:opacity-30",
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, children, ...props }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-2xl border border-line bg-surface p-4 shadow-soft sm:p-5", className)} {...props}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{children}</h2>
      {action}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-xl border border-line bg-surface px-3 outline-none transition placeholder:text-muted/70 focus:border-fg/30 focus:ring-4 focus:ring-fg/5",
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
        "w-full resize-none rounded-xl border border-line bg-surface p-3 outline-none transition placeholder:text-muted/70 focus:border-fg/30 focus:ring-4 focus:ring-fg/5",
        className,
      )}
      {...props}
    />
  );
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "flex size-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition",
        checked ? "animate-pop border-accent bg-accent text-accent-fg" : "border-muted/50 hover:border-accent",
      )}
    >
      {checked && <Check className="size-3.5" strokeWidth={3} />}
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "animate-rise relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-line bg-surface shadow-2xl sm:rounded-3xl",
          wide ? "sm:max-w-2xl" : "sm:max-w-md",
        )}
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
          <div className="min-w-0 text-base font-semibold">{title}</div>
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

export function ProgressRing({
  value,
  size = 64,
  stroke = 6,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (Math.min(100, value) / 100) * c}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-2", className)}>
      <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

export function Empty({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <div className="text-muted">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="max-w-xs text-xs text-muted">{hint}</p>}
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
    <div className="inline-flex rounded-xl bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition",
            value === o.value ? "bg-surface text-fg shadow-soft" : "text-muted hover:text-fg",
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
        onClick={() => ref.current?.click()}
        className={cn(
          "flex items-center justify-center gap-2 rounded-xl text-sm transition",
          !plain && "border border-dashed border-line text-muted hover:border-accent hover:text-accent",
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

export function ImageGrid({ ids, onRemove }: { ids: string[]; onRemove?: (id: string) => void }) {
  if (!ids.length) return null;
  return (
    <div className="columns-2 gap-2 sm:columns-3 [&>*]:mb-2">
      {ids.map((id) => (
        <div key={id} className="group relative break-inside-avoid overflow-hidden rounded-xl">
          <StoredImage id={id} className="min-h-24 w-full" />
          {onRemove && (
            <button
              aria-label="Remove image"
              onClick={() => onRemove(id)}
              className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-black/60 text-white opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function StepList({
  steps,
  onChange,
  placeholder = "Add a step…",
}: {
  steps: { id: string; title: string; done: boolean }[];
  onChange: (steps: { id: string; title: string; done: boolean }[]) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      {steps.map((s) => (
        <div key={s.id} className="group flex items-center gap-3 rounded-lg py-1.5">
          <Checkbox
            checked={s.done}
            label={s.title}
            onChange={() => onChange(steps.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))}
          />
          <span className={cn("flex-1 text-sm", s.done && "text-muted line-through")}>{s.title}</span>
          <IconButton
            label="Remove step"
            className="sm:opacity-0 sm:group-hover:opacity-100"
            onClick={() => onChange(steps.filter((x) => x.id !== s.id))}
          >
            <X className="size-3.5" />
          </IconButton>
        </div>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.elements.namedItem("step") as HTMLInputElement;
          const title = input.value.trim();
          if (!title) return;
          onChange([...steps, { id: crypto.randomUUID(), title, done: false }]);
          input.value = "";
        }}
      >
        <Input name="step" placeholder={placeholder} className="h-9" />
      </form>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
