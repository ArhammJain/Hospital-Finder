"use client";

import { useState, useRef, useEffect } from "react";
import { Place } from "@/types/place";
import {
  Building2,
  Stethoscope,
  MapPin,
  Loader2,
  Navigation,
  SearchX,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

/* ---------------- Types ---------------- */

type Props = {
  places: Place[];
  loading: boolean;
  selectedId: number | null;
  onSelect: (p: Place) => void;
};

type Tab = "hospital" | "clinic";
type SheetState = "collapsed" | "mid" | "expanded";

type ListContentProps = {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  filteredPlaces: Place[];
  loading: boolean;
  selectedId: number | null;
  onSelect: (p: Place) => void;
};

/* ---------------- Helpers ---------------- */

function formatAddress(tags?: Record<string, string>) {
  if (!tags) return null;

  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:suburb"],
    tags["addr:city"],
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : null;
}

function openDirections(lat: number, lon: number) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
  window.open(url, "_blank");
}

/* ---------------- Main ---------------- */

export default function PlacesList({
  places,
  loading,
  selectedId,
  onSelect,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("hospital");
  const [sheetState, setSheetState] = useState<SheetState>("mid");

  const touchStartY = useRef<number | null>(null);

  const filteredPlaces = places.filter(
    (p) => p.tags?.amenity === activeTab
  );

  /* ---------- Auto-expand on selection (mobile only) ---------- */
  useEffect(() => {
    if (selectedId && window.innerWidth < 768) {
      setSheetState("expanded");
    }
  }, [selectedId]);

  /* ---------- Swipe Handlers (No Logic Changed) ---------- */

  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartY.current === null) return;

    const deltaY =
      e.changedTouches[0].clientY - touchStartY.current;

    touchStartY.current = null;

    if (deltaY < -50) {
      setSheetState((s) =>
        s === "collapsed" ? "mid" : "expanded"
      );
    }

    if (deltaY > 50) {
      setSheetState((s) =>
        s === "expanded" ? "mid" : "collapsed"
      );
    }
  }

  /* ---------- Height Mapping ---------- */

  const sheetHeightClass =
    sheetState === "collapsed"
      ? "h-[20vh]"
      : sheetState === "mid"
      ? "h-[50vh]"
      : "h-[85vh]";

  /* ---------- Snap Indicator Text ---------- */

  function snapHint() {
    if (sheetState === "collapsed")
      return (
        <span className="flex items-center gap-1 animate-pulse">
          <ChevronUp size={14} /> Swipe up to expand
        </span>
      );
    if (sheetState === "expanded")
      return (
        <span className="flex items-center gap-1">
          <ChevronDown size={14} /> Swipe down to collapse
        </span>
      );
    return (
      <span className="flex items-center gap-1">
        <ChevronUp size={12} />
        <ChevronDown size={12} /> Swipe
      </span>
    );
  }

  return (
    <>
      {/* ---------------- Desktop Sidebar (MD+) ---------------- */}
      <div className="hidden md:flex flex-col w-[400px] h-full bg-white border-r border-slate-200 shadow-xl z-20 relative">
        <ListContent
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          filteredPlaces={filteredPlaces}
          loading={loading}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      </div>

      {/* ---------------- Mobile Bottom Sheet (< MD) ---------------- */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        <div
          className={`
            pointer-events-auto bg-white rounded-t-[2rem] shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.3)]
            transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
            flex flex-col
            ${sheetHeightClass}
          `}
        >
          {/* Grab Handle + Snap Indicator */}
          <div
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            className="flex-none flex flex-col items-center gap-2 pt-3 pb-2 cursor-grab active:cursor-grabbing hover:bg-slate-50 transition-colors rounded-t-[2rem]"
          >
            {/* Pill Handle */}
            <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            
            {/* Hint Text */}
            <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400 uppercase tracking-wide select-none">
              {snapHint()}
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-4 pb-safe scrollbar-hide">
            <ListContent
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              filteredPlaces={filteredPlaces}
              loading={loading}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------------- Extracted List UI ---------------- */

function ListContent({
  activeTab,
  setActiveTab,
  filteredPlaces,
  loading,
  selectedId,
  onSelect,
}: ListContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header Section */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-100 pb-3 pt-1">
        <div className="px-1 mb-3">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Medical Facilities
          </h2>
          <p className="text-xs font-medium text-slate-500">
            {loading ? "Updating results..." : `${filteredPlaces.length} locations found`}
          </p>
        </div>

        {/* Modern Segmented Control Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100/80 border border-slate-200">
          <button
            onClick={() => setActiveTab("hospital")}
            className={`
              flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all duration-200
              ${activeTab === "hospital"
                ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}
            `}
          >
            <Building2 size={15} strokeWidth={2.5} />
            Hospitals
          </button>

          <button
            onClick={() => setActiveTab("clinic")}
            className={`
              flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all duration-200
              ${activeTab === "clinic"
                ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}
            `}
          >
            <Stethoscope size={15} strokeWidth={2.5} />
            Clinics
          </button>
        </div>
      </div>

      {/* Loading & Empty States */}
      <div className="flex-1 min-h-[200px]">
        {loading && (
          <div className="flex flex-col items-center justify-center h-48 animate-in fade-in zoom-in duration-300">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
            <p className="text-sm font-medium text-slate-600">Scanning area...</p>
          </div>
        )}

        {!loading && filteredPlaces.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50 mt-4 mx-2">
            <div className="p-3 bg-slate-100 rounded-full mb-3 text-slate-400">
              <SearchX size={20} />
            </div>
            <p className="text-sm font-semibold text-slate-600">No {activeTab}s found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[200px] text-center">
              Try moving the map to a different location.
            </p>
          </div>
        )}

        {/* List Items */}
        <div className="mt-3 space-y-3 pb-8">
          {filteredPlaces.map((p, index) => {
            const selected = p.id === selectedId;
            const address = formatAddress(p.tags);

            return (
              <div
                key={p.id}
                onClick={() => onSelect(p)}
                className={`
                  group relative flex flex-col gap-3 rounded-2xl border p-4 cursor-pointer transition-all duration-300 ease-out
                  ${selected
                    ? "bg-blue-50/40 border-blue-500 ring-1 ring-blue-500/20 shadow-md"
                    : "bg-white border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-lg hover:-translate-y-0.5"}
                `}
              >
                {/* Header Row: Rank + Name + Action */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 overflow-hidden">
                    {/* Rank Badge */}
                    <span 
                      className={`
                        flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors mt-0.5
                        ${selected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-blue-600 group-hover:text-white"}
                      `}
                    >
                      {index + 1}
                    </span>
                    
                    {/* Name */}
                    <div>
                      <h3 className={`font-semibold text-sm leading-tight truncate ${selected ? "text-blue-700" : "text-slate-900"}`}>
                        {p.tags?.name ?? "Unnamed Facility"}
                      </h3>
                      {p.tags?.healthcare && (
                         <span className="inline-block mt-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                           {p.tags.healthcare}
                         </span>
                      )}
                    </div>
                  </div>

                  {/* Directions Button (Pill Style) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openDirections(p.lat, p.lon);
                    }}
                    className="
                      shrink-0 flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full 
                      bg-blue-50 text-blue-600 border border-blue-100
                      hover:bg-blue-600 hover:text-white hover:border-blue-600
                      text-[10px] font-bold transition-all uppercase tracking-wide
                    "
                  >
                    <Navigation size={12} fill="currentColor" className="opacity-80" /> 
                    Go
                  </button>
                </div>

                {/* Address Footer */}
                <div className="flex items-start gap-2 pl-9">
                  {address ? (
                    <>
                      <MapPin size={12} className="mt-0.5 shrink-0 text-slate-400" />
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                        {address}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-slate-400 italic pl-5">Location details unavailable</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}