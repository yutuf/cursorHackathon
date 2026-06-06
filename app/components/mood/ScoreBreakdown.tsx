"use client";

import { scoreTierColor } from "@/lib/mood-theme";

type ScoreBreakdownProps = {
  street: number;
  places: number;
  photo: number;
  combined: number;
  accent: string;
};

export default function ScoreBreakdown({
  street,
  places,
  photo,
  combined,
  accent,
}: ScoreBreakdownProps) {
  const layers = [
    { label: "Street View + AI", value: street, weight: "35%" },
    { label: "Places density", value: places, weight: "35%" },
    { label: "Landmark photos", value: photo, weight: "30%" },
  ].filter((layer) => layer.value > 0 || layer.label === "Places density");

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Score breakdown
          </p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums" style={{ color: accent }}>
            {combined}
            <span className="text-sm font-medium text-zinc-400"> /100</span>
          </p>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-bold text-white"
          style={{ backgroundColor: scoreTierColor(combined) }}
        >
          {combined >= 70 ? "A" : combined >= 45 ? "B" : combined >= 25 ? "C" : "D"}
        </span>
      </div>

      <div className="grid gap-2">
        {layers.map((layer) => (
          <div
            key={layer.label}
            className="flex items-center gap-3 rounded-lg bg-white/60 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-zinc-700">
                {layer.label}
              </p>
              <p className="text-[10px] text-zinc-400">weight ~{layer.weight}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-black/5">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${layer.value}%`,
                    backgroundColor: scoreTierColor(layer.value),
                  }}
                />
              </div>
              <span className="w-8 text-right text-sm font-bold tabular-nums text-zinc-800">
                {layer.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
