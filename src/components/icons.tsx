import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

function Svg({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

/** Sun rising over the horizon — the present day. */
export const TodayIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 18h18" />
    <path d="M7 18a5 5 0 0 1 10 0" />
    <path d="M12 7.5V5M5.8 11.2 4.5 9.9M18.2 11.2l1.3-1.3" />
  </Svg>
);

export const CalendarIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3.5" />
    <path d="M3.5 10h17M8.5 3v4M15.5 3v4" />
    <circle cx="12" cy="15.2" r="1.3" fill="currentColor" stroke="none" />
  </Svg>
);

/** A peak with a planted flag. */
export const MissionIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 20 9 10l3.8 5.6 2.4-3.2L21.5 20z" />
    <path d="M9 10V3.5l4.5 1.6L9 6.7" />
  </Svg>
);

export const VideosIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="4" />
    <path d="M10.5 9.6v4.8l4-2.4z" fill="currentColor" />
  </Svg>
);

export const BooksIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 6.8C10 5.3 7 4.8 4 5.3v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-13c-3-.5-6 0-8 1.5Z" />
    <path d="M12 6.8v13" />
  </Svg>
);

/** A notebook with a ribbon — the journal. */
export const JournalIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="3.5" width="14" height="17" rx="2.5" />
    <path d="M9 8h6M9 11.5h6M9 15h3.5" />
    <path d="M15.5 20.5v-3l1.5 1 1.5-1v3" strokeWidth={1.3} />
  </Svg>
);

/** An hourglass — time you have left. */
export const LifeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.5 3.5h11M6.5 20.5h11" />
    <path d="M7.5 3.5c0 4.5 4.5 5.8 4.5 8.5s-4.5 4-4.5 8.5M16.5 3.5c0 4.5-4.5 5.8-4.5 8.5s4.5 4 4.5 8.5" />
    <path d="M10 18.2c.8-.9 3.2-.9 4 0" fill="currentColor" />
  </Svg>
);

export const SettingsIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </Svg>
);

export const MoreIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </Svg>
);
