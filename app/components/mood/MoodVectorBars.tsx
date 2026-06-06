"use client";

import { ROUTE_MOODS, type RouteMood } from "@/lib/monumation";
import { getMoodTheme } from "@/lib/mood-theme";

type MoodVectorBarsProps = {
  heritage: number;
  scenic: number;
  arts: number;
  promenade: number;
  highlight?: RouteMood;
};

const VECTORS = [
  { key: "heritage" as const, label: "Heritage" },
  { key: "scenic" as const, label: "Scenic" },
  { key: "arts" as const, label: "Arts" },
  { key: "promenade" as const, label: "Promenade" },
];

export default function MoodVectorBars({
  heritage,
  scenic,
  arts,
  promenade,
  highlight,
}: MoodVectorBarsProps) {
  const values = { heritage, scenic, arts, promenade };
  const activeTheme = highlight ? getMoodTheme(highlight) : null;

  return (
    <div className="space-y-3">
      {VECTORS.map((vector) => {
        const value = values[vector.key];
        const moodColor =
          ROUTE_MOODS.find((m) => m.id === vector.key)?.color ?? "#6366f1";
        const isHighlight = highlight === vector.key;

        return (
          <div key={vector.key} className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span
                className={`${activeTheme?.fontDisplay ?? ""} font-medium`}
                style={{
                  color: isHighlight
                    ? activeTheme?.ink ?? "#1a1a1a"
                    : activeTheme?.inkMuted ?? "#6b7280",
                }}
              >
                {vector.label}
                {isHighlight ? ` ${activeTheme?.ornament ?? "·"}` : ""}
              </span>
              <span
                className="tabular-nums font-semibold"
                style={{ color: isHighlight ? moodColor : activeTheme?.inkMuted }}
              >
                {value}
              </span>
            </div>
            <div
              className="h-1.5 overflow-hidden"
              style={{
                backgroundColor: `${activeTheme?.accent ?? "#000"}12`,
                borderRadius: vector.key === "scenic" ? "9999px" : "2px",
              }}
            >
              <div
                className="h-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.max(4, value)}%`,
                  backgroundColor: moodColor,
                  opacity: isHighlight ? 1 : 0.45,
                  borderRadius: vector.key === "scenic" ? "9999px" : "2px",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
