"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import type { ScanResult } from "@/app/api/streetview/scan/route";
import {
  BUSINESS_CATEGORIES,
  OPPORTUNITY_STYLES,
  type BusinessCategory,
  type OpportunitySummary,
} from "@/lib/bulan";
import type { AreaBounds } from "@/lib/area";
import { boundsCenter } from "@/lib/area";
import {
  KVKK_BADGES,
  MISSION_TAGLINE,
  MISSION_TAGLINE_TR,
  PUBLIC_BENEFIT_PILLARS,
} from "@/lib/public-mission";
import { ISTANBUL_PRESETS } from "@/lib/streetview";
import type { LatLng, RouteScanWarning, RouteWaypoint } from "@/lib/route";

const RouteMap = dynamic(() => import("@/app/components/RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-100 text-sm text-zinc-500">
      Loading map...
    </div>
  ),
});

type AreaResponse = {
  bounds: AreaBounds;
  widthM: number;
  heightM: number;
  areaM2: number;
  coordinates: LatLng[];
  waypoints: RouteWaypoint[];
  sampleIntervalM: number;
  estimatedApiCalls: number;
  scanWarning: RouteScanWarning | null;
  geometrySource?: string;
  distanceM?: number;
};

type ScanResponse = {
  results: ScanResult[];
  businessCategory: BusinessCategory;
  summary: {
    total: number;
    available: number;
    unavailable: number;
    apiCallsUsed: number;
    opportunities: OpportunitySummary;
  };
};

const MAP_CENTER = ISTANBUL_PRESETS[0];

export default function BulanScanner() {
  const [businessCategory, setBusinessCategory] =
    useState<BusinessCategory>("coffee_shop");
  const [areaBounds, setAreaBounds] = useState<AreaBounds | null>(null);
  const [previewBounds, setPreviewBounds] = useState<AreaBounds | null>(null);
  const [areaPlan, setAreaPlan] = useState<AreaResponse | null>(null);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunitySummary | null>(
    null,
  );
  const [routeLoading, setRouteLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [briefLoading, setBriefLoading] = useState(false);
  const [brief, setBrief] = useState<string | null>(null);
  const [briefSource, setBriefSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadArea = useCallback(async (bounds: AreaBounds) => {
    setRouteLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bounds }),
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to plan area scan");
      }

      setAreaPlan(body as AreaResponse);
      setScanResults([]);
      setOpportunities(null);
      setBrief(null);
      setBriefSource(null);
    } catch (areaError) {
      setAreaPlan(null);
      setError(
        areaError instanceof Error
          ? areaError.message
          : "Failed to plan area scan",
      );
    } finally {
      setRouteLoading(false);
    }
  }, []);

  function handleBoundsDrawn(bounds: AreaBounds) {
    setError(null);
    setAreaBounds(bounds);
    void loadArea(bounds);
  }

  function handleClear() {
    setAreaBounds(null);
    setPreviewBounds(null);
    setAreaPlan(null);
    setScanResults([]);
    setOpportunities(null);
    setBrief(null);
    setBriefSource(null);
    setError(null);
  }

  async function handleScan() {
    if (!areaPlan?.waypoints.length) return;

    if (areaPlan.scanWarning) {
      const proceed = window.confirm(
        `${areaPlan.scanWarning.title}\n\n${areaPlan.scanWarning.message}\n\n${areaPlan.scanWarning.suggestion}\n\nScan this area anyway?`,
      );
      if (!proceed) return;
    }

    setScanLoading(true);
    setError(null);
    setBrief(null);
    setBriefSource(null);

    try {
      const response = await fetch("/api/streetview/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waypoints: areaPlan.waypoints,
          includeImages: true,
          businessCategory,
        }),
      });

      const body = (await response.json()) as ScanResponse & { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Area scan failed");
      }

      setScanResults(body.results);
      setOpportunities(body.summary.opportunities);
    } catch (scanError) {
      setError(
        scanError instanceof Error ? scanError.message : "Area scan failed",
      );
    } finally {
      setScanLoading(false);
    }
  }

  async function handleGenerateBrief() {
    if (!opportunities || !scanResults.length) return;

    setBriefLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/opportunity-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessCategory,
          corridor: {
            distanceM: areaPlan?.areaM2,
            samplePoints: areaPlan?.waypoints.length,
          },
          opportunities,
          detections: scanResults.map((result) => ({
            distanceM: result.distanceM,
            side: result.side,
            objectType: result.detection?.objectType ?? "unknown",
            confidence: result.detection?.confidence ?? 0,
            signText: result.detection?.signText,
            caption: result.detection?.caption,
          })),
        }),
      });

      const body = (await response.json()) as {
        brief?: string;
        source?: string;
        error?: string;
        hint?: string;
      };

      if (!response.ok || !body.brief) {
        throw new Error(body.error ?? "Failed to generate brief");
      }

      setBrief(body.brief);
      setBriefSource(body.source ?? "unknown");
      if (body.error) {
        setError(body.hint ?? body.error);
      }
    } catch (briefError) {
      setError(
        briefError instanceof Error
          ? briefError.message
          : "Failed to generate brief",
      );
    } finally {
      setBriefLoading(false);
    }
  }

  const categoryLabel =
    BUSINESS_CATEGORIES.find((item) => item.id === businessCategory)?.label ??
    businessCategory;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900">
            <span className="text-base">◎</span> Bulan AI
          </div>
          <span className="inline-flex rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-800">
            Kamu Faydası · Public Benefit
          </span>
          {KVKK_BADGES.map((badge) => (
            <span
              key={badge}
              className="inline-flex rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600"
            >
              {badge}
            </span>
          ))}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          Neighborhood revitalization index
        </h1>
        <p className="max-w-3xl text-zinc-600">
          Map economic vacancy, community service gaps, and sector saturation
          across Istanbul streets — for municipalities, planners, and local
          entrepreneurs. Select a{" "}
          <span className="font-medium text-amber-800">{categoryLabel}</span>{" "}
          gap to analyze; Bulan scans signboards and rental banners only (no
          surveillance).
        </p>
        <blockquote className="max-w-3xl border-l-4 border-teal-500 bg-teal-50/60 px-4 py-3 text-sm italic text-teal-950">
          {MISSION_TAGLINE}
        </blockquote>
        <p className="max-w-3xl text-sm text-zinc-500">{MISSION_TAGLINE_TR}</p>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Demo tip:</strong> draw a rectangle over shop-lined blocks (not
          highways). Roads follow Google Directions; AI labels are verified with
          Google Places. Faces and plates are blurred before processing (KVKK).
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PUBLIC_BENEFIT_PILLARS.map((pillar) => (
          <article
            key={pillar.id}
            className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-700">
              {pillar.titleTr}
            </p>
            <h2 className="mt-1 text-sm font-semibold text-zinc-900">
              {pillar.title}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              {pillar.description}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="mb-2 text-sm font-semibold text-zinc-900">
              Community service gap
            </h2>
            <select
              value={businessCategory}
              onChange={(event) =>
                setBusinessCategory(event.target.value as BusinessCategory)
              }
              className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm"
            >
              {BUSINESS_CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-700">
            <p className="font-medium text-zinc-900">Select neighborhood block</p>
            <p className="mt-1">
              Drag a rectangle over a mahalle block. Bulan builds a
              revitalization index from vacancy rates and supply gaps.
            </p>
          </div>

          {areaPlan?.scanWarning && (
            <div
              role="alert"
              className="rounded-xl border border-orange-300 bg-orange-50 p-3 text-sm text-orange-950"
            >
              <p className="font-semibold">{areaPlan.scanWarning.title}</p>
              <p className="mt-1">{areaPlan.scanWarning.message}</p>
              <p className="mt-2 text-orange-800">
                {areaPlan.scanWarning.suggestion}
              </p>
            </div>
          )}

          {areaPlan && (
            <dl className="space-y-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-amber-900">Area size</dt>
                <dd className="font-medium text-amber-950">
                  {areaPlan.widthM}×{areaPlan.heightM} m
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-amber-900">Coverage</dt>
                <dd className="font-medium text-amber-950">
                  {(areaPlan.areaM2 / 10_000).toFixed(2)} ha
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-amber-900">Sample points</dt>
                <dd className="font-medium text-amber-950">
                  {areaPlan.waypoints.length}
                </dd>
              </div>
              {areaPlan.geometrySource === "google_directions" && (
                <div className="flex justify-between gap-4">
                  <dt className="text-amber-900">Road geometry</dt>
                  <dd className="font-medium text-amber-950">Google Directions</dd>
                </div>
              )}
              {typeof areaPlan.distanceM === "number" && areaPlan.distanceM > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-amber-900">Road coverage</dt>
                  <dd className="font-medium text-amber-950">
                    {(areaPlan.distanceM / 1000).toFixed(2)} km
                  </dd>
                </div>
              )}
            </dl>
          )}

          {opportunities && (
            <dl className="grid grid-cols-2 gap-2 text-xs">
              {(
                [
                  ["vacant", opportunities.vacant],
                  ["for_rent", opportunities.for_rent],
                  ["for_sale", opportunities.for_sale],
                  ["competitor", opportunities.competitors],
                  ["shop", opportunities.shops],
                  ["unknown", opportunities.unknown],
                ] as const
              ).map(([type, count]) => (
                <div
                  key={type}
                  className="rounded-lg px-2 py-2"
                  style={{
                    backgroundColor: OPPORTUNITY_STYLES[type].bg,
                    color: OPPORTUNITY_STYLES[type].color,
                  }}
                >
                  <dt>{OPPORTUNITY_STYLES[type].label}</dt>
                  <dd className="text-lg font-semibold">{count}</dd>
                </div>
              ))}
            </dl>
          )}

          {opportunities && (
            <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4">
              <p className="text-xs uppercase tracking-wide text-amber-700">
                Revitalization index
              </p>
              <p className="text-3xl font-bold text-amber-950">
                {opportunities.opportunityScore}
                <span className="text-base font-medium text-amber-700">/100</span>
              </p>
              <p className="mt-1 text-xs text-amber-800">
                Higher = more vacancies &amp; gaps, lower sector saturation
              </p>
            </div>
          )}

          <div className="grid gap-2">
            <button
              type="button"
              onClick={handleScan}
              disabled={!areaPlan?.waypoints.length || scanLoading || routeLoading}
              className="w-full rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {scanLoading ? "Mapping street economy..." : "Scan neighborhood"}
            </button>
            {opportunities && (
              <button
                type="button"
                onClick={handleGenerateBrief}
                disabled={briefLoading || scanLoading}
                className="w-full rounded-xl border border-violet-300 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-900 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {briefLoading
                  ? "Writing municipal brief..."
                  : "Generate revitalization brief (Cursor SDK)"}
              </button>
            )}
            <button
              type="button"
              onClick={handleClear}
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Clear area
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="h-[420px] overflow-hidden rounded-2xl border border-zinc-200 shadow-sm lg:h-[520px]">
            <RouteMap
              center={
                areaBounds ? boundsCenter(areaBounds) : MAP_CENTER
              }
              bounds={areaBounds}
              previewBounds={previewBounds}
              scanResults={scanResults}
              onBoundsDrawn={handleBoundsDrawn}
              onBoundsPreview={setPreviewBounds}
            />
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {(
              Object.keys(OPPORTUNITY_STYLES) as Array<
                keyof typeof OPPORTUNITY_STYLES
              >
            ).map((type) => (
              <span
                key={type}
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1"
                style={{
                  backgroundColor: OPPORTUNITY_STYLES[type].bg,
                  borderColor: OPPORTUNITY_STYLES[type].border,
                  color: OPPORTUNITY_STYLES[type].color,
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: OPPORTUNITY_STYLES[type].color }}
                />
                {OPPORTUNITY_STYLES[type].label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {brief && (
        <section className="space-y-3 rounded-2xl border border-violet-200 bg-violet-50/60 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-violet-950">
              Municipal revitalization brief
            </h2>
            {briefSource && (
              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-800">
                via {briefSource}
              </span>
            )}
          </div>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-violet-950">
            {brief}
          </div>
        </section>
      )}

      {scanResults.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            Street-level economic map
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {scanResults.map((result) => {
              const type = result.detection?.objectType ?? "unknown";
              const style = OPPORTUNITY_STYLES[type];

              return (
                <article
                  key={`${result.index}-${result.lat}-${result.lng}`}
                  className="overflow-hidden rounded-2xl border bg-white shadow-sm"
                  style={{ borderColor: style.border }}
                >
                  {result.imageBase64 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={result.imageBase64}
                      alt={`Storefront at ${result.distanceM}m`}
                      className="h-44 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-44 items-center justify-center bg-zinc-100 px-4 text-center text-sm text-zinc-500">
                      No imagery ({result.status})
                    </div>
                  )}
                  <div className="space-y-2 p-3 text-xs text-zinc-600">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className="inline-flex rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide"
                        style={{
                          backgroundColor: style.bg,
                          color: style.color,
                        }}
                      >
                        {style.label}
                        {result.detection
                          ? ` · ${Math.round(result.detection.confidence * 100)}%`
                          : ""}
                      </span>
                      {result.detection?.placesVerified && (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                          Google verified
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-zinc-900">
                      {result.distanceM}m · {result.side} side · heading{" "}
                      {Math.round(result.heading)}°
                    </p>
                    {result.detection?.placesName && (
                      <p className="font-medium text-emerald-800">
                        {result.detection.placesName}
                      </p>
                    )}
                    {result.detection?.signText &&
                      result.detection.signText !== result.detection.placesName && (
                        <p className="font-medium text-zinc-800">
                          Sign: {result.detection.signText}
                        </p>
                      )}
                    {result.detection?.caption && (
                      <p className="line-clamp-3 text-zinc-500">
                        {result.detection.caption}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <footer className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-center text-xs text-zinc-500">
        <p className="font-medium text-zinc-700">
          Cursor Hackathon Istanbul · AI-Driven Kentsel Çözümle
        </p>
        <p className="mt-1">
          Bulan AI — signboard &amp; vacancy detection only. No identity
          profiling. KVKK-compliant by design.
        </p>
      </footer>
    </div>
  );
}
