"use client";

import { useState } from "react";
import { ISTANBUL_PRESETS, type StreetViewMetadata } from "@/lib/streetview";

type FormState = {
  lat: string;
  lng: string;
  heading: string;
  pitch: string;
  fov: string;
};

const defaultForm: FormState = {
  lat: String(ISTANBUL_PRESETS[0].lat),
  lng: String(ISTANBUL_PRESETS[0].lng),
  heading: "0",
  pitch: "0",
  fov: "90",
};

function buildImageUrl(form: FormState): string {
  const params = new URLSearchParams({
    lat: form.lat,
    lng: form.lng,
    heading: form.heading,
    pitch: form.pitch,
    fov: form.fov,
    width: "640",
    height: "640",
  });
  return `/api/streetview?${params.toString()}`;
}

function buildMetadataUrl(form: FormState): string {
  const params = new URLSearchParams({
    lat: form.lat,
    lng: form.lng,
  });
  return `/api/streetview/metadata?${params.toString()}`;
}

export default function StreetViewTester() {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<StreetViewMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function applyPreset(lat: number, lng: number) {
    setForm((current) => ({
      ...current,
      lat: String(lat),
      lng: String(lng),
    }));
    setImageUrl(null);
    setMetadata(null);
    setError(null);
  }

  async function handleFetch() {
    setLoading(true);
    setError(null);
    setImageUrl(null);
    setMetadata(null);

    try {
      const metadataResponse = await fetch(buildMetadataUrl(form));

      if (!metadataResponse.ok) {
        const body = await metadataResponse.json();
        throw new Error(body.error ?? "Metadata request failed");
      }

      const metadataBody = (await metadataResponse.json()) as StreetViewMetadata;
      setMetadata(metadataBody);

      if (metadataBody.status !== "OK") {
        throw new Error(
          `No imagery at this location (status: ${metadataBody.status})`,
        );
      }

      setImageUrl(`${buildImageUrl(form)}&t=${Date.now()}`);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load Street View",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Dev / Test
        </p>
        <h1 className="text-3xl font-semibold text-zinc-900">
          Single-point tester
        </h1>
        <p className="max-w-2xl text-zinc-600">
          Inspect one panorama at a time. For corridor scanning, use the route
          map above.
        </p>
      </header>

      <section className="grid gap-8 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-zinc-900">
              Istanbul presets
            </h2>
            <div className="flex flex-wrap gap-2">
              {ISTANBUL_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPreset(preset.lat, preset.lng)}
                  className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-zinc-700">Latitude</span>
              <input
                type="number"
                step="any"
                value={form.lat}
                onChange={(event) => updateField("lat", event.target.value)}
                className="rounded-lg border border-zinc-200 px-3 py-2"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-zinc-700">Longitude</span>
              <input
                type="number"
                step="any"
                value={form.lng}
                onChange={(event) => updateField("lng", event.target.value)}
                className="rounded-lg border border-zinc-200 px-3 py-2"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-zinc-700">
                Heading ({form.heading}°)
              </span>
              <input
                type="range"
                min="0"
                max="360"
                value={form.heading}
                onChange={(event) =>
                  updateField("heading", event.target.value)
                }
                className="w-full"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-zinc-700">
                Pitch ({form.pitch}°)
              </span>
              <input
                type="range"
                min="-90"
                max="90"
                value={form.pitch}
                onChange={(event) => updateField("pitch", event.target.value)}
                className="w-full"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-zinc-700">
                Field of view ({form.fov}°)
              </span>
              <input
                type="range"
                min="10"
                max="120"
                value={form.fov}
                onChange={(event) => updateField("fov", event.target.value)}
                className="w-full"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={handleFetch}
            disabled={loading}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Fetching..." : "Fetch Street View"}
          </button>
        </div>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt="Street View panorama"
                className="h-auto w-full"
              />
            ) : (
              <div className="flex min-h-[360px] items-center justify-center px-6 text-center text-sm text-zinc-500">
                Choose a location and fetch a panorama to preview imagery for
                your urban detection use case.
              </div>
            )}
          </div>

          {metadata && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
              <h3 className="mb-2 font-semibold text-zinc-900">Metadata</h3>
              <dl className="grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-zinc-500">Status</dt>
                  <dd className="font-medium">{metadata.status}</dd>
                </div>
                {metadata.date && (
                  <div>
                    <dt className="text-zinc-500">Capture date</dt>
                    <dd className="font-medium">{metadata.date}</dd>
                  </div>
                )}
                {metadata.location && (
                  <div>
                    <dt className="text-zinc-500">Snapped location</dt>
                    <dd className="font-medium">
                      {metadata.location.lat.toFixed(6)},{" "}
                      {metadata.location.lng.toFixed(6)}
                    </dd>
                  </div>
                )}
                {metadata.pano_id && (
                  <div className="sm:col-span-2">
                    <dt className="text-zinc-500">Panorama ID</dt>
                    <dd className="break-all font-mono text-xs">
                      {metadata.pano_id}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
