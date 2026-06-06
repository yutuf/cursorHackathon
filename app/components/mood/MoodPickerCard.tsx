"use client";

import type { RouteMood } from "@/lib/monumation";
import { ROUTE_MOODS } from "@/lib/monumation";
import { getMoodTheme } from "@/lib/mood-theme";

type MoodPickerCardProps = {
  mood: (typeof ROUTE_MOODS)[number];
  selected: boolean;
  onSelect: (mood: RouteMood) => void;
};

export default function MoodPickerCard({
  mood,
  selected,
  onSelect,
}: MoodPickerCardProps) {
  const theme = getMoodTheme(mood.id);

  return (
    <button
      type="button"
      onClick={() => onSelect(mood.id)}
      className={`group relative overflow-hidden p-4 text-left transition-all duration-500 ${
        selected
          ? `${theme.cardActive} scale-[1.02] ${theme.shadow} shadow-lg`
          : `${theme.card} opacity-90 hover:opacity-100`
      }`}
    >
      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <span className="text-2xl">{theme.emoji}</span>
          {selected && (
            <span
              className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${theme.fontDisplay}`}
              style={{ color: theme.accent }}
            >
              {theme.ornament} active
            </span>
          )}
        </div>
        <p
          className={`mt-3 text-[9px] font-semibold uppercase tracking-[0.2em] ${theme.fontDisplay}`}
          style={{ color: theme.inkMuted }}
        >
          {theme.vibe}
        </p>
        <p
          className={`mt-1 text-base font-semibold ${theme.fontDisplay}`}
          style={{ color: theme.ink }}
        >
          {mood.labelTr}
        </p>
        <p
          className="mt-0.5 text-xs italic"
          style={{ color: theme.accentSoft }}
        >
          {mood.label}
        </p>
        <p
          className="mt-2 text-xs leading-relaxed"
          style={{ color: theme.inkMuted }}
        >
          {mood.description}
        </p>
      </div>
    </button>
  );
}
