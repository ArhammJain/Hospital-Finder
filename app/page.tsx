"use client";

import { useState } from "react";

/* ===================== TYPES ===================== */

interface Place {
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/* ===================== MINIMAL PAGE ===================== */

export default function MinimalTest() {
  const [city, setCity] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function search() {
    if (!city.trim()) return;

    setLoading(true);
    setPlaces([]);
    setStatus("🔍 Starting search...");

    try {
      // Step 1: Geocode
      setStatus("📍 Finding city location...");
      const geoRes = await fetch(`/api/geocode?city=${encodeURIComponent(city.trim())}`);
      const geo = await geoRes.json();
      
      if (!geo?.lat || !geo?.lon) {
        setStatus("❌ City not found");
        setLoading(false);
        return;
      }

      const lat = parseFloat(geo.lat);
      const lon = parseFloat(geo.lon);
      
      setStatus(`✅ Found: [${lat.toFixed(4)}, ${lon.toFixed(4)}]`);

      // Step 2: Fetch hospitals
      setStatus("🏥 Searching for hospitals...");
      
      const query = `[out:json][timeout:25];
(
  node["amenity"="hospital"](around:15000,${lat},${lon});
  way["amenity"="hospital"](around:15000,${lat},${lon});
);
out center;`;

      console.log("Sending query:", query);

      const overpassRes = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: query,
      });

      console.log("Overpass response status:", overpassRes.status);

      if (!overpassRes.ok) {
        const errorText = await overpassRes.text();
        console.error("Overpass error:", errorText);
        setStatus(`❌ API Error: ${overpassRes.status}`);
        setLoading(false);
        return;
      }

      const data = await overpassRes.json();
      console.log("Overpass data:", data);

      if (!data.elements || data.elements.length === 0) {
        setStatus("⚠️ No hospitals found in this area");
        setLoading(false);
        return;
      }

      // Process results
      const results: Place[] = [];
      for (const el of data.elements as OverpassElement[]) {
        const elLat = el.lat ?? el.center?.lat;
        const elLon = el.lon ?? el.center?.lon;
        
        if (elLat && elLon) {
          results.push({
            id: el.id,
            lat: elLat,
            lon: elLon,
            tags: el.tags,
          });
        }
      }

      setPlaces(results);
      setStatus(`✅ Found ${results.length} places!`);
      console.log("Final results:", results);

    } catch (err) {
      console.error("Search error:", err);
      setStatus(`💥 Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">🏥 Hospital Finder - Debug Mode</h1>

        {/* Search Input */}
        <div className="mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Enter city name (e.g., London)"
              className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-lg focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={search}
              disabled={loading}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg font-semibold transition-colors"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </div>

        {/* Status */}
        {status && (
          <div className="mb-6 p-4 bg-gray-800 border border-gray-700 rounded-lg">
            <p className="text-lg font-mono">{status}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mb-6 p-8 bg-gray-800 border border-gray-700 rounded-lg text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Scanning area...</p>
          </div>
        )}

        {/* Results */}
        {!loading && places.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">
              📋 Results ({places.length})
            </h2>
            {places.map((place) => (
              <div
                key={place.id}
                className="p-4 bg-gray-800 border border-gray-700 rounded-lg hover:border-blue-500 transition-colors"
              >
                <h3 className="text-xl font-semibold text-blue-400 mb-2">
                  {place.tags?.name || "Unnamed Hospital"}
                </h3>
                <div className="text-sm text-gray-400 space-y-1">
                  <p>📍 Coordinates: {place.lat.toFixed(6)}, {place.lon.toFixed(6)}</p>
                  <p>🏷️ Type: {place.tags?.amenity || place.tags?.healthcare || "hospital"}</p>
                  {place.tags?.["addr:full"] && (
                    <p>📬 Address: {place.tags["addr:full"]}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && places.length === 0 && status.includes("⚠️") && (
          <div className="p-8 bg-gray-800 border border-yellow-600 rounded-lg text-center">
            <p className="text-xl text-yellow-500 mb-2">No results found</p>
            <p className="text-gray-400">Try searching for a larger city</p>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-12 p-6 bg-gray-800 border border-gray-700 rounded-lg">
          <h3 className="text-lg font-bold mb-3">📝 Debug Instructions</h3>
          <ol className="space-y-2 text-gray-300 list-decimal list-inside">
            <li>Open browser console (F12)</li>
            <li>Try searching for Bhusawal</li>
            <li>Check console for detailed logs</li>
            <li>Look for any error messages</li>
            <li>If it works here but not in your app, the issue is in PlacesList component</li>
          </ol>
        </div>
      </div>
    </div>
  );
}