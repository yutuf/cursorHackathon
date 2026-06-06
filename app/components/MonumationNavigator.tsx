"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { MonumationScanNode } from "@/app/api/monumation/scan/route";
import KvkkMaskedImage from "@/app/components/KvkkMaskedImage";
import CompareBattleCard from "@/app/components/mood/CompareBattleCard";
import CorridorStatsPanel from "@/app/components/mood/CorridorStatsPanel";
import MoodPickerCard from "@/app/components/mood/MoodPickerCard";
import MoodVectorBars from "@/app/components/mood/MoodVectorBars";
import {
  ROUTE_MOODS,
  type RouteMood,
  scoreForMood,
} from "@/lib/monumation";
import { getMoodTheme } from "@/lib/mood-theme";
import { ISTANBUL_DEMO_ROUTES } from "@/lib/places-mood";
import {
  DEMO_STEPS,
  KVKK_BADGES,
  MISSION_TAGLINE_TR,
  PUBLIC_BENEFIT_PILLARS,
} from "@/lib/public-mission";
import type { EnrichedMoodPlace } from "@/lib/places-vision";
import type { LatLng } from "@/lib/route";

const MonumationMap = dynamic(() => import("@/app/components/MonumationMap"), {
  ssr: false,
});

type ScanResponse = {
  engine: string;
  scoringEngine?: "monumation-go" | "nextjs";
  goEngineOnline?: boolean;
  routeMood: RouteMood;
  coordinates: LatLng[];
  distanceM: number;
  pois: EnrichedMoodPlace[];
  nodes: MonumationScanNode[];
  summary: {
    placesFound: number;
    streetMoodAverage: number;
    placesMoodScore: number;
    photoVisionAverage?: number;
    combinedScore: number;
    moodAverage: number;
    heritageAverage: number;
    scenicAverage: number;
    artsAverage: number;
    promenadeAverage: number;
    corridorVerdict?: string;
  };
};

type CompareCorridor = {
  name: string;
  tip: string;
  label: string;
  distanceM: number;
  summary: {
    placesFound: number;
    placesMoodScore: number;
    photoVisionAverage: number;
    combinedScore: number;
    corridorVerdict: string;
  };
  pois: EnrichedMoodPlace[];
};

type CompareResponse = {
  routeMood: RouteMood;
  winner: "good" | "weak";
  delta: number;
  pitch: string;
  good: CompareCorridor;
  weak: CompareCorridor;
};

export default function MonumationNavigator() {
  const [routeMood, setRouteMood] = useState<RouteMood>("scenic");
  const [start, setStart] = useState<LatLng | null>(null);
  const [end, setEnd] = useState<LatLng | null>(null);
  const [scan, setScan] = useState<ScanResponse | null>(null);
  const [compare, setCompare] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goOnline, setGoOnline] = useState(false);

  const moodMeta = ROUTE_MOODS.find((m) => m.id === routeMood)!;
  const theme = getMoodTheme(routeMood);

  useEffect(() => {
    fetch("/api/monumation/engine")
      .then((r) => r.json())
      .then((body: { goEngineOnline?: boolean }) =>
        setGoOnline(Boolean(body.goEngineOnline)),
      )
      .catch(() => setGoOnline(false));
  }, [scan, compare]);

  async function handleScan() {
    if (!start || !end) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/monumation/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start, end, routeMood }),
      });

      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Scan failed");

      setScan(body as ScanResponse);
    } catch (scanError) {
      setScan(null);
      setError(
        scanError instanceof Error ? scanError.message : "Scan failed",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCompare() {
    setComparing(true);
    setError(null);
    setCompare(null);

    try {
      const response = await fetch("/api/monumation/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeMood }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Compare failed");
      setCompare(body as CompareResponse);
    } catch (compareError) {
      setError(
        compareError instanceof Error ? compareError.message : "Compare failed",
      );
    } finally {
      setComparing(false);
    }
  }

  function handleClear() {
    setStart(null);
    setEnd(null);
    setScan(null);
    setCompare(null);
    setError(null);
  }

  return (
    <div
      className={`min-h-screen bg-gradient-to-b ${theme.gradient} transition-colors duration-500`}
      style={{ backgroundImage: theme.pattern }}
    >
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold shadow-sm"
            style={{ backgroundColor: theme.accentMuted, color: theme.accent }}
          >
            <span>{theme.emoji}</span>
            Monumation
          </div>
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              goOnline
                ? "bg-emerald-100 text-emerald-900"
                : "bg-zinc-100 text-zinc-600"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                goOnline ? "bg-emerald-500" : "bg-zinc-400"
              }`}
            />
            {goOnline
              ? "Monumation Engine (Go / masterfabric-go)"
              : "Go engine offline — Next.js fallback"}
          </div>
        </div>
        <h1 className={`text-3xl font-semibold tracking-tight sm:text-4xl ${theme.text}`}>
          {moodMeta.labelTr}
          <span className="mt-1 block text-lg font-medium text-zinc-600 sm:text-xl">
            Mood-based urban navigation
          </span>
        </h1>
        <p className="max-w-3xl text-zinc-600">{MISSION_TAGLINE_TR}</p>
        <div className="flex flex-wrap gap-2">
          {KVKK_BADGES.map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-900"
            >
              {badge}
            </span>
          ))}
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PUBLIC_BENEFIT_PILLARS.map((pillar) => (
          <article
            key={pillar.id}
            className="rounded-xl border border-zinc-200 bg-white p-4 text-sm"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-700">
              {pillar.titleTr}
            </p>
            <p className="mt-1 font-medium text-zinc-900">{pillar.title}</p>
            <p className="mt-2 text-xs text-zinc-600">{pillar.description}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4">
        <h2 className="text-sm font-semibold text-indigo-950">
          Jury demo script (~2 min)
        </h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-indigo-900">
          {DEMO_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section
        className={`rounded-2xl border ${theme.border} bg-white/60 p-5 shadow-sm backdrop-blur-sm`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
              style={{ backgroundColor: theme.accentMuted }}
            >
              ⚔️
            </span>
            <div>
              <h2 className={`text-sm font-semibold ${theme.text}`}>
                Corridor battle
              </h2>
              <p className="mt-1 text-xs text-zinc-600">
                Same {moodMeta.label.toLowerCase()} — core vs functional stretch
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCompare}
            disabled={comparing}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition ${theme.button} ${theme.buttonHover} disabled:opacity-60`}
          >
            {comparing ? "Comparing..." : `Compare ${theme.emoji} ${moodMeta.label}`}
          </button>
        </div>

        {compare && (
          <div className="mt-4 space-y-3">
            <p
              className="rounded-xl px-4 py-3 text-sm font-medium leading-relaxed"
              style={{
                backgroundColor: theme.accentMuted,
                color: theme.accent,
              }}
            >
              {compare.pitch}
              {compare.delta > 0 && (
                <span className="mt-1 block text-xs opacity-80">
                  Δ {compare.delta} points between corridors
                </span>
              )}
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <CompareBattleCard
                name={compare.good.name}
                label={compare.good.label}
                tip={compare.good.tip}
                distanceM={compare.good.distanceM}
                isWinner={compare.winner === "good"}
                accent={theme.accent}
                summary={compare.good.summary}
                pois={compare.good.pois}
              />
              <CompareBattleCard
                name={compare.weak.name}
                label={compare.weak.label}
                tip={compare.weak.tip}
                distanceM={compare.weak.distanceM}
                isWinner={compare.winner === "weak"}
                accent={theme.accent}
                summary={compare.weak.summary}
                pois={compare.weak.pois}
              />
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-wrap gap-2">
        {ISTANBUL_DEMO_ROUTES.map((demo) => (
          <button
            key={demo.name}
            type="button"
            onClick={() => {
              setRouteMood(demo.mood);
              setStart(demo.start);
              setEnd(demo.end);
              setScan(null);
              setError(null);
            }}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition hover:opacity-90 ${theme.border}`}
            style={{
              backgroundColor: theme.accentMuted,
              color: theme.accent,
            }}
            title={demo.tip}
          >
            Demo: {demo.name}
          </button>
        ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ROUTE_MOODS.map((mood) => (
          <MoodPickerCard
            key={mood.id}
            mood={mood}
            selected={routeMood === mood.id}
            onSelect={setRouteMood}
          />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4">
          <div
            className={`rounded-2xl border ${theme.border} bg-white/70 p-4 text-sm backdrop-blur-sm`}
          >
            <p className={`font-semibold ${theme.text}`}>
              {theme.emoji} Draw your {moodMeta.label.toLowerCase()}
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-zinc-600">
              <li>Click start (green pin)</li>
              <li>Click end (red pin)</li>
              <li>Scan corridor — walking route</li>
            </ol>
          </div>

          {scan?.summary && (
            <CorridorStatsPanel
              mood={routeMood}
              moodLabel={moodMeta.label}
              distanceM={scan.distanceM}
              summary={scan.summary}
              scoringEngine={scan.scoringEngine}
            />
          )}

          <div className="grid gap-2 rounded-2xl border border-zinc-200/80 bg-white/70 p-4 backdrop-blur-sm">
            <button
              type="button"
              onClick={handleScan}
              disabled={!start || !end || loading}
              className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-md transition ${theme.button} ${theme.buttonHover} disabled:opacity-60`}
            >
              {loading
                ? `Scanning ${theme.emoji} corridor...`
                : `Scan ${moodMeta.label}`}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Clear route
            </button>
          </div>
        </div>

        <div
          className={`h-[420px] overflow-hidden rounded-2xl border-2 shadow-lg lg:h-[520px] ${theme.border}`}
          style={{ boxShadow: `0 8px 30px ${theme.accent}22` }}
        >
          <MonumationMap
            start={start}
            end={end}
            coordinates={scan?.coordinates}
            nodes={scan?.nodes}
            pois={scan?.pois}
            routeMood={routeMood}
            onStartSet={(point) => {
              setStart(point);
              setEnd(null);
              setScan(null);
            }}
            onEndSet={setEnd}
          />
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {scan?.pois && scan.pois.length > 0 && (
        <section className="space-y-3">
          <h2 className={`flex items-center gap-2 text-lg font-semibold ${theme.text}`}>
            <span>{theme.emoji}</span>
            Worth visiting along corridor
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {scan.pois.map((poi) => (
              <li
                key={poi.placeId}
                className={`overflow-hidden rounded-xl border bg-white/80 text-sm shadow-sm ${theme.border}`}
              >
                {poi.photoUrl ? (
                  <KvkkMaskedImage
                    src={poi.photoUrl}
                    alt={poi.name}
                    className="h-32 w-full object-cover"
                    kvkkMasked={poi.kvkkMasked ?? true}
                  />
                ) : (
                  <div
                    className="flex h-32 items-center justify-center text-xs"
                    style={{ backgroundColor: theme.accentMuted, color: theme.accent }}
                  >
                    No Places photo
                  </div>
                )}
                <div className="space-y-2 px-4 py-3">
                  <p className="font-medium text-zinc-900">{poi.name}</p>
                  <p className="text-xs text-zinc-600">
                    {poi.vicinity ?? "Along route"} · {poi.distanceToRouteM}m
                  </p>
                  {poi.photoMoodScore !== undefined && (
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-9 min-w-[3rem] items-center justify-center rounded-lg text-sm font-bold text-white"
                        style={{
                          backgroundColor: theme.accent,
                        }}
                      >
                        {poi.photoMoodScore}
                      </div>
                      <p className="text-[11px] leading-tight text-zinc-600">
                        {poi.photoDominantTag}
                        {poi.scoringEngine === "monumation-go" ? " · Go" : ""}
                      </p>
                    </div>
                  )}
                  {poi.photoLabels && poi.photoLabels.length > 0 && (
                    <p className="text-[10px] text-sky-700">
                      ViT: {poi.photoLabels.join(", ")}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {scan?.nodes && scan.nodes.length > 0 && (
        <section className="space-y-4">
          <h2 className={`text-lg font-semibold ${theme.text}`}>
            Street samples · supplementary layer
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {scan.nodes.map((node) => {
              const nodeScore = scoreForMood(node, routeMood);
              return (
              <article
                key={`${node.index}-${node.lat}`}
                className={`overflow-hidden rounded-2xl border bg-white/90 shadow-sm ${theme.border}`}
              >
                {node.imageBase64 ? (
                  <KvkkMaskedImage
                    src={node.imageBase64}
                    alt={`Mood sample ${node.index}`}
                    kvkkMasked={node.kvkkMasked}
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center bg-zinc-100 text-sm text-zinc-500">
                    No Street View ({node.streetViewStatus})
                  </div>
                )}
                <div className="space-y-2 p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-zinc-900">
                      {node.dominant_mood_tag}
                    </p>
                    <span
                      className="rounded-lg px-2 py-0.5 text-[11px] font-bold text-white"
                      style={{ backgroundColor: theme.accent }}
                    >
                      {nodeScore}
                    </span>
                  </div>
                  {node.rawMoodScore !== undefined && node.poiBoost ? (
                    <p className="text-zinc-500">
                      Vision {node.rawMoodScore} + landmark +{node.poiBoost}
                    </p>
                  ) : null}
                  <MoodVectorBars
                    heritage={node.heritage_score}
                    scenic={node.scenic_score}
                    arts={node.art_score}
                    promenade={node.promenade_score}
                    highlight={routeMood}
                  />
                  {node.visionLabels && node.visionLabels.length > 0 && (
                    <p className="text-zinc-400">
                      ViT: {node.visionLabels.slice(0, 6).join(", ")}
                    </p>
                  )}
                  {node.nearbyPoi && (
                    <p className="text-sky-800">
                      Near: {node.nearbyPoi}
                      {node.poiDistanceM ? ` (${node.poiDistanceM}m)` : ""}
                    </p>
                  )}
                  {node.scoringEngine === "monumation-go" && (
                    <p className="text-emerald-800">Scored by Go engine</p>
                  )}
                </div>
              </article>
            );
            })}
          </div>
        </section>
      )}

      <footer className="rounded-2xl border border-white/60 bg-white/50 px-5 py-4 text-center text-xs text-zinc-500 backdrop-blur-sm">
        Monumation · Cursor Hackathon Istanbul · {theme.emoji} {moodMeta.labelTr}
      </footer>
    </div>
    </div>
  );
}
