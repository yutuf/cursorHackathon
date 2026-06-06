"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import type { ScanResult } from "@/app/api/streetview/scan/route";
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
  summary: {
    total: number;
    available: number;
    unavailable: number;
    apiCallsUsed: number;
  };
};

const MAP_CENTER = ISTANBUL_PRESETS[0];

export default function RouteScanner() {
  const [pickingMode, setPickingMode] = useState<PickingMode>("start");
  const [start, setStart] = useState<LatLng | null>(null);
  const [end, setEnd] = useState<LatLng | null>(null);
  const [route, setRoute] = useState<RouteResponse | null>(null);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [scanSummary, setScanSummary] = useState<ScanResponse["summary"] | null>(
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
      setScanSummary(null);
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
    setScanSummary(null);
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
        }),
      });

      const body = (await response.json()) as ScanResponse & { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Route scan failed");
      }

      setScanResults(body.results);
      setScanSummary(body.summary);
    } catch (scanError) {
      setError(
        scanError instanceof Error ? scanError.message : "Route scan failed",
      );
    } finally {
      setScanLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Route Scanner
        </p>
        <h1 className="text-3xl font-semibold text-zinc-900">
          Map a corridor and scan Street View
        </h1>
        <p className="max-w-3xl text-zinc-600">
          Click the map to place a <span className="font-medium text-emerald-700">start</span>{" "}
          and <span className="font-medium text-red-600">end</span> point. The app
          builds a driving route, samples waypoints along it, then fetches Street
          View imagery for urban object analysis.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-zinc-900">
              Pick points
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
            <p className="mt-2 text-xs text-zinc-500">
              Active: {pickingMode === "start" ? "placing start (green)" : "placing end (red)"}
            </p>
          </div>

          <dl className="space-y-2 text-sm">
            <div className="rounded-lg bg-zinc-50 px-3 py-2">
              <dt className="text-zinc-500">Start</dt>
              <dd className="font-mono text-xs text-zinc-800">
                {start
                  ? `${start.lat.toFixed(5)}, ${start.lng.toFixed(5)}`
                  : "Not set"}
              </dd>
            </div>
            <div className="rounded-lg bg-zinc-50 px-3 py-2">
              <dt className="text-zinc-500">End</dt>
              <dd className="font-mono text-xs text-zinc-800">
                {end
                  ? `${end.lat.toFixed(5)}, ${end.lng.toFixed(5)}`
                  : "Not set"}
              </dd>
            </div>
          </dl>

          {route && (
            <dl className="space-y-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-emerald-800">Route distance</dt>
                <dd className="font-medium text-emerald-900">
                  {(route.distanceM / 1000).toFixed(2)} km
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-emerald-800">Sample points</dt>
                <dd className="font-medium text-emerald-900">
                  {route.waypoints.length}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-emerald-800">Est. API calls</dt>
                <dd className="font-medium text-emerald-900">
                  ~{route.estimatedApiCalls}
                </dd>
              </div>
            </dl>
          )}

          <div className="grid gap-2">
            <button
              type="button"
              onClick={handleScan}
              disabled={!route?.waypoints.length || scanLoading || routeLoading}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {scanLoading ? "Scanning route..." : "Scan route"}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Clear points
            </button>
          </div>

          {routeLoading && (
            <p className="text-xs text-zinc-500">Calculating driving route...</p>
          )}
        </div>

        <div className="h-[420px] overflow-hidden rounded-2xl border border-zinc-200 shadow-sm lg:h-[520px]">
          <RouteMap
            center={start ?? end ?? MAP_CENTER}
            start={start}
            end={end}
            routeCoordinates={route?.coordinates ?? []}
            pickingMode={pickingMode}
            onMapClick={handleMapClick}
          />
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {scanSummary && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
          <h2 className="mb-2 font-semibold text-zinc-900">Scan summary</h2>
          <p>
            {scanSummary.available} of {scanSummary.total} waypoints had Street
            View imagery. Used approximately {scanSummary.apiCallsUsed} API
            calls.
          </p>
        </div>
      )}

      {scanResults.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            Scanned imagery
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {scanResults.map((result) => (
              <article
                key={`${result.index}-${result.lat}-${result.lng}`}
                className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
              >
                {result.imageBase64 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={result.imageBase64}
                    alt={`Street View at ${result.distanceM}m`}
                    className="h-44 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-44 items-center justify-center bg-zinc-100 px-4 text-center text-sm text-zinc-500">
                    No imagery ({result.status})
                  </div>
                )}
                <div className="space-y-1 p-3 text-xs text-zinc-600">
                  <p className="font-medium text-zinc-900">
                    Point {result.index + 1} · {result.distanceM}m along route
                  </p>
                  <p>
                    {result.lat.toFixed(5)}, {result.lng.toFixed(5)}
                  </p>
                  <p>Heading {Math.round(result.heading)}°</p>
                  {result.metadata?.date && <p>Captured {result.metadata.date}</p>}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
