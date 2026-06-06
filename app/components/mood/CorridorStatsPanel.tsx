"use client";

import type { RouteMood } from "@/lib/monumation";
import { getMoodTheme } from "@/lib/mood-theme";
import MoodScoreGauge from "@/app/components/mood/MoodScoreGauge";
import MoodVectorBars from "@/app/components/mood/MoodVectorBars";
import ScoreBreakdown from "@/app/components/mood/ScoreBreakdown";

type CorridorStatsPanelProps = {
  mood: RouteMood;
  moodLabel: string;
  distanceM: number;
  summary: {
    placesFound: number;
    streetMoodAverage: number;
    placesMoodScore: number;
    photoVisionAverage?: number;
    combinedScore: number;
    heritageAverage: number;
    scenicAverage: number;
    artsAverage: number;
    promenadeAverage: number;
    corridorVerdict?: string;
  };
  scoringEngine?: "monumation-go" | "nextjs";
};

export default function CorridorStatsPanel({
  mood,
  moodLabel,
  distanceM,
  summary,
  scoringEngine,
}: CorridorStatsPanelProps) {
  const theme = getMoodTheme(mood);

  return (
    <div
      className={`overflow-hidden rounded-2xl border ${theme.border} bg-gradient-to-br ${theme.gradientBold}`}
    >
      <div
        className="border-b px-4 py-3"
        style={{
          borderColor: `${theme.accent}22`,
          background: theme.pattern,
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{theme.emoji}</span>
          <div>
            <p className={`text-sm font-semibold ${theme.text}`}>
              {moodLabel} corridor
            </p>
            <p className="text-[10px] text-zinc-600">
              {(distanceM / 1000).toFixed(2)} km · {summary.placesFound} stops
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-4">
        <div className="flex justify-center py-1">
          <MoodScoreGauge
            score={summary.combinedScore}
            label="Combined mood score"
            accent={theme.accent}
          />
        </div>

        <ScoreBreakdown
          street={summary.streetMoodAverage}
          places={summary.placesMoodScore}
          photo={summary.photoVisionAverage ?? 0}
          combined={summary.combinedScore}
          accent={theme.accent}
        />

        <div className="rounded-xl border border-white/60 bg-white/50 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Mood vector profile
          </p>
          <MoodVectorBars
            heritage={summary.heritageAverage}
            scenic={summary.scenicAverage}
            arts={summary.artsAverage}
            promenade={summary.promenadeAverage}
            highlight={mood}
          />
        </div>

        {scoringEngine && (
          <p className="text-center text-[11px] font-medium text-emerald-800">
            {scoringEngine === "monumation-go"
              ? "⚡ Monumation Engine (Go)"
              : "Next.js scoring fallback"}
          </p>
        )}

        {summary.corridorVerdict && (
          <p
            className={`rounded-xl border px-3 py-2.5 text-xs leading-relaxed ${theme.text}`}
            style={{
              borderColor: `${theme.accent}33`,
              backgroundColor: `${theme.accentMuted}88`,
            }}
          >
            {summary.corridorVerdict}
          </p>
        )}
      </div>
    </div>
  );
}
