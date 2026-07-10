import { useState, useCallback } from 'react';
import { MapViewState, FarmMarker, FarmPolygon } from '../types';

export function useGoogleMaps(initialCenter = { lat: 10.9372, lng: 76.9560 }, initialZoom = 14) {
  const [viewState, setViewState] = useState<MapViewState>({
    center: initialCenter,
    zoom: initialZoom,
    mapTypeId: 'roadmap', // Map types can correspond to Leaflet layers (Street, Satellite)
  });

  const [markers, setMarkers] = useState<FarmMarker[]>([]);
  const [polygons, setPolygons] = useState<FarmPolygon[]>([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [selectedPolygonId, setSelectedPolygonId] = useState<string | null>(null);

  const flyTo = useCallback((center: { lat: number; lng: number }, zoom?: number) => {
    setViewState(prev => ({
      ...prev,
      center,
      zoom: zoom !== undefined ? zoom : prev.zoom
    }));
  }, []);

  const changeMapType = useCallback((type: 'roadmap' | 'satellite' | 'hybrid' | 'terrain') => {
    setViewState(prev => ({
      ...prev,
      mapTypeId: type
    }));
  }, []);

  const addMarker = useCallback((marker: Omit<FarmMarker, 'id' | 'timestamp'>) => {
    const newMarker: FarmMarker = {
      ...marker,
      id: `marker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toLocaleString(),
    };
    setMarkers(prev => [...prev, newMarker]);
    setSelectedMarkerId(newMarker.id);
    return newMarker;
  }, []);

  const updateMarker = useCallback((id: string, updates: Partial<FarmMarker>) => {
    setMarkers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  }, []);

  const deleteMarker = useCallback((id: string) => {
    setMarkers(prev => prev.filter(m => m.id !== id));
    if (selectedMarkerId === id) {
      setSelectedMarkerId(null);
    }
  }, [selectedMarkerId]);

  const addPolygon = useCallback((polygon: Omit<FarmPolygon, 'id'>) => {
    const newPolygon: FarmPolygon = {
      ...polygon,
      id: `poly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setPolygons(prev => [...prev, newPolygon]);
    setSelectedPolygonId(newPolygon.id);
    return newPolygon;
  }, []);

  const deletePolygon = useCallback((id: string) => {
    setPolygons(prev => prev.filter(p => p.id !== id));
    if (selectedPolygonId === id) {
      setSelectedPolygonId(null);
    }
  }, [selectedPolygonId]);

  return {
    viewState,
    setViewState,
    markers,
    setMarkers,
    polygons,
    setPolygons,
    selectedMarkerId,
    setSelectedMarkerId,
    selectedPolygonId,
    setSelectedPolygonId,
    flyTo,
    changeMapType,
    addMarker,
    updateMarker,
    deleteMarker,
    addPolygon,
    deletePolygon,
  };
}
