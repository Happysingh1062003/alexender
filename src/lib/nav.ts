import {
  BookOpen,
  CalendarDays,
  Lightbulb,
  Map as MapIcon,
  Settings,
  SquarePlay,
  Sunrise,
  Target,
} from "lucide-react";

export const NAV = [
  { href: "/", label: "Today", icon: Sunrise },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/mission", label: "Mission", icon: Target },
  { href: "/videos", label: "Videos", icon: SquarePlay },
  { href: "/books", label: "Books", icon: BookOpen },
  { href: "/learnings", label: "Learnings", icon: Lightbulb },
  { href: "/plans", label: "Plans", icon: MapIcon },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;
