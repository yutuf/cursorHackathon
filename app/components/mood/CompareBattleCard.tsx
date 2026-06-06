"use client";

import { scoreTierColor } from "@/lib/mood-theme";
import type { EnrichedMoodPlace } from "@/lib/places-vision";
import KvkkMaskedImage from "@/app/components/KvkkMaskedImage";

type CompareBattleCardProps = {
  name: string;
  label: string;
  tip: string;
  distanceM: number;
  isWinner: boolean;
  accent: string;
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
  accent,
  summary,
  pois,
}: CompareBattleCardProps) {
  const tier = scoreTierColor(summary.combinedScore);

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border p-4 transition-all ${
        isWinner
          ? "border-emerald-400/80 bg-gradient-to-br from-emerald-50 to-white shadow-lg shadow-emerald-100/80"
          : "border-zinc-200/80 bg-white/70"
      }`}
    >
      {isWinner && (
        <span className="absolute right-3 top-3 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          Winner
        </span>
      )}

      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1 pr-16 text-sm font-semibold text-zinc-900">{name}</p>
      <p className="mt-1 text-xs text-zinc-600">{tip}</p>

      <div className="mt-4 flex items-center gap-4">
        <div
          className="flex h-16 w-16 flex-col items-center justify-center rounded-2xl text-white shadow-md"
          style={{ backgroundColor: isWinner ? tier : "#a1a1aa" }}
        >
          <span className="text-2xl font-bold tabular-nums">
            {summary.combinedScore}
          </span>
          <span className="text-[9px] font-medium opacity-90">/100</span>
        </div>
        <dl className="grid flex-1 grid-cols-2 gap-x-3 gap-y-2 text-xs">
          <div>
            <dt className="text-zinc-500">POIs</dt>
            <dd className="font-bold text-zinc-900">{summary.placesFound}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Photo AI</dt>
            <dd className="font-bold" style={{ color: accent }}>
              {summary.photoVisionAverage}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Places</dt>
            <dd className="font-bold text-zinc-900">{summary.placesMoodScore}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Length</dt>
            <dd className="font-bold text-zinc-900">
              {(distanceM / 1000).toFixed(1)} km
            </dd>
          </div>
        </dl>
      </div>

      {pois[0]?.photoUrl && (
        <div className="mt-3 flex gap-2">
          {pois.slice(0, 2).map((poi) =>
            poi.photoUrl ? (
              <div
                key={poi.placeId}
                className="flex-1 overflow-hidden rounded-xl border border-white/80 shadow-sm"
              >
                <KvkkMaskedImage
                  src={poi.photoUrl}
                  alt={poi.name}
                  className="h-20 w-full object-cover"
                  kvkkMasked={poi.kvkkMasked ?? true}
                />
                <div className="bg-white/90 px-2 py-1.5">
                  <p className="truncate text-[10px] font-medium">{poi.name}</p>
                  <p className="text-[10px] font-semibold" style={{ color: accent }}>
                    AI {poi.photoMoodScore ?? "—"}
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
