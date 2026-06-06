import type { RouteMood } from "@/lib/monumation";

export type MoodTheme = {
  id: RouteMood;
  icon: string;
  emoji: string;
  vibe: string;
  fontDisplay: string;
  fontBody: string;
  page: string;
  gradient: string;
  gradientBold: string;
  accent: string;
  accentSoft: string;
  accentMuted: string;
  ink: string;
  inkMuted: string;
  text: string;
  border: string;
  ring: string;
  mapRoute: string;
  mapPoi: string;
  shadow: string;
  card: string;
  panel: string;
  cardActive: string;
  button: string;
  buttonHover: string;
  buttonGhost: string;
  pattern: string;
  ornament: string;
  sampleFrame: string;
};

export const MOOD_THEMES: Record<RouteMood, MoodTheme> = {
  heritage: {
    id: "heritage",
    icon: "heritage",
    emoji: "🏛️",
    vibe: "Vintage gazette",
    fontDisplay: "font-heritage-display",
    fontBody: "font-heritage-body",
    page: "mood-page-heritage",
    gradient: "from-[#f4ebe0] via-[#efe4d4] to-[#e8dcc8]",
    gradientBold: "from-[#efe0cc] via-[#e6d4bc] to-[#dcc9ad]",
    accent: "#7a3b12",
    accentSoft: "#a65e2a",
    accentMuted: "#f0e2cf",
    ink: "#2c1810",
    inkMuted: "#6b4c3b",
    text: "text-[#2c1810]",
    border: "border-[#c4a574]/80",
    ring: "#8b5a2b",
    mapRoute: "#7a3b12",
    mapPoi: "#c9a227",
    shadow: "shadow-[#3d2817]/15",
    card: "mood-card-heritage",
    panel: "mood-panel-heritage",
    cardActive: "mood-card-heritage mood-card-active-heritage",
    button: "mood-btn-heritage",
    buttonHover: "hover:brightness-95",
    buttonGhost: "mood-btn-ghost-heritage",
    pattern:
      "repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(122,59,18,0.04) 28px)",
    ornament: "✦",
    sampleFrame: "rounded-sm border-2 border-[#c4a574]/60 shadow-[inset_0_0_0_1px_#f5efe6]",
  },
  scenic: {
    id: "scenic",
    icon: "scenic",
    emoji: "🌿",
    vibe: "Botanical atlas",
    fontDisplay: "font-scenic-display",
    fontBody: "font-scenic-body",
    page: "mood-page-scenic",
    gradient: "from-[#e8f2ea] via-[#dce9df] to-[#cfe0d4]",
    gradientBold: "from-[#d4e8d8] via-[#c5ddcb] to-[#b5d4be]",
    accent: "#2f5d3a",
    accentSoft: "#4a7c59",
    accentMuted: "#d8eadc",
    ink: "#1a3322",
    inkMuted: "#4d6b55",
    text: "text-[#1a3322]",
    border: "border-[#8fb996]/90",
    ring: "#3d7a4f",
    mapRoute: "#2f5d3a",
    mapPoi: "#6b9e7a",
    shadow: "shadow-[#1a3322]/12",
    card: "mood-card-scenic",
    panel: "mood-panel-scenic",
    cardActive: "mood-card-scenic mood-card-active-scenic",
    button: "mood-btn-scenic",
    buttonHover: "hover:brightness-95",
    buttonGhost: "mood-btn-ghost-scenic",
    pattern:
      "radial-gradient(circle at 12% 18%, rgba(74,124,89,0.18) 0%, transparent 42%), radial-gradient(circle at 88% 82%, rgba(47,93,58,0.12) 0%, transparent 38%)",
    ornament: "❧",
    sampleFrame: "rounded-[1.75rem] border border-[#8fb996]/70",
  },
  arts: {
    id: "arts",
    icon: "arts",
    emoji: "🖌️",
    vibe: "Gallery opening",
    fontDisplay: "font-arts-display",
    fontBody: "font-arts-body",
    page: "mood-page-arts",
    gradient: "from-[#f4f1ec] via-[#ece8f0] to-[#e6e2ea]",
    gradientBold: "from-[#ebe6f0] via-[#e0dae8] to-[#d5cfe0]",
    accent: "#4c1d95",
    accentSoft: "#6d28d9",
    accentMuted: "#ede8f5",
    ink: "#14121a",
    inkMuted: "#5c5670",
    text: "text-[#14121a]",
    border: "border-[#14121a]/25",
    ring: "#7c3aed",
    mapRoute: "#4c1d95",
    mapPoi: "#a78bfa",
    shadow: "shadow-[#14121a]/10",
    card: "mood-card-arts",
    panel: "mood-panel-arts",
    cardActive: "mood-card-arts mood-card-active-arts",
    button: "mood-btn-arts",
    buttonHover: "hover:brightness-110",
    buttonGhost: "mood-btn-ghost-arts",
    pattern:
      "linear-gradient(135deg, rgba(76,29,149,0.06) 25%, transparent 25%), linear-gradient(225deg, rgba(236,72,153,0.05) 25%, transparent 25%)",
    ornament: "◈",
    sampleFrame: "rounded-none border-l-4 border-[#4c1d95] bg-[#faf9fc]",
  },
  promenade: {
    id: "promenade",
    icon: "promenade",
    emoji: "☕",
    vibe: "Café journal",
    fontDisplay: "font-promenade-display",
    fontBody: "font-promenade-body",
    page: "mood-page-promenade",
    gradient: "from-[#fff8f0] via-[#fceee3] to-[#f8e4d8]",
    gradientBold: "from-[#fce8d8] via-[#f9dcc8] to-[#f5d0bc]",
    accent: "#9c4221",
    accentSoft: "#c65d3b",
    accentMuted: "#fde8d8",
    ink: "#3c2415",
    inkMuted: "#7a5644",
    text: "text-[#3c2415]",
    border: "border-[#d4a574]/80",
    ring: "#c65d3b",
    mapRoute: "#9c4221",
    mapPoi: "#e07a5f",
    shadow: "shadow-[#3c2415]/10",
    card: "mood-card-promenade",
    panel: "mood-panel-promenade",
    cardActive: "mood-card-promenade mood-card-active-promenade",
    button: "mood-btn-promenade",
    buttonHover: "hover:brightness-95",
    buttonGhost: "mood-btn-ghost-promenade",
    pattern:
      "radial-gradient(ellipse at 20% 0%, rgba(198,93,59,0.14) 0%, transparent 55%), radial-gradient(ellipse at 80% 100%, rgba(156,66,33,0.08) 0%, transparent 50%)",
    ornament: "—",
    sampleFrame: "rounded-2xl border border-[#e8c4a8]/90 shadow-sm",
  },
};

export function getMoodTheme(mood: RouteMood): MoodTheme {
  return MOOD_THEMES[mood];
}

export function scoreLabel(score: number): string {
  if (score >= 75) return "Exceptional corridor";
  if (score >= 55) return "Strong mood match";
  if (score >= 35) return "Mixed corridor";
  if (score >= 18) return "Functional stretch";
  return "Low appeal zone";
}

export function scoreTierColor(score: number, accent?: string): string {
  if (accent && score >= 45) return accent;
  if (score >= 70) return "#3d7a4f";
  if (score >= 45) return "#8b6914";
  if (score >= 25) return "#c65d3b";
  return "#8b3a3a";
}
