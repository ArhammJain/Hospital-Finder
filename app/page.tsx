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

/* ===================== TYPES ===================== */

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  version: number;
  generator: string;
  elements: OverpassElement[];
}

/* ===================== HELPERS ===================== */

function calculateRadius(bbox?: string[]): number {
  if (!bbox || bbox.length !== 4) return 15000;

  const [south, north, west, east] = bbox.map(Number);
  const area = Math.abs(north - south) * Math.abs(east - west);

  if (area > 1.0) return 50000;
  if (area > 0.5) return 35000;
  if (area > 0.1) return 25000;
  if (area > 0.01) return 15000;
  return 10000;
}

/* ===================== OVERPASS API ===================== */

async function fetchPlaces(
  lat: number,
  lon: number,
  radius: number
): Promise<Place[]> {
  console.log(`🔍 Fetching places: lat=${lat}, lon=${lon}, radius=${radius}m`);

  // Simple, proven query format
  const query = `[out:json][timeout:30];
(
  node["amenity"="hospital"](around:${radius},${lat},${lon});
  way["amenity"="hospital"](around:${radius},${lat},${lon});
  node["amenity"="clinic"](around:${radius},${lat},${lon});
  way["amenity"="clinic"](around:${radius},${lat},${lon});
);
out center;`;

  console.log("📡 Sending query to Overpass API...");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
    });

    clearTimeout(timeoutId);

    console.log(`📨 Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Overpass error response:", errorText);
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data: OverpassResponse = await response.json();
    console.log(`📊 Raw elements: ${data.elements?.length || 0}`);

    if (!data.elements || data.elements.length === 0) {
      return [];
    }

    // Process elements
    const places: Place[] = [];

    for (const element of data.elements) {
      // Get coordinates (nodes have lat/lon, ways have center)
      const elementLat = element.lat ?? element.center?.lat;
      const elementLon = element.lon ?? element.center?.lon;

      if (!elementLat || !elementLon || !element.tags) {
        continue;
      }

      places.push({
        id: element.id,
        lat: elementLat,
        lon: elementLon,
        tags: element.tags,
      });
    }

    console.log(`✅ Valid places: ${places.length}`);

    return places;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("⏱️ Request timeout");
      throw new Error("Request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/* ===================== MAIN COMPONENT ===================== */

export default function Page() {
  const [city, setCity] = useState("");
  const [center, setCenter] = useState<[number, number]>([20.5937, 78.9629]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetState, setSheetState] = useState<SheetState>("mid");

  async function handleSearch() {
    const trimmedCity = city.trim();

    if (!trimmedCity) {
      setError("Please enter a city name");
      return;
    }

    console.log("\n" + "=".repeat(50));
    console.log("🌍 NEW SEARCH:", trimmedCity);
    console.log("=".repeat(50));

    setLoading(true);
    setPlaces([]);
    setSelectedId(null);
    setError(null);

    try {
      // STEP 1: Geocode
      console.log("📍 Step 1: Geocoding...");
      const geoResponse = await fetch(
        `/api/geocode?city=${encodeURIComponent(trimmedCity)}`
      );

      if (!geoResponse.ok) {
        throw new Error(`Geocoding failed: ${geoResponse.status}`);
      }

      const geoData = await geoResponse.json();
      console.log("Geocode response:", geoData);

      if (!geoData?.lat || !geoData?.lon) {
        throw new Error("City not found. Please check spelling.");
      }

      const lat = parseFloat(geoData.lat);
      const lon = parseFloat(geoData.lon);

      if (isNaN(lat) || isNaN(lon)) {
        throw new Error("Invalid coordinates received");
      }

      console.log(`✓ Coordinates: [${lat}, ${lon}]`);
      setCenter([lat, lon]);

      // STEP 2: Fetch places with multiple attempts
      console.log("\n🏥 Step 2: Fetching places...");

      const baseRadius = calculateRadius(geoData.boundingbox);
      console.log(`📏 Base radius: ${baseRadius}m`);

      const attempts = [
        baseRadius,
        Math.min(baseRadius * 2, 50000),
        50000,
      ];

      let results: Place[] = [];

      for (let i = 0; i < attempts.length; i++) {
        const currentRadius = attempts[i];
        console.log(`\n🔄 Attempt ${i + 1}/${attempts.length}: ${currentRadius}m`);

        try {
          results = await fetchPlaces(lat, lon, currentRadius);

          if (results.length > 0) {
            console.log(`✅ Found ${results.length} places!`);
            break;
          }

          console.log("⚠️ No results, trying next radius...");
        } catch (attemptError) {
          console.error(`❌ Attempt failed:`, attemptError);
          if (i === attempts.length - 1) throw attemptError;
        }
      }

      // STEP 3: Sort by distance
      if (results.length > 0) {
        results.sort((a, b) => {
          const distA = Math.hypot(a.lat - lat, a.lon - lon);
          const distB = Math.hypot(b.lat - lat, b.lon - lon);
          return distA - distB;
        });
      } else {
        setError(
          "No hospitals or clinics found nearby. Try a larger city or different location."
        );
      }

      setPlaces(results);
      console.log(`\n✨ Final result: ${results.length} places`);
    } catch (err) {
      console.error("\n💥 Search failed:", err);

      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";

      setError(message);
      setPlaces([]);
    } finally {
      setLoading(false);
      console.log("=".repeat(50) + "\n");
    }
  }

  function handleSelect(place: Place) {
    setSelectedId(place.id);
    setCenter([place.lat, place.lon]);

    if (window.innerWidth < 768) {
      setSheetState("expanded");
    }
  }

  function handleRetry() {
    setError(null);
    if (city.trim()) {
      handleSearch();
    }
  }

  return (
    <div className="relative flex flex-col h-[100dvh] w-full overflow-hidden bg-neutral-100 md:flex-row">
      {/* UI Container */}
      <div className="absolute inset-0 z-20 flex flex-col justify-between pointer-events-none md:pointer-events-auto md:relative md:inset-auto md:h-full md:w-[400px] md:justify-start md:bg-white md:shadow-2xl md:border-r border-neutral-200">
        {/* Search Area */}
        <div className="pointer-events-auto w-full p-4 md:p-6 md:pb-4">
          <div className="shadow-lg md:shadow-none rounded-xl bg-white/95 backdrop-blur-md md:bg-transparent md:backdrop-blur-none p-1 md:p-0 ring-1 ring-black/5 md:ring-0">
            <SearchBar
              value={city}
              onChange={setCity}
              onSearch={handleSearch}
            />
          </div>

          {/* Error Message */}
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

        {/* Places List */}
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

      {/* Desktop Map */}
      <div className="hidden md:block flex-1 relative h-full bg-neutral-200">
        <MapView
          center={center}
          places={places}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
      </div>

      {/* Mobile Map */}
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