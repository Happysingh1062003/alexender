/*
 * Strategy workspaces: one per challenge, each holding the thinking tools — questions, a map of
 * connected ideas, SWOT, a decision matrix, a pre-mortem, a phased plan and an assumption log.
 * Stored as one record per strategy, so it syncs and merges like everything else.
 */

export interface StrategyItem {
  id: string;
  text: string;
}

export type NodeKind = "idea" | "goal" | "action" | "risk" | "question";

export interface MapNode {
  id: string;
  text: string;
  /** Centre of the box on the map, in map pixels. */
  x: number;
  y: number;
  kind: NodeKind;
}

export interface MapLink {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export interface Criterion {
  id: string;
  name: string;
  /** How much it matters, 1–5. */
  weight: number;
}

export interface StrategyOption {
  id: string;
  name: string;
  /** Score per criterion id, 0–5. */
  scores: Record<string, number>;
}

export interface Risk {
  id: string;
  text: string;
  likelihood: 1 | 2 | 3;
  impact: 1 | 2 | 3;
  mitigation?: string;
}

export interface PlanStep {
  id: string;
  text: string;
  done: boolean;
}

export interface PlanPhase {
  id: string;
  title: string;
  steps: PlanStep[];
}

export interface Assumption {
  id: string;
  text: string;
  kind: "fact" | "assumption";
  test?: string;
  status: "untested" | "confirmed" | "wrong";
}

export interface Strategy {
  id: string;
  title: string;
  /** What winning looks like. */
  objective?: string;
  current?: string;
  desired?: string;
  deadline?: string;
  /** "Why?" asked again and again, to reach the real motive. */
  whys: string[];
  answers: Record<string, string>;
  myQuestions: { id: string; text: string; answer?: string }[];
  nodes: MapNode[];
  links: MapLink[];
  swot: { s: StrategyItem[]; w: StrategyItem[]; o: StrategyItem[]; t: StrategyItem[]; moves: { so?: string; st?: string; wo?: string; wt?: string } };
  criteria: Criterion[];
  options: StrategyOption[];
  risks: Risk[];
  phases: PlanPhase[];
  assumptions: Assumption[];
  createdAt: number;
  updatedAt?: number;
  order: number;
}

/** Fills anything a strategy saved by an older version (or another device) doesn't have yet. */
export function fillStrategy(s: Partial<Strategy> & { id: string; title: string; createdAt: number }): Strategy {
  return {
    ...s,
    whys: s.whys ?? [],
    answers: s.answers ?? {},
    myQuestions: s.myQuestions ?? [],
    nodes: s.nodes ?? [],
    links: s.links ?? [],
    swot: { s: [], w: [], o: [], t: [], ...s.swot, moves: { ...s.swot?.moves } },
    criteria: s.criteria ?? [],
    options: s.options ?? [],
    risks: s.risks ?? [],
    phases: s.phases ?? [],
    assumptions: s.assumptions ?? [],
    order: s.order ?? s.createdAt,
  };
}

export interface QuestionGroup {
  title: string;
  hint: string;
  questions: { id: string; text: string }[];
}

/** Questions strategists have asked for millennia — Sun Tzu to first-principles thinking. */
export const QUESTION_GROUPS: QuestionGroup[] = [
  {
    title: "Clarify",
    hint: "Know exactly what you're trying to do.",
    questions: [
      { id: "c1", text: "What is the goal, in one sentence?" },
      { id: "c2", text: "How will I know I've won? What can I measure?" },
      { id: "c3", text: "What is in my control — and what isn't?" },
    ],
  },
  {
    title: "Challenge",
    hint: "Strip it to what's true.",
    questions: [
      { id: "f1", text: "What am I assuming that might be false?" },
      { id: "f2", text: "What is true no matter what happens?" },
      { id: "f3", text: "If I started from zero today, would I still choose this path?" },
    ],
  },
  {
    title: "Terrain & opponent",
    hint: "Know yourself, know the field, know what opposes you.",
    questions: [
      { id: "t1", text: "Who or what is working against me?" },
      { id: "t2", text: "Where is my advantage — the ground where my strength counts most?" },
      { id: "t3", text: "Where is the opposition weakest or least prepared?" },
    ],
  },
  {
    title: "Consequences",
    hint: "Think one step further than others do.",
    questions: [
      { id: "s1", text: "If this works, what happens next — and after that?" },
      { id: "s2", text: "What is the worst realistic outcome, and could I survive it?" },
      { id: "s3", text: "What will I regret not having tried?" },
    ],
  },
  {
    title: "Focus",
    hint: "Strategy is choosing what not to do.",
    questions: [
      { id: "o1", text: "What is the one move that makes everything else easier?" },
      { id: "o2", text: "What will I stop doing to make room for this?" },
      { id: "o3", text: "What is the smallest step I can take today?" },
    ],
  },
  {
    title: "Perspectives",
    hint: "Borrow other eyes.",
    questions: [
      { id: "p1", text: "How would someone I admire approach this?" },
      { id: "p2", text: "What would I advise a friend in exactly my position?" },
      { id: "p3", text: "How would my strongest opponent describe my plan's weakness?" },
    ],
  },
];

export const QUESTION_COUNT = QUESTION_GROUPS.reduce((n, g) => n + g.questions.length, 0);

export const NODE_KINDS: { kind: NodeKind; label: string; color: string }[] = [
  { kind: "idea", label: "Idea", color: "var(--muted)" },
  { kind: "goal", label: "Goal", color: "var(--crystal)" },
  { kind: "action", label: "Action", color: "var(--success)" },
  { kind: "risk", label: "Risk", color: "var(--danger)" },
  { kind: "question", label: "Question", color: "#d6b46a" },
];

export const LINK_LABELS = ["leads to", "because", "needs", "blocks", "supports"];

/** Weighted total of an option, as a share of the best possible score (0–100). */
export function optionScore(option: StrategyOption, criteria: Criterion[]) {
  const max = criteria.reduce((sum, c) => sum + c.weight * 5, 0);
  if (!max) return 0;
  const got = criteria.reduce((sum, c) => sum + c.weight * (option.scores[c.id] ?? 0), 0);
  return Math.round((got / max) * 100);
}

export const riskScore = (r: Risk) => r.likelihood * r.impact;

/** How far along a strategy is: plan steps done, questions answered, assumptions tested. */
export function strategyProgress(s: Strategy) {
  const steps = s.phases.flatMap((p) => p.steps);
  const answered = Object.values(s.answers).filter((a) => a.trim()).length;
  return {
    stepsDone: steps.filter((x) => x.done).length,
    steps: steps.length,
    answered,
    questions: QUESTION_COUNT + s.myQuestions.length,
    risks: s.risks.length,
    ideas: s.nodes.length,
  };
}
