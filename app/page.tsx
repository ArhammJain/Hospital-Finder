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

/* ---------------- Type definitions ---------------- */

interface OverpassElement {
  id: number;
  lat?: number;
  lon?: number;
  tags?: {
    name?: string;
    amenity?: string;
    [key: string]: string | undefined;
  };
  type?: string;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

/* ---------------- Radius calculation with improved logic ---------------- */

function getRadiusFromBoundingBox(bbox: string[]): number {
  const south = Number(bbox[0]);
  const north = Number(bbox[1]);
  const west = Number(bbox[2]);
  const east = Number(bbox[3]);

  // Calculate approximate area in square degrees
  const area = Math.abs(north - south) * Math.abs(east - west);

  // More generous radius calculations for better results
  if (area > 1.0) return 50000; // Very large metropolitan area
  if (area > 0.5) return 30000; // Large city
  if (area > 0.1) return 20000; // Medium city
  if (area > 0.01) return 10000; // Small city
  return 5000; // Small area or town
}

/* ---------------- Overpass API fetch with proper error handling ---------------- */

async function fetchHospitals(
  lat: number,
  lon: number,
  radius: number
): Promise<Place[]> {
  const query = `
[out:json][timeout:25];
(
  node["amenity"="hospital"](around:${radius},${lat},${lon});
  way["amenity"="hospital"](around:${radius},${lat},${lon});
  node["amenity"="clinic"](around:${radius},${lat},${lon});
  way["amenity"="clinic"](around:${radius},${lat},${lon});
);
out body;
>;
out skel qt;
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

    if (!res.ok) {
      console.error("Overpass API error:", res.status, res.statusText);
      throw new Error(`Overpass API returned ${res.status}`);
    }

    const data: OverpassResponse = await res.json();
    
    if (!data.elements) {
      return [];
    }

    // Filter and process results
    const places: Place[] = data.elements
      .filter((el): el is OverpassElement & { lat: number; lon: number; tags: NonNullable<OverpassElement['tags']> & { name: string } } => 
        typeof el.lat === 'number' && 
        typeof el.lon === 'number' && 
        el.tags?.name !== undefined
      )
      .map((el) => ({
        id: el.id,
        lat: el.lat,
        lon: el.lon,
        tags: el.tags,
      }));

    return places;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error("Overpass API request timed out");
      throw new Error("Request timed out. Please try again.");
    }
    console.error("Overpass API failed:", err);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/* ================= Main Page Component ================= */

export default function Page() {
  const [city, setCity] = useState("");
  const [center, setCenter] = useState<[number, number]>([20.5937, 78.9629]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetState, setSheetState] = useState<SheetState>("mid");

  async function search() {
    if (!city.trim()) {
      setError("Please enter a city name");
      return;
    }

    setLoading(true);
    setPlaces([]);
    setSelectedId(null);
    setError(null);

    try {
      // Step 1: Geocode the city
      const geoRes = await fetch(
        `/api/geocode?city=${encodeURIComponent(city.trim())}`
      );

      if (!geoRes.ok) {
        throw new Error("Failed to find city location");
      }

      const geo = await geoRes.json();

      if (!geo || !geo.lat || !geo.lon) {
        throw new Error("City not found. Please check the spelling and try again.");
      }

      const lat = Number(geo.lat);
      const lon = Number(geo.lon);

      // Validate coordinates
      if (isNaN(lat) || isNaN(lon)) {
        throw new Error("Invalid location data received");
      }

      setCenter([lat, lon]);

      // Step 2: Calculate search radius
      const radius = geo.boundingbox
        ? getRadiusFromBoundingBox(geo.boundingbox)
        : 15000; // Default fallback

      // Step 3: Fetch hospitals and clinics
      let results = await fetchHospitals(lat, lon, radius);

      // Step 4: If no results, try with a larger radius
      if (results.length === 0 && radius < 30000) {
        console.log("No results found, expanding search radius...");
        results = await fetchHospitals(lat, lon, Math.min(radius * 2, 50000));
      }

      if (results.length === 0) {
        setError(
          "No hospitals or clinics found in this area. Try searching for a larger city nearby."
        );
      } else {
        // Sort by distance from center (optional)
        results.sort((a, b) => {
          const distA = Math.sqrt(
            Math.pow(a.lat - lat, 2) + Math.pow(a.lon - lon, 2)
          );
          const distB = Math.sqrt(
            Math.pow(b.lat - lat, 2) + Math.pow(b.lon - lon, 2)
          );
          return distA - distB;
        });
      }

      setPlaces(results);
    } catch (err) {
      console.error("Search error:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An error occurred while searching. Please try again.";
      setError(errorMessage);
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

  function handleRetry() {
    setError(null);
    if (city.trim()) {
      search();
    }
  }

  return (
    <div className="relative flex flex-col h-[100dvh] w-full overflow-hidden bg-neutral-100 md:flex-row">
      {/* UI Overlay Container */}
      <div className="absolute inset-0 z-20 flex flex-col justify-between pointer-events-none md:pointer-events-auto md:relative md:inset-auto md:h-full md:w-[400px] md:justify-start md:bg-white md:shadow-2xl md:border-r border-neutral-200">
        {/* Top Search Area */}
        <div className="pointer-events-auto w-full p-4 md:p-6 md:pb-4">
          <div className="shadow-lg md:shadow-none rounded-xl bg-white/95 backdrop-blur-md md:bg-transparent md:backdrop-blur-none p-1 md:p-0 ring-1 ring-black/5 md:ring-0">
            <SearchBar value={city} onChange={setCity} onSearch={search} />
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg shadow-sm">
              <div className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-red-800">{error}</p>
                  <button
                    onClick={handleRetry}
                    className="mt-2 text-xs text-red-600 hover:text-red-700 font-medium underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}
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