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

function formatAddress(
  tags?: Record<string, string | undefined>
) {
  if (!tags) return null;

  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:suburb"],
    tags["addr:city"],
  ].filter(
    (v): v is string => typeof v === "string" && v.length > 0
  );

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

    const delta =
      e.changedTouches[0].clientY - touchStartY.current;

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

  const heightClass =
    sheetState === "collapsed"
      ? "h-[22vh]"
      : sheetState === "mid"
      ? "h-[55vh]"
      : "h-[85vh]";

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
        <ChevronDown size={14} /> Swipe
      </>
    );

  return (
    <>
      {/* DESKTOP */}
      <div className="hidden md:block h-full overflow-y-auto bg-slate-50 p-4">
        <ListContent
          places={places}
          loading={loading}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      </div>

      {/* MOBILE BOTTOM SHEET */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <div
          className={`bg-white rounded-t-2xl shadow-xl transition-all duration-300 ${heightClass}`}
        >
          <div
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            className="flex flex-col items-center py-3"
          >
            <div className="w-10 h-1.5 rounded-full bg-slate-300 mb-1" />
            <div className="flex items-center gap-1 text-xs text-slate-500">
              {snapHint}
            </div>
          </div>

          <div className="h-full overflow-y-auto px-4 pb-6">
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
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!places.length) {
    return (
      <div className="flex flex-col items-center py-10 text-slate-500">
        <SearchX className="w-6 h-6 mb-2" />
        <p className="text-xs">No hospitals found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {places.map((p, i) => {
        const selected = p.id === selectedId;
        const address = formatAddress(p.tags);

        return (
          <div
            key={p.id}
            onClick={() => onSelect(p)}
            className={`rounded-xl border p-3 cursor-pointer transition ${
              selected
                ? "border-blue-500 bg-blue-50"
                : "border-slate-200 bg-white hover:shadow"
            }`}
          >
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-semibold">
                {i + 1}. {p.tags?.name ?? "Medical Facility"}
              </h3>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openDirections(p.lat, p.lon);
                }}
                className="text-xs text-blue-600 flex items-center gap-1"
              >
                <Navigation size={14} /> Directions
              </button>
            </div>

            {address && (
              <div className="flex gap-1 mt-1 text-slate-500">
                <MapPin size={12} className="mt-0.5" />
                <p className="text-[11px] leading-snug line-clamp-2">
                  {address}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
