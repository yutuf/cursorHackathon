"use client";

import type { RouteMood } from "@/lib/monumation";
import { getMoodTheme } from "@/lib/mood-theme";
import type { LatLng } from "@/lib/route";

export type RoutePreview = {
  ok: boolean;
  distanceM: number;
  durationS: number;
  straightM: number;
  detourRatio: number;
  pathPoints: number;
  roadNames: string[];
  estimatedSamplePoints: number;
  coordinates: LatLng[];
};

type RoutePreviewPanelProps = {
  mood: RouteMood;
  moodLabel: string;
  start: LatLng;
  end: LatLng;
  preview: RoutePreview | null;
  loading?: boolean;
};

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `~${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
}

export default function RoutePreviewPanel({
  mood,
  moodLabel,
  start,
  end,
  preview,
  loading,
}: RoutePreviewPanelProps) {
  const theme = getMoodTheme(mood);

  const stats = preview
    ? [
        {
          label: "Walking distance",
          value: `${(preview.distanceM / 1000).toFixed(2)} km`,
        },
        {
          label: "Est. walk time",
          value: formatDuration(preview.durationS),
        },
        {
          label: "As-the-crow-flies",
          value: `${(preview.straightM / 1000).toFixed(2)} km`,
        },
        {
          label: "Detour factor",
          value: `${preview.detourRatio}×`,
        },
        {
          label: "Street samples",
          value: `~${preview.estimatedSamplePoints}`,
        },
        {
          label: "Path points",
          value: String(preview.pathPoints),
        },
      ]
    : [];

  return (
    <div className={`overflow-hidden ${theme.panel}`}>
      <div
        className="border-b px-4 py-3"
        style={{ borderColor: `${theme.accent}25` }}
      >
        <p className={`text-sm font-semibold ${theme.fontDisplay}`} style={{ color: theme.ink }}>
          Route preview
        </p>
        <p className="mt-1 text-[10px] italic" style={{ color: theme.inkMuted }}>
          {moodLabel} · pins locked — scan to score the corridor
        </p>
      </div>

      <div className="space-y-3 p-4 text-xs">
        <dl className="grid grid-cols-2 gap-2">
          <div>
            <dt style={{ color: theme.inkMuted }}>Start</dt>
            <dd className="font-mono text-[10px]" style={{ color: theme.ink }}>
              {start.lat.toFixed(4)}, {start.lng.toFixed(4)}
            </dd>
          </div>
          <div>
            <dt style={{ color: theme.inkMuted }}>End</dt>
            <dd className="font-mono text-[10px]" style={{ color: theme.ink }}>
              {end.lat.toFixed(4)}, {end.lng.toFixed(4)}
            </dd>
          </div>
        </dl>

        {loading && (
          <p className="italic" style={{ color: theme.inkMuted }}>
            Calculating walking route…
          </p>
        )}

        {!loading && preview && (
          <>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              {stats.map((item) => (
                <div key={item.label}>
                  <dt style={{ color: theme.inkMuted }}>{item.label}</dt>
                  <dd className="text-sm font-bold tabular-nums" style={{ color: theme.ink }}>
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>

            {preview.roadNames.length > 0 && (
              <p className="leading-relaxed" style={{ color: theme.inkMuted }}>
                <span className="font-semibold" style={{ color: theme.ink }}>
                  Via:{" "}
                </span>
                {preview.roadNames.join(" → ")}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
