import { cn } from "@/lib/utils";

/*
 * Alexander's marble head (British Museum), cut from its museum background and rendered as grey
 * marble on transparency, so it sits directly on the black page. Served locally for speed.
 */
export function Statue({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/alexander.webp"
      alt=""
      aria-hidden
      width={498}
      height={720}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      draggable={false}
      className={cn("pointer-events-none animate-fade object-contain select-none", className)}
    />
  );
}
