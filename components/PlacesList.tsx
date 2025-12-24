"use client";

import { useEffect, useRef } from "react";
import { Place } from "@/types/place";
import {
  Loader2,
  MapPin,
  Navigation,
  SearchX,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

/* ---------- TYPES ---------- */

type SheetState = "collapsed" | "mid" | "expanded";

type Props = {
  places: Place[];
  loading: boolean;
  selectedId: number | null;

  sheetState: SheetState;
  onSheetStateChange: (s: SheetState) => void;

  onSelect: (p: Place) => void;
};

/* ---------- HELPERS ---------- */

function formatAddress(tags?: Record<string, string | undefined>) {
  if (!tags) return null;

  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:suburb"],
    tags["addr:city"],
  ].filter((v): v is string => typeof v === "string" && v.length > 0);

  return parts.length ? parts.join(", ") : null;
}

function openDirections(lat: number, lon: number) {
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`,
    "_blank"
  );
}

/* ---------- COMPONENT ---------- */

export default function PlacesList({
  places,
  loading,
  selectedId,
  sheetState,
  onSheetStateChange,
  onSelect,
}: Props) {
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    if (selectedId && window.innerWidth < 768) {
      onSheetStateChange("expanded");
    }
  }, [selectedId, onSheetStateChange]);

  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartY.current === null) return;

    const delta = e.changedTouches[0].clientY - touchStartY.current;

    touchStartY.current = null;

    if (delta < -50) {
      onSheetStateChange(
        sheetState === "collapsed" ? "mid" : "expanded"
      );
    }

    if (delta > 50) {
      onSheetStateChange(
        sheetState === "expanded" ? "mid" : "collapsed"
      );
    }
  }

  // Smooth height transitions
  const heightClass =
    sheetState === "collapsed"
      ? "h-[120px]" // Compact mode
      : sheetState === "mid"
      ? "h-[50vh]"
      : "h-[92vh]"; // Almost full screen

  const snapHint =
    sheetState === "collapsed" ? (
      <>
        <ChevronUp size={14} /> Swipe up
      </>
    ) : sheetState === "expanded" ? (
      <>
        <ChevronDown size={14} /> Swipe down
      </>
    ) : (
      <>
        <ChevronUp size={14} />
        <ChevronDown size={14} /> Adjust View
      </>
    );

  return (
    <>
      {/* DESKTOP SIDEBAR (Unchanged logic, cleaner styling) */}
      <div className="hidden md:block h-full overflow-y-auto bg-white border-t md:border-t-0">
        <div className="p-4 sticky top-0 bg-white/95 backdrop-blur z-10 border-b">
            <h2 className="text-sm font-bold text-neutral-800 uppercase tracking-wider">
                Found {places.length} places
            </h2>
        </div>
        <div className="p-4">
            <ListContent
            places={places}
            loading={loading}
            selectedId={selectedId}
            onSelect={onSelect}
            />
        </div>
      </div>

      {/* MOBILE BOTTOM SHEET */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        {/* Actual Sheet Content */}
        <div
          className={`pointer-events-auto bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] border-t border-neutral-100 transition-all duration-300 ease-out flex flex-col ${heightClass}`}
        >
          {/* DRAG HANDLE AREA 
              - touch-none: Prevents browser pull-to-refresh here
              - cursor-grab: Indicates interactivity
          */}
          <div
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            className="flex-none flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none bg-white rounded-t-3xl border-b border-transparent hover:bg-neutral-50 transition-colors"
          >
            {/* The Pill */}
            <div className="w-12 h-1.5 rounded-full bg-neutral-300 mb-2" />
            
            {/* Helper Text */}
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-medium text-neutral-400 select-none">
              {snapHint}
            </div>
          </div>

          {/* SCROLLABLE LIST AREA
              - overscroll-contain: Prevents scroll chaining to parent (stops reload bug inside list)
          */}
          <div className="flex-1 overflow-y-auto px-4 pb-8 overscroll-contain bg-neutral-50/50">
            <ListContent
              places={places}
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

/* ---------- LIST CONTENT ---------- */

function ListContent({
  places,
  loading,
  selectedId,
  onSelect,
}: {
  places: Place[];
  loading: boolean;
  selectedId: number | null;
  onSelect: (p: Place) => void;
}) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-3 text-neutral-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-xs font-medium">Scanning area...</p>
      </div>
    );
  }

  if (!places.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
        <div className="bg-neutral-100 p-4 rounded-full mb-3">
            <SearchX className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-neutral-600">No places found</p>
        <p className="text-xs">Try searching for a different city</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-2">
      {places.map((p, i) => {
        const selected = p.id === selectedId;
        const address = formatAddress(p.tags);

        return (
          <div
            key={p.id}
            onClick={() => onSelect(p)}
            className={`
                group relative pl-4 pr-4 py-4 rounded-xl border transition-all duration-200 cursor-pointer
                ${
                    selected
                    ? "border-blue-500/30 bg-blue-50/50 shadow-sm"
                    : "border-white bg-white shadow-sm hover:shadow-md hover:border-neutral-200"
                }
            `}
          >
            {/* Selection Indicator Line */}
            {selected && (
                <div className="absolute left-0 top-3 bottom-3 w-1 bg-blue-500 rounded-r-full" />
            )}

            <div className="flex justify-between items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-neutral-100 text-[10px] font-bold text-neutral-500">
                        {i + 1}
                    </span>
                    <h3 className={`text-sm font-semibold ${selected ? 'text-blue-900' : 'text-neutral-800'}`}>
                    {p.tags?.name ?? "Unnamed Facility"}
                    </h3>
                </div>
                
                {address && (
                  <div className="flex items-start gap-1.5 text-neutral-500 ml-1">
                    <MapPin size={12} className="mt-0.5 shrink-0 opacity-70" />
                    <p className="text-[11px] leading-relaxed line-clamp-2">
                      {address}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openDirections(p.lat, p.lon);
                }}
                className="shrink-0 p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95 transition-all"
                aria-label="Get directions"
              >
                <Navigation size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}