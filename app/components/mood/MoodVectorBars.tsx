"use client";

import { ROUTE_MOODS } from "@/lib/monumation";

type MoodVectorBarsProps = {
  heritage: number;
  scenic: number;
  arts: number;
  promenade: number;
  highlight?: "heritage" | "scenic" | "arts" | "promenade";
};

const VECTORS = [
  { key: "heritage" as const, label: "Heritage", short: "H" },
  { key: "scenic" as const, label: "Scenic", short: "S" },
  { key: "arts" as const, label: "Arts", short: "A" },
  { key: "promenade" as const, label: "Promenade", short: "P" },
];

export default function MoodVectorBars({
  heritage,
  scenic,
  arts,
  promenade,
  highlight,
}: MoodVectorBarsProps) {
  const values = { heritage, scenic, arts, promenade };

  return (
    <div className="space-y-2.5">
      {VECTORS.map((vector) => {
        const value = values[vector.key];
        const moodColor =
          ROUTE_MOODS.find((m) => m.id === vector.key)?.color ?? "#6366f1";
        const isHighlight = highlight === vector.key;

        return (
          <div key={vector.key} className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span
                className={`font-medium ${isHighlight ? "text-zinc-900" : "text-zinc-500"}`}
              >
                {vector.label}
                {isHighlight ? " · selected" : ""}
              </span>
              <span
                className="tabular-nums font-semibold"
                style={{ color: isHighlight ? moodColor : undefined }}
              >
                {value}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/5">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${Math.max(4, value)}%`,
                  backgroundColor: moodColor,
                  opacity: isHighlight ? 1 : 0.55,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
