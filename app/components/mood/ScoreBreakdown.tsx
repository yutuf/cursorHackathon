"use client";

import { scoreTierColor } from "@/lib/mood-theme";

type ScoreBreakdownProps = {
  street: number;
  places: number;
  photo: number;
  combined: number;
  accent: string;
  ink?: string;
  inkMuted?: string;
};

export default function ScoreBreakdown({
  street,
  places,
  photo,
  combined,
  accent,
  ink = "#1a1a1a",
  inkMuted = "#6b7280",
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
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: inkMuted }}
          >
            Score breakdown
          </p>
          <p
            className="mt-0.5 text-2xl font-bold tabular-nums"
            style={{ color: accent }}
          >
            {combined}
            <span className="text-sm font-normal opacity-50"> /100</span>
          </p>
        </div>
        <span
          className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
          style={{
            backgroundColor: scoreTierColor(combined, accent),
            borderRadius: "2px",
          }}
        >
          {combined >= 70 ? "A" : combined >= 45 ? "B" : combined >= 25 ? "C" : "D"}
        </span>
      </div>

      <div className="grid gap-2">
        {layers.map((layer) => (
          <div
            key={layer.label}
            className="flex items-center gap-3 px-1 py-1.5"
            style={{ borderBottom: `1px solid ${accent}18` }}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium" style={{ color: ink }}>
                {layer.label}
              </p>
              <p className="text-[10px]" style={{ color: inkMuted }}>
                ~{layer.weight}
              </p>
            </div>
            <span
              className="w-8 text-right text-sm font-bold tabular-nums"
              style={{ color: ink }}
            >
              {layer.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
