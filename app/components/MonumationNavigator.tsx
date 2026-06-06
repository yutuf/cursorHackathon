"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
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
import { DEMO_ROUTES } from "@/lib/places-mood";
import { DEFAULT_MAP_CENTER } from "@/lib/streetview";
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
  const [mapCenter, setMapCenter] = useState<LatLng>(DEFAULT_MAP_CENTER);
  const [validatingPin, setValidatingPin] = useState(false);

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

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setMapCenter({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  }, []);

  async function validatePoint(point: LatLng): Promise<boolean> {
    setValidatingPin(true);
    try {
      const response = await fetch("/api/monumation/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ point }),
      });
      const body = (await response.json()) as { ok?: boolean; reason?: string };
      if (!body.ok) {
        setError(body.reason ?? "That point is not walkable.");
        return false;
      }
      setError(null);
      return true;
    } catch {
      setError("Could not verify that location.");
      return false;
    } finally {
      setValidatingPin(false);
    }
  }

  async function handleMapStart(point: LatLng) {
    const ok = await validatePoint(point);
    if (!ok) return;
    setStart(point);
    setEnd(null);
    setScan(null);
  }

  async function handleMapEnd(point: LatLng) {
    const ok = await validatePoint(point);
    if (!ok) return;
    setEnd(point);
  }

  async function handleScan() {
    if (!start || !end) return;

    setLoading(true);
    setError(null);

    try {
      const guard = await fetch("/api/monumation/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start, end }),
      });
      const guardBody = (await guard.json()) as { ok?: boolean; reason?: string };
      if (!guardBody.ok) {
        throw new Error(guardBody.reason ?? "Route is not walkable.");
      }

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
      className={`min-h-screen transition-all duration-700 ${theme.page} ${theme.fontBody}`}
      data-mood={routeMood}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-6 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-4" style={{ borderColor: `${theme.accent}30` }}>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className={`inline-flex items-center gap-2 px-2 py-1 transition hover:opacity-80 ${theme.fontDisplay}`}
              style={{ color: theme.ink }}
            >
              <span>{theme.emoji}</span>
              <span className="text-lg font-semibold">Monumation</span>
            </Link>
            <span className="text-xs opacity-40">|</span>
            <div>
              <p className={`text-sm font-semibold ${theme.fontDisplay}`} style={{ color: theme.ink }}>
                {moodMeta.labelTr}
              </p>
              <p className="text-[10px] italic" style={{ color: theme.inkMuted }}>
                {theme.vibe}
              </p>
            </div>
          </div>
          <p
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: goOnline ? theme.accent : theme.inkMuted }}
          >
            {goOnline ? `${theme.ornament} engine live` : "fallback mode"}
          </p>
        </header>

        <section className={`p-5 ${theme.panel}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className={`text-base font-semibold ${theme.fontDisplay}`} style={{ color: theme.ink }}>
                Corridor duel
              </h2>
              <p className="mt-1 text-xs italic" style={{ color: theme.inkMuted }}>
                Mood-picked corridor vs blind functional path
              </p>
            </div>
            <button
              type="button"
              onClick={handleCompare}
              disabled={comparing}
              className={`rounded-sm px-5 py-2.5 transition disabled:opacity-60 ${theme.button} ${theme.buttonHover}`}
            >
              {comparing ? "Dueling…" : `Compare ${theme.emoji}`}
            </button>
          </div>

          {compare && (
            <div className="mt-5 space-y-3">
              <p
                className={`px-4 py-3 text-sm leading-relaxed italic ${theme.fontBody}`}
                style={{
                  color: theme.ink,
                  backgroundColor: theme.accentMuted,
                  borderLeft: `3px solid ${theme.accent}`,
                }}
              >
                {compare.pitch}
                {compare.delta > 0 && (
                  <span className="mt-1 block text-xs not-italic opacity-70">
                    Δ {compare.delta} between corridors
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
                  mood={routeMood}
                  summary={compare.good.summary}
                  pois={compare.good.pois}
                />
                <CompareBattleCard
                  name={compare.weak.name}
                  label={compare.weak.label}
                  tip={compare.weak.tip}
                  distanceM={compare.weak.distanceM}
                  isWinner={compare.winner === "weak"}
                  mood={routeMood}
                  summary={compare.weak.summary}
                  pois={compare.weak.pois}
                />
              </div>
            </div>
          )}
        </section>

        <section className="space-y-2">
          <p className="text-xs italic" style={{ color: theme.inkMuted }}>
            Tap any city on the map. Demo chips are Istanbul hackathon examples.
          </p>
          <div className="flex flex-wrap gap-2">
            {DEMO_ROUTES.map((demo) => (
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
                className={`px-3 py-1.5 text-xs transition hover:opacity-90 ${theme.buttonGhost}`}
                title={demo.tip}
              >
                {demo.name}
              </button>
            ))}
          </div>
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

        <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-4">
            <div className={`p-4 text-sm ${theme.panel}`}>
              <p className={`font-semibold ${theme.fontDisplay}`} style={{ color: theme.ink }}>
                {theme.emoji} Plot your walk
              </p>
              <ol
                className="mt-3 list-decimal space-y-1.5 pl-4 text-xs leading-relaxed"
                style={{ color: theme.inkMuted }}
              >
              <li>Green pin — start on land (not sea)</li>
              <li>Red pin — end on a walkable street</li>
              <li>Scan — mood score along the corridor</li>
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

            <div className={`grid gap-2 p-4 ${theme.panel}`}>
              <button
                type="button"
                onClick={handleScan}
                disabled={!start || !end || loading || validatingPin}
                className={`w-full px-4 py-3 transition disabled:opacity-50 ${theme.button} ${theme.buttonHover}`}
              >
                {loading
                  ? `Reading the street…`
                  : validatingPin
                    ? `Checking pin…`
                    : `Scan corridor`}
              </button>
              <button
                type="button"
                onClick={handleClear}
                className={`w-full px-4 py-2.5 text-sm transition ${theme.buttonGhost}`}
              >
                Clear
              </button>
            </div>
          </div>

          <div
            className={`h-[420px] overflow-hidden lg:h-[520px] ${theme.sampleFrame}`}
            style={{ boxShadow: `0 12px 40px ${theme.accent}18` }}
          >
            <MonumationMap
              center={mapCenter}
              start={start}
              end={end}
              coordinates={scan?.coordinates}
              nodes={scan?.nodes}
              pois={scan?.pois}
              routeMood={routeMood}
            onStartSet={handleMapStart}
            onEndSet={handleMapEnd}
            />
          </div>
        </section>

        {error && (
          <div
            className="border-l-4 px-4 py-3 text-sm"
            style={{
              borderColor: "#8b3a3a",
              backgroundColor: "#f5e6e6",
              color: "#5c2020",
            }}
          >
            {error}
          </div>
        )}

        {scan?.nodes && scan.nodes.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2
                className={`text-lg font-semibold ${theme.fontDisplay}`}
                style={{ color: theme.ink }}
              >
                Street samples
              </h2>
              <p className="mt-1 text-xs italic" style={{ color: theme.inkMuted }}>
                What the corridor looks like along your walk
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {scan.nodes
                .filter((node) => node.imageBase64)
                .slice(0, 6)
                .map((node) => {
                  const nodeScore = scoreForMood(node, routeMood);
                  const lowConfidence =
                    routeMood === "promenade" &&
                    nodeScore > 40 &&
                    node.promenade_score <= 38;
                  return (
                    <article
                      key={`${node.index}-${node.lat}`}
                      className={`overflow-hidden ${theme.sampleFrame}`}
                    >
                      <KvkkMaskedImage
                        src={node.imageBase64!}
                        alt={`Mood sample ${node.index}`}
                      />
                      <div className="space-y-2 p-3 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`font-semibold ${theme.fontDisplay}`}
                            style={{ color: theme.ink }}
                          >
                            {node.dominant_mood_tag}
                          </p>
                          <span
                            className={`px-2 py-0.5 font-bold tabular-nums ${theme.fontDisplay}`}
                            style={{
                              backgroundColor: theme.accent,
                              color: "#fffaf5",
                            }}
                          >
                            {nodeScore}
                          </span>
                        </div>
                        {lowConfidence && (
                          <p className="italic" style={{ color: theme.accentSoft }}>
                            Low confidence — generic storefront
                          </p>
                        )}
                        <MoodVectorBars
                          heritage={node.heritage_score}
                          scenic={node.scenic_score}
                          arts={node.art_score}
                          promenade={node.promenade_score}
                          highlight={routeMood}
                        />
                        {node.visionLabels && node.visionLabels.length > 0 && (
                          <p style={{ color: theme.inkMuted }}>
                            {node.visionLabels.slice(0, 5).join(" · ")}
                          </p>
                        )}
                        {node.nearbyPoi && (
                          <p style={{ color: theme.accentSoft }}>
                            Near {node.nearbyPoi}
                            {node.poiDistanceM ? ` · ${node.poiDistanceM}m` : ""}
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}
            </div>
          </section>
        )}

        {scan && (scan.summary.placesFound ?? 0) > 0 && (
          <section className="space-y-3">
            <div>
              <h2
                className={`flex items-center gap-2 text-lg font-semibold ${theme.fontDisplay}`}
                style={{ color: theme.ink }}
              >
                <span>{theme.emoji}</span>
                Landmarks
              </h2>
              <p className="mt-1 text-xs italic" style={{ color: theme.inkMuted }}>
                {scan.summary.placesFound} photo-backed stops
                {scan.pois.length > 0
                  ? ` · top ${scan.pois.length} scored with vision`
                  : ""}
              </p>
            </div>
            {scan.pois.length > 0 && (
              <ul className="grid gap-3 sm:grid-cols-2">
                {scan.pois.map((poi) => (
                  <li
                    key={poi.placeId}
                    className={`overflow-hidden text-sm ${theme.sampleFrame}`}
                  >
                    <KvkkMaskedImage
                      src={poi.photoUrl!}
                      alt={poi.name}
                      className="h-36 w-full object-cover"
                    />
                    <div className="space-y-2 px-4 py-3">
                      <p className={`font-medium ${theme.fontDisplay}`} style={{ color: theme.ink }}>
                        {poi.name}
                      </p>
                      <p className="text-xs" style={{ color: theme.inkMuted }}>
                        {poi.vicinity ?? "Along route"} · {poi.distanceToRouteM}m
                      </p>
                      {poi.photoMoodScore !== undefined && (
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-8 min-w-[2.5rem] items-center justify-center text-sm font-bold ${theme.fontDisplay}`}
                            style={{
                              backgroundColor: theme.accent,
                              color: "#fffaf5",
                            }}
                          >
                            {poi.photoMoodScore}
                          </span>
                          <p className="text-[11px] italic" style={{ color: theme.inkMuted }}>
                            {poi.photoDominantTag}
                          </p>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <footer className="border-t pt-4 text-center text-xs italic" style={{ borderColor: `${theme.accent}25`, color: theme.inkMuted }}>
          <Link href="/" className="hover:underline" style={{ color: theme.accent }}>
            ← Landing
          </Link>
        </footer>
      </div>
    </div>
  );
}
