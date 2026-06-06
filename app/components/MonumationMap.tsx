"use client";

import { useEffect, useState } from "react";
import L from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { moodColor, scoreForMood, type MonumationNode, type RouteMood } from "@/lib/monumation";
import { getMoodTheme } from "@/lib/mood-theme";
import type { MoodPlace } from "@/lib/places-mood";
import { ISTANBUL_PRESETS } from "@/lib/streetview";
import type { LatLng } from "@/lib/route";
import "leaflet/dist/leaflet.css";

type MonumationMapProps = {
  center?: LatLng;
  start: LatLng | null;
  end: LatLng | null;
  coordinates?: LatLng[];
  nodes?: MonumationNode[];
  pois?: MoodPlace[];
  routeMood: RouteMood;
  onStartSet: (point: LatLng) => void;
  onEndSet: (point: LatLng) => void;
};

function ClickHandler({
  start,
  onStartSet,
  onEndSet,
}: {
  start: LatLng | null;
  onStartSet: (point: LatLng) => void;
  onEndSet: (point: LatLng) => void;
}) {
  const map = useMap();

  useMapEvents({
    click(event) {
      const point = { lat: event.latlng.lat, lng: event.latlng.lng };
      if (!start) {
        onStartSet(point);
      } else {
        onEndSet(point);
      }
    },
  });

  useEffect(() => {
    map.getContainer().style.cursor = "crosshair";
  }, [map]);

  return null;
}

function FitRoute({ points }: { points: LatLng[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length < 2) return;
    const bounds = L.latLngBounds(
      points.map((point) => [point.lat, point.lng] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [48, 48] });
  }, [map, points]);

  return null;
}

export default function MonumationMap({
  center = ISTANBUL_PRESETS[1],
  start,
  end,
  coordinates = [],
  nodes = [],
  pois = [],
  routeMood,
  onStartSet,
  onEndSet,
}: MonumationMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-100 text-sm text-zinc-500">
        Loading map...
      </div>
    );
  }

  const routePoints =
    coordinates.length > 1
      ? coordinates
      : start && end
        ? [start, end]
        : [];

  const theme = getMoodTheme(routeMood);

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={14}
      className="h-full w-full rounded-2xl"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <ClickHandler start={start} onStartSet={onStartSet} onEndSet={onEndSet} />
      <FitRoute points={routePoints} />

      {routePoints.length > 1 && (
        <Polyline
          positions={routePoints.map((p) => [p.lat, p.lng] as [number, number])}
          pathOptions={{ color: theme.mapRoute, weight: 6, opacity: 0.72 }}
        />
      )}

      {start && (
        <CircleMarker
          center={[start.lat, start.lng]}
          radius={9}
          pathOptions={{
            color: "#fff",
            weight: 2,
            fillColor: "#22c55e",
            fillOpacity: 1,
          }}
        >
          <Tooltip>Start</Tooltip>
        </CircleMarker>
      )}

      {end && (
        <CircleMarker
          center={[end.lat, end.lng]}
          radius={9}
          pathOptions={{
            color: "#fff",
            weight: 2,
            fillColor: "#ef4444",
            fillOpacity: 1,
          }}
        >
          <Tooltip>End</Tooltip>
        </CircleMarker>
      )}

      {pois.map((poi) => (
        <CircleMarker
          key={`poi-${poi.placeId}`}
          center={[poi.lat, poi.lng]}
          radius={6}
          pathOptions={{
            color: "#fff",
            weight: 2,
            fillColor: theme.mapPoi,
            fillOpacity: 1,
          }}
        >
          <Tooltip direction="top">
            {poi.name}
            <br />
            Worth visiting · {poi.distanceToRouteM}m from path
          </Tooltip>
        </CircleMarker>
      ))}

      {nodes.map((node, index) => {
        const score = scoreForMood(node, routeMood);
        return (
          <CircleMarker
            key={`node-${index}-${node.lat}`}
            center={[node.lat, node.lng]}
            radius={7}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: moodColor(score),
              fillOpacity: 0.95,
            }}
          >
            <Tooltip direction="top">
              {node.dominant_mood_tag}
              <br />
              Mood score: {score}/100
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
