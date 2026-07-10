import React from 'react';
import { FarmMarker } from '../types';

interface LocationMarkerProps {
  marker: FarmMarker;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
  onDrag: (id: string, latLng: { lat: number; lng: number }) => void;
}

export function LocationMarker({ marker, isSelected, onSelect }: LocationMarkerProps) {
  return (
    <div 
      className={`p-2 rounded-xl text-xs font-semibold ${isSelected ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-800'}`}
      onClick={() => onSelect(marker.id)}
    >
      {marker.name}
    </div>
  );
}
