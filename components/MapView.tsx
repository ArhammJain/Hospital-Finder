"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { Place } from "@/types/place";
import "leaflet/dist/leaflet.css";

/* ================= MARKER ICONS ================= */

const selectedIcon = L.divIcon({
  className: "",
  html: `
    <div style="transform: translateY(-4px) scale(1.15)">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="#2563eb">
        <path d="M12 2c-4.4 0-8 3.6-8 8 0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8z"/>
        <circle cx="12" cy="10" r="3" fill="white"/>
      </svg>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -36],
});

const defaultIcon = L.divIcon({
  className: "",
  html: `
    <div>
      <svg width="34" height="34" viewBox="0 0 24 24" fill="white" stroke="#2563eb" stroke-width="1.5">
        <path d="M12 2c-4.4 0-8 3.6-8 8 0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8z"/>
        <circle cx="12" cy="10" r="3" fill="#2563eb"/>
      </svg>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -30],
});

/* ================= CAMERA CONTROLLER ================= */

function CameraController({
  center,
  places,
  selectedId,
}: {
  center: [number, number];
  places: Place[];
  selectedId: number | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || places.length === 0) return;

    // Selected place → focus on it
    if (selectedId) {
      const selected = places.find((p) => p.id === selectedId);
      if (selected) {
        map.setView([selected.lat, selected.lon], 15, {
          animate: true,
          duration: 0.5,
        });
        return;
      }
    }

    // Multiple places → fit bounds
    if (places.length > 1) {
      const bounds = L.latLngBounds(
        places.map((p) => [p.lat, p.lon])
      );

      map.fitBounds(bounds, {
        padding: [80, 80],
        maxZoom: 15,
        animate: true,
        duration: 0.6,
      });
      return;
    }

    // Single result → center gently
    map.setView(center, 13, { animate: true });
  }, [center, places, selectedId, map]);

  return null;
}

/* ================= MAIN COMPONENT ================= */

type Props = {
  center: [number, number];
  places: Place[];
  selectedId: number | null;
  onSelect: (p: Place) => void;
};

export default function MapView({
  center,
  places,
  selectedId,
  onSelect,
}: Props) {
  const validPlaces = useMemo(
    () =>
      places.filter(
        (p) =>
          Number.isFinite(p.lat) &&
          Number.isFinite(p.lon) &&
          p.lat >= -90 &&
          p.lat <= 90 &&
          p.lon >= -180 &&
          p.lon <= 180
      ),
    [places]
  );

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={center}
        zoom={5}
        className="h-full w-full"
        zoomControl={false}
        scrollWheelZoom
        touchZoom
        dragging
        maxZoom={18}
        minZoom={3}
      >
        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <CameraController
          center={center}
          places={validPlaces}
          selectedId={selectedId}
        />

        {validPlaces.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lon]}
            icon={p.id === selectedId ? selectedIcon : defaultIcon}
            zIndexOffset={p.id === selectedId ? 1000 : 0}
            eventHandlers={{
              click: () => onSelect(p),
            }}
          >
            <Popup>
              <strong>{p.tags?.name ?? "Medical Facility"}</strong>
              <br />
              <span className="capitalize">
                {p.tags?.amenity}
              </span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Empty overlay */}
      {validPlaces.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm pointer-events-none">
          <div className="px-5 py-3 rounded-xl bg-white shadow border text-sm text-slate-600">
            Search a city to find hospitals & clinics
          </div>
        </div>
      )}
    </div>
  );
}
