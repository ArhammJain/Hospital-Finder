"use client";

import { MapPin, Loader2, ArrowRight } from "lucide-react";
import { KeyboardEvent } from "react";

type Props = {
  value?: string; // Made optional to prevent TS errors if missing
  onChange: (value: string) => void;
  onSearch: () => void;
  loading?: boolean;
};

export default function SearchBar({ 
  value = "", // 👈 FIXED: Default to empty string if undefined
  onChange, 
  onSearch, 
  loading = false 
}: Props) {
  
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSearch();
      (e.target as HTMLInputElement).blur();
    }
  };

  // Safe check ensures value is never null/undefined
  const safeValue = value || "";

  return (
    <div className="relative w-full group">
      <div className="
        relative flex items-center w-full 
        bg-slate-100 hover:bg-slate-50 focus-within:bg-white
        border border-slate-200 focus-within:border-blue-500 
        focus-within:ring-4 focus-within:ring-blue-500/10
        rounded-xl transition-all duration-200 ease-out
      ">
        <div className="pl-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none">
          <MapPin size={20} />
        </div>

        <input
          type="text"
          value={safeValue}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="City (e.g., Bhusawal)..."
          disabled={loading}
          enterKeyHint="search"
          inputMode="search"
          className="
            w-full h-12 pl-3 pr-12 
            bg-transparent border-none outline-none 
            text-slate-800 placeholder:text-slate-400 
            text-base font-medium truncate
          "
        />

        <div className="absolute right-1.5 top-1.5 bottom-1.5">
          <button
            onClick={onSearch}
            // 👈 FIXED: using safeValue here prevents the crash
            disabled={loading || !safeValue.trim()} 
            className={`
              h-9 w-9 flex items-center justify-center rounded-lg transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
              ${safeValue.trim() 
                ? "bg-blue-600 text-white shadow-md hover:bg-blue-700 active:scale-95" 
                : "bg-transparent text-slate-300 cursor-not-allowed"}
            `}
            aria-label="Search"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <ArrowRight size={18} strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}