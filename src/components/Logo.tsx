/** A minimal Macedonian sun (Vergina star) mark. */
export function Logo({ className }: { className?: string }) {
  const rays = Array.from({ length: 16 }, (_, i) => i * 22.5);
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <g stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round">
        {rays.map((deg, i) => (
          <line key={deg} x1="16" y1={i % 2 ? 7.5 : 4} x2="16" y2="10.5" transform={`rotate(${deg} 16 16)`} />
        ))}
      </g>
      <circle cx="16" cy="16" r="4.2" fill="var(--accent)" />
    </svg>
  );
}
