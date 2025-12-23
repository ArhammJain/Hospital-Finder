"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Place } from "@/types/place";
import SearchBar from "@/components/SearchBar";
import PlacesList from "@/components/PlacesList";
import { Activity, Map as MapIcon, Layers } from "lucide-react";

// Dynamic import for Map to avoid SSR issues
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400 animate-pulse">
      <div className="flex flex-col items-center gap-2">
        <MapIcon size={32} />
        <p className="text-sm font-medium">Loading Map...</p>
      </div>
    </div>
  ),
});

/* Radius Logic Helper */
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

export default function HomePage() {
  const [city, setCity] = useState("");
  const [center, setCenter] = useState<[number, number]>([20.5937, 78.9629]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Search Handler
  async function search() {
    if (!city) return;
    setLoading(true);
    setPlaces([]);
    setSelectedId(null);

    try {
      const geo = await fetch(`/api/geocode?city=${city}`).then((r) => r.json());
      if (!geo) {
        setLoading(false);
        return;
      }

      const lat = Number(geo.lat);
      const lon = Number(geo.lon);
      setCenter([lat, lon]);

      const radius = getRadiusFromBoundingBox(geo.boundingbox);
      const results = await fetch(
        `/api/places?lat=${lat}&lon=${lon}&radius=${radius}`
      ).then((r) => r.json());

      setPlaces(results);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setLoading(false);
    }
  }

  // Selection Handler
  function handleSelect(p: Place) {
    setSelectedId(p.id);
    setCenter([p.lat, p.lon]);
  }

  return (
    <div className="relative flex h-[100dvh] w-full overflow-hidden bg-slate-50">
      
      {/* --------------------------------------------------
        DESKTOP SIDEBAR
        Visible only on md+ screens. 
        Contains Branding, Search, and the List.
        --------------------------------------------------
      */}
      <aside className="hidden md:flex z-30 flex-col w-[400px] lg:w-[450px] shrink-0 h-full bg-white border-r border-slate-200 shadow-xl">
        {/* Branding */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5 bg-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-blue-200 shadow-md">
            <Activity size={20} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">
            MediFind
          </h1>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-50">
          <SearchBar value={city} onChange={setCity} onSearch={search} />
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-hidden relative">
           <PlacesList
            places={places}
            loading={loading}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        </div>
      </aside>

      {/* --------------------------------------------------
        MOBILE OVERLAY ELEMENTS
        Visible only on mobile (md:hidden).
        --------------------------------------------------
      */}
      
      {/* Mobile Top Floating Search Bar */}
      <div className="md:hidden absolute top-0 left-0 right-0 z-40 p-4 pointer-events-none">
        <div className="pointer-events-auto shadow-xl shadow-slate-200/50 rounded-2xl bg-white/95 backdrop-blur-sm border border-white p-2">
            <SearchBar value={city} onChange={setCity} onSearch={search} />
        </div>
      </div>

      {/* Mobile Bottom Sheet List 
          We render PlacesList here again for mobile. 
          The component internally handles being a "Bottom Sheet" on mobile screens.
      */}
      <div className="md:hidden">
        <PlacesList
            places={places}
            loading={loading}
            selectedId={selectedId}
            onSelect={handleSelect}
        />
      </div>

      {/* --------------------------------------------------
        MAIN MAP AREA
        Fills the screen. On mobile, it sits behind the UI.
        --------------------------------------------------
      */}
      <main className="flex-1 h-full relative z-0">
        <MapView
          center={center}
          places={places}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
        
        {/* Desktop-only floating Map Controls (Visual flair) */}
        <div className="hidden md:flex absolute top-4 right-4 z-[400] gap-2">
          <button className="bg-white p-2 rounded-lg shadow-md border border-slate-100 text-slate-600 hover:text-blue-600 transition">
             <Layers size={20} />
          </button>
        </div>
      </main>
      
    </div>
  );
}