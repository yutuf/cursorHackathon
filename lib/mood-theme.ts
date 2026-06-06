import type { RouteMood } from "@/lib/monumation";

export type MoodTheme = {
  id: RouteMood;
  icon: string;
  emoji: string;
  gradient: string;
  gradientBold: string;
  accent: string;
  accentMuted: string;
  text: string;
  border: string;
  ring: string;
  mapRoute: string;
  mapPoi: string;
  shadow: string;
  cardActive: string;
  button: string;
  buttonHover: string;
  pattern: string;
};

export const MOOD_THEMES: Record<RouteMood, MoodTheme> = {
  heritage: {
    id: "heritage",
    icon: "heritage",
    emoji: "🏛️",
    gradient: "from-amber-50 via-orange-50/80 to-stone-100",
    gradientBold: "from-amber-100 via-orange-200/60 to-amber-50",
    accent: "#b45309",
    accentMuted: "#fef3c7",
    text: "text-amber-950",
    border: "border-amber-300/70",
    ring: "#d97706",
    mapRoute: "#b45309",
    mapPoi: "#f59e0b",
    shadow: "shadow-amber-200/50",
    cardActive: "border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 ring-2 ring-amber-300/60",
    button: "bg-gradient-to-r from-amber-700 to-orange-600",
    buttonHover: "hover:from-amber-800 hover:to-orange-700",
    pattern:
      "radial-gradient(circle at 20% 20%, rgba(217,119,6,0.12) 0%, transparent 45%), radial-gradient(circle at 80% 0%, rgba(180,83,9,0.08) 0%, transparent 40%)",
  },
  scenic: {
    id: "scenic",
    icon: "scenic",
    emoji: "🌳",
    gradient: "from-emerald-50 via-green-50/80 to-teal-50",
    gradientBold: "from-emerald-100 via-green-200/50 to-emerald-50",
    accent: "#15803d",
    accentMuted: "#dcfce7",
    text: "text-emerald-950",
    border: "border-emerald-300/70",
    ring: "#16a34a",
    mapRoute: "#15803d",
    mapPoi: "#22c55e",
    shadow: "shadow-emerald-200/50",
    cardActive:
      "border-emerald-400 bg-gradient-to-br from-emerald-50 to-green-50 ring-2 ring-emerald-300/60",
    button: "bg-gradient-to-r from-emerald-700 to-green-600",
    buttonHover: "hover:from-emerald-800 hover:to-green-700",
    pattern:
      "radial-gradient(circle at 10% 80%, rgba(22,163,74,0.14) 0%, transparent 50%), radial-gradient(circle at 90% 10%, rgba(21,128,61,0.1) 0%, transparent 45%)",
  },
  arts: {
    id: "arts",
    icon: "arts",
    emoji: "🎨",
    gradient: "from-violet-50 via-purple-50/80 to-fuchsia-50",
    gradientBold: "from-violet-100 via-purple-200/50 to-violet-50",
    accent: "#7c3aed",
    accentMuted: "#ede9fe",
    text: "text-violet-950",
    border: "border-violet-300/70",
    ring: "#8b5cf6",
    mapRoute: "#7c3aed",
    mapPoi: "#a78bfa",
    shadow: "shadow-violet-200/50",
    cardActive:
      "border-violet-400 bg-gradient-to-br from-violet-50 to-purple-50 ring-2 ring-violet-300/60",
    button: "bg-gradient-to-r from-violet-700 to-purple-600",
    buttonHover: "hover:from-violet-800 hover:to-purple-700",
    pattern:
      "radial-gradient(circle at 30% 10%, rgba(124,58,237,0.14) 0%, transparent 45%), radial-gradient(circle at 70% 90%, rgba(139,92,246,0.1) 0%, transparent 50%)",
  },
  promenade: {
    id: "promenade",
    icon: "promenade",
    emoji: "☕",
    gradient: "from-rose-50 via-pink-50/80 to-fuchsia-50",
    gradientBold: "from-rose-100 via-pink-200/50 to-rose-50",
    accent: "#db2777",
    accentMuted: "#fce7f3",
    text: "text-rose-950",
    border: "border-rose-300/70",
    ring: "#ec4899",
    mapRoute: "#db2777",
    mapPoi: "#f472b6",
    shadow: "shadow-rose-200/50",
    cardActive:
      "border-rose-400 bg-gradient-to-br from-rose-50 to-pink-50 ring-2 ring-rose-300/60",
    button: "bg-gradient-to-r from-rose-600 to-pink-600",
    buttonHover: "hover:from-rose-700 hover:to-pink-700",
    pattern:
      "radial-gradient(circle at 15% 50%, rgba(219,39,119,0.12) 0%, transparent 45%), radial-gradient(circle at 85% 30%, rgba(236,72,153,0.1) 0%, transparent 50%)",
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

export function scoreTierColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 45) return "#eab308";
  if (score >= 25) return "#f97316";
  return "#ef4444";
}
