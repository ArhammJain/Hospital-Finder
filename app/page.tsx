"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import SearchBar from "@/components/SearchBar";
import PlacesList from "@/components/PlacesList";
import { Place } from "@/types/place";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
});

type SheetState = "collapsed" | "mid" | "expanded";

/* ---------------- Radius logic ---------------- */

function getRadiusFromBoundingBox(bbox: string[]): number {
  const south = Number(bbox[0]);
  const north = Number(bbox[1]);
  const west = Number(bbox[2]);
  const east = Number(bbox[3]);

  const area = Math.abs(north - south) * Math.abs(east - west);

  if (area > 0.5) return 25000;
  if (area > 0.1) return 15000;
  return 8000;
}

/* ---------------- FINAL Overpass fetch ---------------- */

async function fetchHospitals(
  lat: number,
  lon: number,
  radius: number
): Promise<Place[]> {
  const query = `
[out:json][timeout:25];
(
  node["amenity"="hospital"](around:${radius},${lat},${lon});
  node["amenity"="clinic"](around:${radius},${lat},${lon});
);
out body;
`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });

    if (!res.ok) return [];

    const data = await res.json();
    return data.elements ?? [];
  } catch (err) {
    console.error("Overpass failed", err);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

/* ================= PAGE ================= */

export default function Page() {
  const [city, setCity] = useState("");
  const [center, setCenter] = useState<[number, number]>([20.5937, 78.9629]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [sheetState, setSheetState] = useState<SheetState>("mid");

  async function search() {
    if (!city) return;

    setLoading(true);
    setPlaces([]);
    setSelectedId(null);

    try {
      const geo = await fetch(`/api/geocode?city=${city}`).then((r) =>
        r.json()
      );

      if (!geo) {
        setLoading(false);
        return;
      }

      const lat = Number(geo.lat);
      const lon = Number(geo.lon);
      setCenter([lat, lon]);

      const radius = getRadiusFromBoundingBox(geo.boundingbox);

      const results = await fetchHospitals(lat, lon, radius);

      setPlaces(results);
    } catch (e) {
      console.error("Search error", e);
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(p: Place) {
    setSelectedId(p.id);
    setCenter([p.lat, p.lon]);

    if (window.innerWidth < 768) {
      setSheetState("expanded");
    }
  }

  return (
    // Main Container: Uses 100dvh for better mobile browser support
    <div className="relative flex flex-col h-[100dvh] w-full overflow-hidden bg-neutral-100 md:flex-row">
      
      {/* UI Overlay Container 
        - Mobile: Absolute overlay with pointer-events-none (so you can click the map through it)
        - Desktop: Relative sidebar with shadow
      */}
      <div className="absolute inset-0 z-20 flex flex-col justify-between pointer-events-none md:pointer-events-auto md:relative md:inset-auto md:h-full md:w-[400px] md:justify-start md:bg-white md:shadow-2xl md:border-r border-neutral-200">
        
        {/* Top Search Area */}
        <div className="pointer-events-auto w-full p-4 md:p-6 md:pb-4">
          <div className="shadow-lg md:shadow-none rounded-xl bg-white/90 backdrop-blur-md md:bg-transparent md:backdrop-blur-none p-1 md:p-0 ring-1 ring-black/5 md:ring-0">
            <SearchBar
              value={city}
              onChange={setCity}
              onSearch={search}
            />
          </div>
        </div>

        {/* Bottom List Area */}
        <div className="pointer-events-auto w-full md:flex-1 md:overflow-hidden md:flex md:flex-col">
          <PlacesList
            places={places}
            loading={loading}
            selectedId={selectedId}
            sheetState={sheetState}
            onSheetStateChange={setSheetState}
            onSelect={handleSelect}
          />
        </div>
      </div>

      {/* Desktop Map Container (Right Side) */}
      <div className="hidden md:block flex-1 relative h-full bg-neutral-200">
        <MapView
          center={center}
          places={places}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
      </div>

      {/* Mobile Map Background (Full Screen Behind UI) */}
      <div className="absolute inset-0 z-0 md:hidden bg-neutral-200">
        <MapView
          center={center}
          places={places}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
      </div>
    </div>
  );
}