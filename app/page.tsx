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

/* ---------- Radius logic ---------- */
function getRadiusFromBoundingBox(bbox: string[]): number {
  const south = Number(bbox[0]);
  const north = Number(bbox[1]);
  const west = Number(bbox[2]);
  const east = Number(bbox[3]);

  const area =
    Math.abs(north - south) * Math.abs(east - west);

  if (area > 0.5) return 25000;
  if (area > 0.1) return 15000;
  return 8000;
}

/* ---------- Overpass client fetch ---------- */
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

  const res = await fetch(
    "https://overpass-api.de/api/interpreter",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: query,
    }
  );

  if (!res.ok) return [];

  const data = await res.json();
  return data.elements ?? [];
}

export default function Page() {
  const [city, setCity] = useState("");
  const [center, setCenter] = useState<[number, number]>([
    20.5937, 78.9629,
  ]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [sheetState, setSheetState] =
    useState<SheetState>("mid");

  async function search() {
    if (!city) return;

    setLoading(true);
    setPlaces([]);
    setSelectedId(null);

    const geo = await fetch(
      `/api/geocode?city=${city}`
    ).then((r) => r.json());

    if (!geo) {
      setLoading(false);
      return;
    }

    const lat = Number(geo.lat);
    const lon = Number(geo.lon);
    setCenter([lat, lon]);

    const radius = getRadiusFromBoundingBox(
      geo.boundingbox
    );

    const results = await fetchHospitals(
      lat,
      lon,
      radius
    );

    setPlaces(results);
    setLoading(false);
  }

  function handleSelect(p: Place) {
    setSelectedId(p.id);
    setCenter([p.lat, p.lon]);

    if (window.innerWidth < 768) {
      setSheetState("expanded");
    }
  }

  return (
    <div className="h-screen flex">
      <div className="w-full md:w-[32%] border-r">
        <SearchBar
          value={city}
          onChange={setCity}
          onSearch={search}
        />

        <PlacesList
          places={places}
          loading={loading}
          selectedId={selectedId}
          sheetState={sheetState}
          onSheetStateChange={setSheetState}
          onSelect={handleSelect}
        />
      </div>

      <div className="hidden md:block md:w-[68%]">
        <MapView
          center={center}
          places={places}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
      </div>

      <div className="md:hidden absolute inset-0 -z-10">
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
