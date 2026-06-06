"use client";

import type { RouteMood } from "@/lib/monumation";
import { getMoodTheme, scoreTierColor } from "@/lib/mood-theme";
import type { EnrichedMoodPlace } from "@/lib/places-vision";
import KvkkMaskedImage from "@/app/components/KvkkMaskedImage";

type CompareBattleCardProps = {
  name: string;
  label: string;
  tip: string;
  distanceM: number;
  isWinner: boolean;
  mood: RouteMood;
  summary: {
    placesFound: number;
    placesMoodScore: number;
    photoVisionAverage: number;
    combinedScore: number;
  };
  pois: EnrichedMoodPlace[];
};

export default function CompareBattleCard({
  name,
  label,
  tip,
  distanceM,
  isWinner,
  mood,
  summary,
  pois,
}: CompareBattleCardProps) {
  const theme = getMoodTheme(mood);
  const tier = scoreTierColor(summary.combinedScore, theme.accent);

  return (
    <article
      className={`relative overflow-hidden p-4 transition-all ${theme.card} ${
        isWinner ? "" : "opacity-85"
      }`}
      style={{
        outline: isWinner ? `2px solid ${theme.accent}` : undefined,
        outlineOffset: isWinner ? "2px" : undefined,
      }}
    >
      {isWinner && (
        <span
          className={`absolute right-3 top-3 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white ${theme.fontDisplay}`}
          style={{ backgroundColor: theme.accent }}
        >
          {theme.ornament} chosen
        </span>
      )}

      <p
        className={`text-[9px] font-semibold uppercase tracking-[0.15em] ${theme.fontDisplay}`}
        style={{ color: theme.inkMuted }}
      >
        {label}
      </p>
      <p
        className={`mt-1 pr-16 text-sm font-semibold ${theme.fontDisplay}`}
        style={{ color: theme.ink }}
      >
        {name}
      </p>
      <p className="mt-1 text-xs italic" style={{ color: theme.inkMuted }}>
        {tip}
      </p>

      <div className="mt-4 flex items-center gap-4">
        <div
          className={`flex h-14 w-14 flex-col items-center justify-center ${theme.fontDisplay}`}
          style={{
            backgroundColor: isWinner ? tier : `${theme.inkMuted}55`,
            color: isWinner ? "#fffaf5" : theme.ink,
            borderRadius: mood === "scenic" ? "9999px" : mood === "arts" ? "0" : "4px",
          }}
        >
          <span className="text-xl font-bold tabular-nums">{summary.combinedScore}</span>
        </div>
        <dl className="grid flex-1 grid-cols-2 gap-x-3 gap-y-2 text-xs">
          <div>
            <dt style={{ color: theme.inkMuted }}>POIs</dt>
            <dd className="font-bold" style={{ color: theme.ink }}>
              {summary.placesFound}
            </dd>
          </div>
          <div>
            <dt style={{ color: theme.inkMuted }}>Photo AI</dt>
            <dd className="font-bold" style={{ color: theme.accent }}>
              {summary.photoVisionAverage}
            </dd>
          </div>
          <div>
            <dt style={{ color: theme.inkMuted }}>Places</dt>
            <dd className="font-bold" style={{ color: theme.ink }}>
              {summary.placesMoodScore}
            </dd>
          </div>
          <div>
            <dt style={{ color: theme.inkMuted }}>Length</dt>
            <dd className="font-bold" style={{ color: theme.ink }}>
              {(distanceM / 1000).toFixed(1)} km
            </dd>
          </div>
        </dl>
      </div>

      {pois[0]?.photoUrl && (
        <div className="mt-3 flex gap-2">
          {pois.slice(0, 2).map((poi) =>
            poi.photoUrl ? (
              <div key={poi.placeId} className={`flex-1 overflow-hidden ${theme.sampleFrame}`}>
                <KvkkMaskedImage
                  src={poi.photoUrl}
                  alt={poi.name}
                  className="h-20 w-full object-cover"
                />
                <div className="px-2 py-1.5" style={{ backgroundColor: theme.accentMuted }}>
                  <p
                    className="truncate text-[10px] font-medium"
                    style={{ color: theme.ink }}
                  >
                    {poi.name}
                  </p>
                  <p className="text-[10px] font-semibold" style={{ color: theme.accent }}>
                    {poi.photoMoodScore ?? "—"}
                  </p>
                </div>
              </div>
            ) : null,
          )}
        </div>
      )}
    </article>
  );
}
