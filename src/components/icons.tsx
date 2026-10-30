import {
  Ban,
  BookOpen,
  Calendar,
  CirclePlay,
  ClipboardList,
  Compass,
  Ellipsis,
  Feather,
  Flag,
  Headphones,
  Hourglass,
  Landmark,
  Lightbulb,
  Dumbbell,
  GraduationCap,
  MessageCircleQuestionMark,
  Sprout,
  Repeat,
  Timer,
  Target,
  Settings2,
  Sun,
  type LucideProps,
} from "lucide-react";

/*
 * Section icons: one quiet family (Lucide), thin strokes, nothing filled.
 * Wrapped so every place that shows a section uses the same weight.
 */

const thin = (Icon: React.ComponentType<LucideProps>) => {
  const Thin = (props: LucideProps) => <Icon strokeWidth={1.5} absoluteStrokeWidth {...props} />;
  Thin.displayName = Icon.displayName;
  return Thin;
};

export const TodayIcon = thin(Sun);
export const CalendarIcon = thin(Calendar);
export const MissionIcon = thin(Flag);
export const JournalIcon = thin(Feather);
export const VideosIcon = thin(CirclePlay);
export const BooksIcon = thin(BookOpen);
export const BucketIcon = thin(Compass);
export const LifeIcon = thin(Hourglass);
export const GoalsIcon = thin(Target);
export const DontIcon = thin(Ban);
export const PodcastsIcon = thin(Headphones);
export const PlansIcon = thin(ClipboardList);
export const StoriesIcon = thin(Landmark);
export const IdeasIcon = thin(Lightbulb);
export const HabitsIcon = thin(Repeat);
export const TimerIcon = thin(Timer);
export const WorkoutIcon = thin(Dumbbell);
export const SkillsIcon = thin(Sprout);
export const LearningIcon = thin(GraduationCap);
export const QuestionsIcon = thin(MessageCircleQuestionMark);
export const SettingsIcon = thin(Settings2);
export const MoreIcon = thin(Ellipsis);
