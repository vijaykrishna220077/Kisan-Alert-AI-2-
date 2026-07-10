import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, X } from 'lucide-react';
import { usePlacesAutocomplete } from '../hooks/usePlacesAutocomplete';

interface SearchBarProps {
  onPlaceSelect: (placeDetails: {
    lat: number;
    lng: number;
    name: string;
    address: string;
    district: string;
    state: string;
    country: string;
    postalCode: string;
    viewport?: google.maps.LatLngBounds;
  }) => void;
}

export function SearchBar({ onPlaceSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    predictions,
    loading,
    error,
    fetchPredictions,
    getDetails,
    setPredictions
  } = usePlacesAutocomplete();

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPredictions(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, fetchPredictions]);

  useEffect(() => {
    // Hide dropdown if clicked outside
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPrediction = async (placeId: string) => {
    try {
      setShowDropdown(false);
      const details = await getDetails(placeId);
      if (details && details.lat !== undefined && details.lng !== undefined) {
        setQuery(details.name || details.address);
        onPlaceSelect(details);
      }
    } catch (err) {
      console.error("Error getting details for selected place:", err);
    }
  };

  const handleClear = () => {
    setQuery('');
    setPredictions([]);
    setShowDropdown(false);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md z-20">
      <div className="relative flex items-center bg-white/95 dark:bg-[#1A2E1A]/95 backdrop-blur-md rounded-2xl border border-emerald-100 dark:border-emerald-900/30 shadow-lg px-4 py-3 gap-2 transition-all focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20">
        <Search className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <input
          id="maps-search-input"
          type="text"
          placeholder="Search village, city, district, landmark..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          className="bg-transparent w-full border-none outline-none text-sm font-medium text-emerald-950 dark:text-emerald-50 placeholder-emerald-800/40 dark:placeholder-emerald-300/30"
        />
        {loading && <Loader2 className="w-4 h-4 animate-spin text-emerald-500 shrink-0" />}
        {query && (
          <button
            onClick={handleClear}
            className="p-1 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showDropdown && (predictions.length > 0 || error) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 dark:bg-[#1A2E1A]/95 backdrop-blur-md rounded-2xl border border-emerald-100 dark:border-emerald-900/30 shadow-xl overflow-hidden divide-y divide-emerald-50 dark:divide-emerald-900/10 max-h-72 overflow-y-auto">
          {error && (
            <div className="px-4 py-3 text-xs text-red-500">
              Failed to get search suggestions. Please check connection.
            </div>
          )}
          {predictions.map((p) => (
            <button
              key={p.place_id}
              onClick={() => handleSelectPrediction(p.place_id)}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-emerald-50/60 dark:hover:bg-emerald-900/20 text-left transition-colors cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-50 truncate">
                  {p.structured_formatting.main_text}
                </p>
                <p className="text-xs text-emerald-800/60 dark:text-emerald-300/50 truncate">
                  {p.structured_formatting.secondary_text}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
