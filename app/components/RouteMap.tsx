"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Rectangle,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { ScanResult } from "@/app/api/streetview/scan/route";
import { OPPORTUNITY_STYLES } from "@/lib/bulan";
import type { AreaBounds } from "@/lib/area";
import { normalizeBounds } from "@/lib/area";
import type { LatLng } from "@/lib/route";
import "leaflet/dist/leaflet.css";

type RouteMapProps = {
  center: LatLng;
  bounds: AreaBounds | null;
  previewBounds: AreaBounds | null;
  scanResults?: ScanResult[];
  onBoundsDrawn: (bounds: AreaBounds) => void;
  onBoundsPreview?: (bounds: AreaBounds | null) => void;
};

function AreaDrawHandler({
  onBoundsDrawn,
  onBoundsPreview,
}: {
  onBoundsDrawn: (bounds: AreaBounds) => void;
  onBoundsPreview?: (bounds: AreaBounds | null) => void;
}) {
  const dragStart = useRef<L.LatLng | null>(null);
  const map = useMap();

  useMapEvents({
    mousedown(event) {
      dragStart.current = event.latlng;
      map.dragging.disable();
      map.getContainer().style.cursor = "crosshair";
    },
    mousemove(event) {
      if (!dragStart.current) return;
      onBoundsPreview?.(
        normalizeBounds(
          { lat: dragStart.current.lat, lng: dragStart.current.lng },
          { lat: event.latlng.lat, lng: event.latlng.lng },
        ),
      );
    },
    mouseup(event) {
      if (!dragStart.current) return;

      const bounds = normalizeBounds(
        { lat: dragStart.current.lat, lng: dragStart.current.lng },
        { lat: event.latlng.lat, lng: event.latlng.lng },
      );

      dragStart.current = null;
      map.dragging.enable();
      map.getContainer().style.cursor = "crosshair";
      onBoundsPreview?.(null);
      onBoundsDrawn(bounds);
    },
    mouseout() {
      if (dragStart.current) {
        dragStart.current = null;
        map.dragging.enable();
      }
    },
  });

  useEffect(() => {
    map.getContainer().style.cursor = "crosshair";
  }, [map]);

  return null;
}

function FitAreaBounds({ bounds }: { bounds: AreaBounds | null }) {
  const map = useMap();

  useEffect(() => {
    if (!bounds) return;
    map.fitBounds(
      [
        [bounds.south, bounds.west],
        [bounds.north, bounds.east],
      ],
      { padding: [40, 40] },
    );
  }, [bounds, map]);

  return null;
}

function boundsToLeaflet(bounds: AreaBounds): L.LatLngBoundsExpression {
  return [
    [bounds.south, bounds.west],
    [bounds.north, bounds.east],
  ];
}

export default function RouteMap({
  center,
  bounds,
  previewBounds,
  scanResults = [],
  onBoundsDrawn,
  onBoundsPreview,
}: RouteMapProps) {
  const activeBounds = previewBounds ?? bounds;

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={15}
      className="h-full w-full rounded-2xl"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <AreaDrawHandler
        onBoundsDrawn={onBoundsDrawn}
        onBoundsPreview={onBoundsPreview}
      />
      <FitAreaBounds bounds={bounds} />

      {activeBounds && (
        <Rectangle
          bounds={boundsToLeaflet(activeBounds)}
          pathOptions={{
            color: previewBounds ? "#f59e0b" : "#d97706",
            weight: 2,
            fillColor: "#fbbf24",
            fillOpacity: previewBounds ? 0.15 : 0.22,
          }}
        />
      )}

      {scanResults
        .filter((result) => result.status === "OK" && result.detection)
        .map((result) => {
          const type = result.detection!.objectType;
          const style = OPPORTUNITY_STYLES[type];

          return (
            <CircleMarker
              key={`scan-${result.index}`}
              center={[result.lat, result.lng]}
              radius={7}
              pathOptions={{
                color: "#ffffff",
                weight: 2,
                fillColor: style.color,
                fillOpacity: 0.95,
              }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                {style.label}
                {result.detection?.caption
                  ? ` — ${result.detection.caption.slice(0, 48)}`
                  : ""}
              </Tooltip>
            </CircleMarker>
          );
        })}
    </MapContainer>
  );
}
