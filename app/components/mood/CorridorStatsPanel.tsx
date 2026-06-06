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
    <div className={`overflow-hidden ${theme.panel}`}>
      <div
        className="border-b px-4 py-3"
        style={{ borderColor: `${theme.accent}25` }}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{theme.emoji}</span>
          <div>
            <p className={`text-sm font-semibold ${theme.fontDisplay}`} style={{ color: theme.ink }}>
              {moodLabel}
            </p>
            <p className="text-[10px] italic" style={{ color: theme.inkMuted }}>
              {(distanceM / 1000).toFixed(2)} km · {summary.placesFound} stops · {theme.vibe}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-4">
        <div className="flex justify-center py-1">
          <MoodScoreGauge
            score={summary.combinedScore}
            label="Corridor score"
            accent={theme.accent}
            fontDisplay={theme.fontDisplay}
          />
        </div>

        <ScoreBreakdown
          street={summary.streetMoodAverage}
          places={summary.placesMoodScore}
          photo={summary.photoVisionAverage ?? 0}
          combined={summary.combinedScore}
          accent={theme.accent}
          ink={theme.ink}
          inkMuted={theme.inkMuted}
        />

        <div className="pt-1">
          <p
            className={`mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] ${theme.fontDisplay}`}
            style={{ color: theme.inkMuted }}
          >
            Mood vectors
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
          <p
            className="text-center text-[11px] font-medium"
            style={{ color: theme.accentSoft }}
          >
            {scoringEngine === "monumation-go"
              ? `${theme.ornament} Go engine`
              : "Next.js fallback"}
          </p>
        )}

        {summary.corridorVerdict && (
          <p
            className={`px-3 py-2.5 text-xs leading-relaxed italic ${theme.fontBody}`}
            style={{
              color: theme.ink,
              backgroundColor: theme.accentMuted,
              borderLeft: `3px solid ${theme.accent}`,
            }}
          >
            {summary.corridorVerdict}
          </p>
        )}
      </div>
    </div>
  );
}
