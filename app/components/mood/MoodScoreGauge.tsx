"use client";

import { scoreLabel, scoreTierColor } from "@/lib/mood-theme";

type MoodScoreGaugeProps = {
  score: number;
  label: string;
  accent: string;
  fontDisplay?: string;
  size?: "sm" | "lg";
};

export default function MoodScoreGauge({
  score,
  label,
  accent,
  fontDisplay = "",
  size = "lg",
}: MoodScoreGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = size === "lg" ? 48 : 34;
  const stroke = size === "lg" ? 5 : 4;
  const cx = radius + stroke;
  const cy = radius + stroke;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const dim = (radius + stroke) * 2;
  const tierColor = scoreTierColor(clamped, accent);

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
            style={{ color: `${accent}22` }}
          />
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={tierColor}
            strokeWidth={stroke}
            strokeLinecap="square"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`${fontDisplay} font-bold tabular-nums ${
              size === "lg" ? "text-3xl" : "text-xl"
            }`}
            style={{ color: accent }}
          >
            {clamped}
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className={`text-xs font-semibold ${fontDisplay}`} style={{ color: accent }}>
          {label}
        </p>
        <p className="text-[10px] italic opacity-70">{scoreLabel(clamped)}</p>
      </div>
    </div>
  );
}
