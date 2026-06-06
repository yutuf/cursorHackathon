"use client";

import { useEffect } from "react";
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
import type { LatLng } from "@/lib/route";
import "leaflet/dist/leaflet.css";

type PickingMode = "start" | "end";

type RouteMapProps = {
  center: LatLng;
  start: LatLng | null;
  end: LatLng | null;
  routeCoordinates: LatLng[];
  pickingMode: PickingMode;
  onMapClick: (point: LatLng) => void;
};

function MapClickHandler({
  pickingMode,
  onMapClick,
}: {
  pickingMode: PickingMode;
  onMapClick: (point: LatLng) => void;
}) {
  useMapEvents({
    click(event) {
      onMapClick({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
    },
  });

  const map = useMap();

  useEffect(() => {
    map.getContainer().style.cursor = "crosshair";
  }, [map, pickingMode]);

  return null;
}

function FitRouteBounds({ coordinates }: { coordinates: LatLng[] }) {
  const map = useMap();

  useEffect(() => {
    if (coordinates.length < 2) return;
    const bounds = L.latLngBounds(
      coordinates.map((point) => [point.lat, point.lng]),
    );
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [coordinates, map]);

  return null;
}

export default function RouteMap({
  center,
  start,
  end,
  routeCoordinates,
  pickingMode,
  onMapClick,
}: RouteMapProps) {
  const polylinePositions = routeCoordinates.map(
    (point) => [point.lat, point.lng] as [number, number],
  );

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      className="h-full w-full rounded-2xl"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapClickHandler pickingMode={pickingMode} onMapClick={onMapClick} />
      <FitRouteBounds coordinates={routeCoordinates} />

      {polylinePositions.length > 1 && (
        <Polyline
          positions={polylinePositions}
          pathOptions={{ color: "#059669", weight: 5, opacity: 0.85 }}
        />
      )}

      {start && (
        <CircleMarker
          center={[start.lat, start.lng]}
          radius={10}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            fillColor: "#10b981",
            fillOpacity: 1,
          }}
        >
          <Tooltip direction="top" offset={[0, -8]} permanent>
            Start
          </Tooltip>
        </CircleMarker>
      )}

      {end && (
        <CircleMarker
          center={[end.lat, end.lng]}
          radius={10}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            fillColor: "#ef4444",
            fillOpacity: 1,
          }}
        >
          <Tooltip direction="top" offset={[0, -8]} permanent>
            End
          </Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  );
}
