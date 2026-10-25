import {
  BooksIcon,
  CalendarIcon,
  JournalIcon,
  LifeIcon,
  MissionIcon,
  SettingsIcon,
  TodayIcon,
  VideosIcon,
} from "@/components/icons";

export const NAV = [
  { href: "/", label: "Today", icon: TodayIcon },
  { href: "/calendar", label: "Calendar", icon: CalendarIcon },
  { href: "/mission", label: "Mission", icon: MissionIcon },
  { href: "/journal", label: "Journal", icon: JournalIcon },
  { href: "/videos", label: "Videos", icon: VideosIcon },
  { href: "/books", label: "Books", icon: BooksIcon },
  { href: "/life", label: "Life", icon: LifeIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
] as const;
