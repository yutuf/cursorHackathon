"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import type { ScanResult } from "@/app/api/streetview/scan/route";
import {
  BUSINESS_CATEGORIES,
  OPPORTUNITY_STYLES,
  type BusinessCategory,
  type OpportunitySummary,
} from "@/lib/bulan";
import { ISTANBUL_PRESETS } from "@/lib/streetview";
import type { LatLng, RouteWaypoint } from "@/lib/route";

const RouteMap = dynamic(() => import("@/app/components/RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-100 text-sm text-zinc-500">
      Loading map...
    </div>
  ),
});

type PickingMode = "start" | "end";

type RouteResponse = {
  coordinates: LatLng[];
  distanceM: number;
  durationS: number;
  waypoints: RouteWaypoint[];
  sampleIntervalM: number;
  estimatedApiCalls: number;
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
  const [pickingMode, setPickingMode] = useState<PickingMode>("start");
  const [businessCategory, setBusinessCategory] =
    useState<BusinessCategory>("coffee_shop");
  const [start, setStart] = useState<LatLng | null>(null);
  const [end, setEnd] = useState<LatLng | null>(null);
  const [route, setRoute] = useState<RouteResponse | null>(null);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunitySummary | null>(
    null,
  );
  const [routeLoading, setRouteLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRoute = useCallback(async (startPoint: LatLng, endPoint: LatLng) => {
    setRouteLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start: startPoint, end: endPoint }),
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to build route");
      }

      setRoute(body as RouteResponse);
      setScanResults([]);
      setOpportunities(null);
    } catch (routeError) {
      setRoute(null);
      setError(
        routeError instanceof Error
          ? routeError.message
          : "Failed to build route",
      );
    } finally {
      setRouteLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!start || !end) return;
    void loadRoute(start, end);
  }, [start, end, loadRoute]);

  function handleMapClick(point: LatLng) {
    setError(null);

    if (pickingMode === "start") {
      setStart(point);
      setPickingMode("end");
      return;
    }

    setEnd(point);
  }

  function handleClear() {
    setStart(null);
    setEnd(null);
    setRoute(null);
    setScanResults([]);
    setOpportunities(null);
    setError(null);
    setPickingMode("start");
  }

  async function handleScan() {
    if (!route?.waypoints.length) return;

    setScanLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/streetview/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waypoints: route.waypoints,
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

  const categoryLabel =
    BUSINESS_CATEGORIES.find((item) => item.id === businessCategory)?.label ??
    businessCategory;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900">
          <span className="text-base">◎</span> Bulan
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          Find your next business location
        </h1>
        <p className="max-w-3xl text-zinc-600">
          Draw a corridor, scan storefronts with Street View, and discover vacant
          units, rental signs, active shops, and competitors for your{" "}
          <span className="font-medium text-amber-800">{categoryLabel}</span>{" "}
          idea. Cameras face shop facades on alternating sides of the street — not
          down the road.
        </p>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Tip:</strong> scan commercial streets (not highways). Bulan tries
          both sides of the street and skips shots blocked by vehicles. AI uses
          Hugging Face image classification on the HF router.
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="mb-2 text-sm font-semibold text-zinc-900">
              Business type
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

          <div>
            <h2 className="mb-3 text-sm font-semibold text-zinc-900">
              Scan area
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPickingMode("start")}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  pickingMode === "start"
                    ? "bg-emerald-600 text-white"
                    : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                Set start
              </button>
              <button
                type="button"
                onClick={() => setPickingMode("end")}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  pickingMode === "end"
                    ? "bg-red-600 text-white"
                    : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                Set end
              </button>
            </div>
          </div>

          {route && (
            <dl className="space-y-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-amber-900">Corridor</dt>
                <dd className="font-medium text-amber-950">
                  {(route.distanceM / 1000).toFixed(2)} km
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-amber-900">Sample points</dt>
                <dd className="font-medium text-amber-950">
                  {route.waypoints.length}
                </dd>
              </div>
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
                Opportunity score
              </p>
              <p className="text-3xl font-bold text-amber-950">
                {opportunities.opportunityScore}
                <span className="text-base font-medium text-amber-700">/100</span>
              </p>
              <p className="mt-1 text-xs text-amber-800">
                Higher = more openings, fewer direct competitors
              </p>
            </div>
          )}

          <div className="grid gap-2">
            <button
              type="button"
              onClick={handleScan}
              disabled={!route?.waypoints.length || scanLoading || routeLoading}
              className="w-full rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {scanLoading ? "Scanning storefronts..." : "Scan area"}
            </button>
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
              center={start ?? end ?? MAP_CENTER}
              start={start}
              end={end}
              routeCoordinates={route?.coordinates ?? []}
              scanResults={scanResults}
              pickingMode={pickingMode}
              onMapClick={handleMapClick}
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

      {scanResults.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            Storefront analysis
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
                    <p className="font-medium text-zinc-900">
                      {result.distanceM}m · {result.side} side · heading{" "}
                      {Math.round(result.heading)}°
                    </p>
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
    </div>
  );
}
