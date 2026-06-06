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
      className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 ${
        selected
          ? `${theme.cardActive} scale-[1.02] ${theme.shadow} shadow-lg`
          : "border-zinc-200/80 bg-white/80 hover:border-zinc-300 hover:bg-white"
      }`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60 transition-opacity group-hover:opacity-80"
        style={{ background: theme.pattern }}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-xl text-xl shadow-sm"
            style={{ backgroundColor: theme.accentMuted }}
          >
            {theme.emoji}
          </span>
          {selected && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
              style={{ backgroundColor: theme.accent }}
            >
              Active
            </span>
          )}
        </div>
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          {mood.labelTr}
        </p>
        <p className="mt-1 text-sm font-semibold" style={{ color: theme.accent }}>
          {mood.label}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-zinc-600">
          {mood.description}
        </p>
      </div>
    </button>
  );
}
