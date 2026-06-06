"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import type { VerifiedPlaceResult } from "@/app/api/streetview/verify/route";
import {
  BUSINESS_CATEGORIES,
  OPPORTUNITY_STYLES,
  type BusinessCategory,
  type OpportunitySummary,
} from "@/lib/bulan";
import type { AreaBounds } from "@/lib/area";
import { boundsCenter } from "@/lib/area";
import type { DiscoveredPlace } from "@/lib/places-discovery";
import {
  KVKK_BADGES,
  MISSION_TAGLINE,
  MISSION_TAGLINE_TR,
  PUBLIC_BENEFIT_PILLARS,
} from "@/lib/public-mission";
import { ISTANBUL_PRESETS } from "@/lib/streetview";
import type { RouteScanWarning } from "@/lib/route";

const RouteMap = dynamic(() => import("@/app/components/RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-100 text-sm text-zinc-500">
      Loading map...
    </div>
  ),
});

type DiscoverResponse = {
  bounds: AreaBounds;
  widthM: number;
  heightM: number;
  areaM2: number;
  places: DiscoveredPlace[];
  opportunities: OpportunitySummary;
  scanWarning: RouteScanWarning | null;
  geometrySource: string;
  estimatedApiCalls: number;
};

const MAP_CENTER = ISTANBUL_PRESETS[0];

export default function BulanScanner() {
  const [businessCategory, setBusinessCategory] =
    useState<BusinessCategory>("coffee_shop");
  const [areaBounds, setAreaBounds] = useState<AreaBounds | null>(null);
  const [previewBounds, setPreviewBounds] = useState<AreaBounds | null>(null);
  const [discovery, setDiscovery] = useState<DiscoverResponse | null>(null);
  const [verifiedPhotos, setVerifiedPhotos] = useState<VerifiedPlaceResult[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [briefLoading, setBriefLoading] = useState(false);
  const [brief, setBrief] = useState<string | null>(null);
  const [briefSource, setBriefSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runDiscovery = useCallback(
    async (bounds: AreaBounds, category: BusinessCategory) => {
      setDiscoverLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/discover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bounds, businessCategory: category }),
        });

        const body = await response.json();

        if (!response.ok) {
          throw new Error(body.error ?? "Failed to discover businesses");
        }

        setDiscovery(body as DiscoverResponse);
        setVerifiedPhotos([]);
        setBrief(null);
        setBriefSource(null);
      } catch (discoverError) {
        setDiscovery(null);
        setError(
          discoverError instanceof Error
            ? discoverError.message
            : "Failed to discover businesses",
        );
      } finally {
        setDiscoverLoading(false);
      }
    },
    [],
  );

  function handleBoundsDrawn(bounds: AreaBounds) {
    setError(null);
    setAreaBounds(bounds);
    void runDiscovery(bounds, businessCategory);
  }

  function handleCategoryChange(category: BusinessCategory) {
    setBusinessCategory(category);
    if (areaBounds) {
      void runDiscovery(areaBounds, category);
    }
  }

  function handleClear() {
    setAreaBounds(null);
    setPreviewBounds(null);
    setDiscovery(null);
    setVerifiedPhotos([]);
    setBrief(null);
    setBriefSource(null);
    setError(null);
  }

  async function handleLoadPhotos() {
    if (!discovery?.places.length) return;

    setPhotoLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/streetview/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          places: discovery.places,
          bounds: discovery.bounds,
          businessCategory,
          maxPhotos: 6,
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "Street View verify failed");
      }

      setVerifiedPhotos(body.results as VerifiedPlaceResult[]);
    } catch (photoError) {
      setError(
        photoError instanceof Error
          ? photoError.message
          : "Street View verify failed",
      );
    } finally {
      setPhotoLoading(false);
    }
  }

  async function handleGenerateBrief() {
    if (!discovery?.places.length) return;

    setBriefLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/opportunity-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessCategory,
          corridor: {
            distanceM: discovery.areaM2,
            samplePoints: discovery.places.length,
          },
          opportunities: discovery.opportunities,
          detections: discovery.places.map((place, index) => ({
            distanceM: index * 50,
            side: "registry",
            objectType: place.objectType,
            confidence: 0.97,
            signText: place.name,
            caption: place.category ?? "unmapped",
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
          <strong>How it works:</strong> draw a box → Google Places finds real
          shop locations first → map pins match registered businesses. Street View
          is optional (photos only when you click load). No more guessing from
          road waypoints.
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
                handleCategoryChange(event.target.value as BusinessCategory)
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
              Drag a rectangle. Bulan queries Google Places for every registered
              business inside — competitors and supply gaps from real addresses.
            </p>
          </div>

          {discovery?.scanWarning && (
            <div
              role="alert"
              className="rounded-xl border border-orange-300 bg-orange-50 p-3 text-sm text-orange-950"
            >
              <p className="font-semibold">{discovery.scanWarning.title}</p>
              <p className="mt-1">{discovery.scanWarning.message}</p>
              <p className="mt-2 text-orange-800">
                {discovery.scanWarning.suggestion}
              </p>
            </div>
          )}

          {discovery && (
            <dl className="space-y-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-amber-900">Area size</dt>
                <dd className="font-medium text-amber-950">
                  {discovery.widthM}×{discovery.heightM} m
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-amber-900">Businesses found</dt>
                <dd className="font-medium text-amber-950">
                  {discovery.places.length}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-amber-900">Data source</dt>
                <dd className="font-medium text-amber-950">Google Places</dd>
              </div>
            </dl>
          )}

          {discovery?.opportunities && (
            <dl className="grid grid-cols-2 gap-2 text-xs">
              {(
                [
                  ["competitor", discovery.opportunities.competitors],
                  ["shop", discovery.opportunities.shops],
                  ["unknown", discovery.opportunities.unknown],
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

          {discovery?.opportunities && (
            <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4">
              <p className="text-xs uppercase tracking-wide text-amber-700">
                Revitalization index
              </p>
              <p className="text-3xl font-bold text-amber-950">
                {discovery.opportunities.opportunityScore}
                <span className="text-base font-medium text-amber-700">/100</span>
              </p>
              <p className="mt-1 text-xs text-amber-800">
                Based on Google Places registry — lower competitor count = higher
                score
              </p>
            </div>
          )}

          <div className="grid gap-2">
            <button
              type="button"
              onClick={handleLoadPhotos}
              disabled={
                !discovery?.places.length || photoLoading || discoverLoading
              }
              className="w-full rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-900 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {photoLoading
                ? "Loading Street View photos..."
                : "Load Street View photos (optional)"}
            </button>
            {discovery?.places.length ? (
              <button
                type="button"
                onClick={handleGenerateBrief}
                disabled={briefLoading || photoLoading}
                className="w-full rounded-xl border border-violet-300 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-900 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {briefLoading
                  ? "Writing municipal brief..."
                  : "Generate revitalization brief (Cursor SDK)"}
              </button>
            ) : null}
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
              discoveredPlaces={discovery?.places ?? []}
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

      {discovery && discovery.places.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            Registered businesses in area
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {discovery.places.map((place) => {
              const style = OPPORTUNITY_STYLES[place.objectType];
              const photo = verifiedPhotos.find(
                (item) => item.placeId === place.placeId,
              );

              return (
                <article
                  key={place.placeId}
                  className="overflow-hidden rounded-2xl border bg-white shadow-sm"
                  style={{ borderColor: style.border }}
                >
                  {photo?.imageBase64 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo.imageBase64}
                      alt={place.name}
                      className="h-44 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-44 flex-col items-center justify-center bg-zinc-100 px-4 text-center text-sm text-zinc-500">
                      <span className="font-medium text-zinc-700">
                        {place.name}
                      </span>
                      <span className="mt-1 text-xs">
                        {photo
                          ? `No imagery (${photo.status})`
                          : "Places registry — click load photos for Street View"}
                      </span>
                    </div>
                  )}
                  <div className="space-y-2 p-3 text-xs text-zinc-600">
                    <span
                      className="inline-flex rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide"
                      style={{
                        backgroundColor: style.bg,
                        color: style.color,
                      }}
                    >
                      {style.label}
                    </span>
                    <p className="font-medium text-zinc-900">{place.name}</p>
                    {place.category && (
                      <p className="text-zinc-700">
                        Category: {place.category.replace("_", " ")}
                      </p>
                    )}
                    {place.vicinity && (
                      <p className="text-zinc-500">{place.vicinity}</p>
                    )}
                    <p className="text-zinc-400">
                      {place.lat.toFixed(5)}, {place.lng.toFixed(5)}
                    </p>
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
