export interface FarmMarker {
  id: string;
  lat: number;
  lng: number;
  name: string;
  address: string;
  timestamp: string;
  notes?: string;
  isCurrentLocation?: boolean;
  district?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface FarmPolygon {
  id: string;
  name: string;
  path: { lat: number; lng: number }[];
  areaSqM: number;
  perimeterM: number;
  acres: number;
  hectares: number;
  color: string;
  cropType?: string;
  soilMoisture?: number;
}

export interface MapViewState {
  center: { lat: number; lng: number };
  zoom: number;
  mapTypeId: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
}
