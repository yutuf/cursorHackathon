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
  durationS?: number;
  straightM?: number;
  samplePoints?: number;
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

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `~${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
}

export default function CorridorStatsPanel({
  mood,
  moodLabel,
  distanceM,
  durationS,
  straightM,
  samplePoints,
  summary,
  scoringEngine,
}: CorridorStatsPanelProps) {
  const theme = getMoodTheme(mood);
  const poisPerKm =
    distanceM > 0
      ? (summary.placesFound / (distanceM / 1000)).toFixed(1)
      : null;

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
              {(distanceM / 1000).toFixed(2)} km
              {durationS ? ` · ${formatDuration(durationS)}` : ""}
              {straightM ? ` · ${(straightM / 1000).toFixed(2)} km direct` : ""}
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

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-b pb-4 text-xs" style={{ borderColor: `${theme.accent}18` }}>
          <div>
            <dt style={{ color: theme.inkMuted }}>Landmarks</dt>
            <dd className="font-bold tabular-nums" style={{ color: theme.ink }}>
              {summary.placesFound}
            </dd>
          </div>
          <div>
            <dt style={{ color: theme.inkMuted }}>POIs / km</dt>
            <dd className="font-bold tabular-nums" style={{ color: theme.ink }}>
              {poisPerKm ?? "—"}
            </dd>
          </div>
          {samplePoints !== undefined && (
            <div>
              <dt style={{ color: theme.inkMuted }}>Street samples</dt>
              <dd className="font-bold tabular-nums" style={{ color: theme.ink }}>
                {samplePoints}
              </dd>
            </div>
          )}
          {straightM !== undefined && distanceM > 0 && (
            <div>
              <dt style={{ color: theme.inkMuted }}>Detour</dt>
              <dd className="font-bold tabular-nums" style={{ color: theme.ink }}>
                {(distanceM / straightM).toFixed(2)}×
              </dd>
            </div>
          )}
        </dl>

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
