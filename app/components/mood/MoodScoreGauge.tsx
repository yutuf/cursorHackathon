"use client";

import { scoreLabel, scoreTierColor } from "@/lib/mood-theme";

type MoodScoreGaugeProps = {
  score: number;
  label: string;
  accent: string;
  size?: "sm" | "lg";
};

export default function MoodScoreGauge({
  score,
  label,
  accent,
  size = "lg",
}: MoodScoreGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = size === "lg" ? 52 : 36;
  const stroke = size === "lg" ? 8 : 6;
  const cx = radius + stroke;
  const cy = radius + stroke;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const dim = (radius + stroke) * 2;
  const tierColor = scoreTierColor(clamped);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} className="-rotate-90">
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-black/5"
          />
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={tierColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`font-bold tabular-nums ${
              size === "lg" ? "text-3xl" : "text-xl"
            }`}
            style={{ color: accent }}
          >
            {clamped}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            / 100
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold text-zinc-800">{label}</p>
        <p className="text-[10px] text-zinc-500">{scoreLabel(clamped)}</p>
      </div>
    </div>
  );
}
