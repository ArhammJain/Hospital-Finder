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
  center?: {
    lat: number;
    lon: number;
  };
  tags?: {
    name?: string;
    amenity?: string;
    healthcare?: string;
    [key: string]: string | undefined;
  };
  type?: string;
}

interface OverpassResponse {
  version: number;
  generator: string;
  elements: OverpassElement[];
  remark?: string;
}

/* ---------------- Radius calculation ---------------- */

function getRadiusFromBoundingBox(bbox: string[]): number {
  const south = Number(bbox[0]);
  const north = Number(bbox[1]);
  const west = Number(bbox[2]);
  const east = Number(bbox[3]);

  const area = Math.abs(north - south) * Math.abs(east - west);

  // Start with generous radius
  if (area > 1.0) return 50000;
  if (area > 0.5) return 30000;
  if (area > 0.1) return 20000;
  if (area > 0.01) return 10000;
  return 8000;
}

/* ---------------- Fixed Overpass API fetch ---------------- */

async function fetchHospitals(
  lat: number,
  lon: number,
  radius: number
): Promise<Place[]> {
  console.log(`🔍 Searching hospitals at [${lat}, ${lon}] radius: ${radius}m`);

  // FIXED: Proper Overpass QL query with correct syntax
  const query = `[out:json][timeout:30];
(
  node["amenity"="hospital"](around:${radius},${lat},${lon});
  way["amenity"="hospital"](around:${radius},${lat},${lon});
  node["amenity"="clinic"](around:${radius},${lat},${lon});
  way["amenity"="clinic"](around:${radius},${lat},${lon});
  node["healthcare"="hospital"](around:${radius},${lat},${lon});
  way["healthcare"="hospital"](around:${radius},${lat},${lon});
);
out center;`;

  try {
    console.log("📡 Calling Overpass API...");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
      
      // Try to read error message
      const text = await response.text();
      console.error("Response:", text);
      
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    console.log("📄 Content-Type:", contentType);

    const data: OverpassResponse = await response.json();
    console.log("✅ Response received");
    console.log("📊 Elements:", data.elements?.length || 0);

    if (data.remark) {
      console.warn("⚠️ Remark:", data.remark);
    }

    if (!data.elements || data.elements.length === 0) {
      console.log("⚠️ No elements returned");
      return [];
    }

    // Process results - handle both nodes and ways
    const places: Place[] = [];

    for (const el of data.elements) {
      // For nodes, use lat/lon directly
      // For ways, use center coordinates
      const elementLat = el.lat ?? el.center?.lat;
      const elementLon = el.lon ?? el.center?.lon;

      if (
        typeof elementLat === "number" &&
        typeof elementLon === "number" &&
        el.tags
      ) {
        places.push({
          id: el.id,
          lat: elementLat,
          lon: elementLon,
          tags: el.tags,
        });
      } else {
        console.log("⚠️ Skipping element without coordinates:", el.id);
      }
    }

    console.log(`✨ Processed ${places.length} valid places`);

    // Debug: show sample of what we got
    if (places.length > 0) {
      console.log("Sample place:", {
        id: places[0].id,
        name: places[0].tags?.name || "Unnamed",
        amenity: places[0].tags?.amenity,
        lat: places[0].lat,
        lon: places[0].lon,
      });
    }

    return places;
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        console.error("⏱️ Request timed out");
        throw new Error("Request timed out. The server is slow, try again.");
      }
      console.error("❌ Error:", err.message);
      throw err;
    }
    throw new Error("Unknown error occurred");
  }
}

/* ================= Main Component ================= */

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

    console.log("\n🌍 ========== NEW SEARCH ==========");
    console.log("City:", city);

    try {
      // Step 1: Geocode
      console.log("📍 Step 1: Geocoding...");
      const geoRes = await fetch(
        `/api/geocode?city=${encodeURIComponent(city.trim())}`
      );

      if (!geoRes.ok) {
        throw new Error(`Geocoding failed: ${geoRes.status}`);
      }

      const geo = await geoRes.json();
      console.log("Geocode result:", geo);

      if (!geo || !geo.lat || !geo.lon) {
        throw new Error("City not found");
      }

      const lat = Number(geo.lat);
      const lon = Number(geo.lon);

      if (isNaN(lat) || isNaN(lon)) {
        throw new Error("Invalid coordinates");
      }

      console.log(`✓ Coordinates: [${lat}, ${lon}]`);
      setCenter([lat, lon]);

      // Step 2: Calculate radius
      const baseRadius = geo.boundingbox
        ? getRadiusFromBoundingBox(geo.boundingbox)
        : 15000;

      console.log(`📏 Base radius: ${baseRadius}m`);

      // Step 3: Try progressively larger radii
      const attempts = [
        { radius: baseRadius, label: "initial" },
        { radius: Math.min(baseRadius * 1.5, 40000), label: "expanded" },
        { radius: 50000, label: "maximum" },
      ];

      let results: Place[] = [];

      for (let i = 0; i < attempts.length; i++) {
        const { radius, label } = attempts[i];
        
        console.log(`\n🔄 Attempt ${i + 1}/${attempts.length} (${label}): ${radius}m`);

        try {
          results = await fetchHospitals(lat, lon, radius);

          if (results.length > 0) {
            console.log(`✅ SUCCESS: Found ${results.length} results`);
            break;
          }

          console.log("⚠️ No results, trying next radius...");
        } catch (attemptError) {
          console.error(`❌ Attempt ${i + 1} failed:`, attemptError);
          
          // If this is the last attempt, throw the error
          if (i === attempts.length - 1) {
            throw attemptError;
          }
          
          // Otherwise, continue to next attempt
          console.log("Continuing to next attempt...");
        }
      }

      // Sort by distance
      if (results.length > 0) {
        results.sort((a, b) => {
          const distA = Math.sqrt(
            Math.pow(a.lat - lat, 2) + Math.pow(a.lon - lon, 2)
          );
          const distB = Math.sqrt(
            Math.pow(b.lat - lat, 2) + Math.pow(b.lon - lon, 2)
          );
          return distA - distB;
        });

        console.log("✨ Results sorted by distance");
      } else {
        console.log("❌ No results found after all attempts");
        setError(
          "No hospitals or clinics found in this area. This may be a remote location or the data may not be available in OpenStreetMap."
        );
      }

      setPlaces(results);
      console.log("\n🏁 Search complete:", results.length, "places");
    } catch (err) {
      console.error("\n💥 SEARCH FAILED:", err);
      
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Search failed. Please try again.";
      
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
      {/* UI Overlay */}
      <div className="absolute inset-0 z-20 flex flex-col justify-between pointer-events-none md:pointer-events-auto md:relative md:inset-auto md:h-full md:w-[400px] md:justify-start md:bg-white md:shadow-2xl md:border-r border-neutral-200">
        {/* Search Bar */}
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

          {/* Debug Info - Remove this in production */}
          {process.env.NODE_ENV === "development" && (
            <div className="mt-2 text-xs text-gray-500">
              Debug: Open browser console (F12) to see detailed logs
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