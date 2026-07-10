import { useState, useCallback, useMemo } from 'react';

// Highly accurate planar projection approximation for farm-scale GIS metrics
function getPlanarAreaAndLength(path: { lat: number; lng: number }[]) {
  if (path.length < 3) return { area: 0, perimeter: 0 };
  
  // Calculate average latitude to scale longitude degrees to meters
  let sumLat = 0;
  for (const p of path) {
    sumLat += p.lat;
  }
  const avgLat = (sumLat / path.length) * Math.PI / 180;
  
  // Approximate distance factors (meters per degree)
  const latToMeters = 111132;
  const lngToMeters = 111132 * Math.cos(avgLat);
  
  // Project to flat Cartesian coordinates in meters relative to first point
  const ref = path[0];
  const coords = path.map(p => ({
    x: (p.lng - ref.lng) * lngToMeters,
    y: (p.lat - ref.lat) * latToMeters
  }));
  
  // Shoelace formula for planar area & Euclidean perimeter
  let area = 0;
  let perimeter = 0;
  const numPoints = coords.length;
  
  for (let i = 0; i < numPoints; i++) {
    const p1 = coords[i];
    const p2 = coords[(i + 1) % numPoints];
    
    area += p1.x * p2.y - p2.x * p1.y;
    
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }
  
  return {
    area: Math.abs(area) / 2,
    perimeter
  };
}

export function usePolygon() {
  const [path, setPath] = useState<{ lat: number; lng: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Compute metrics
  const metrics = useMemo(() => {
    if (path.length < 3) {
      return {
        areaSqM: 0,
        perimeterM: 0,
        acres: 0,
        hectares: 0,
      };
    }

    try {
      const { area, perimeter } = getPlanarAreaAndLength(path);
      const acres = area * 0.000247105;
      const hectares = area * 0.0001;

      return {
        areaSqM: Math.round(area * 100) / 100,
        perimeterM: Math.round(perimeter * 100) / 100,
        acres: Math.round(acres * 100) / 100,
        hectares: Math.round(hectares * 100) / 100,
      };
    } catch (e) {
      console.error("Error computing polygon metrics", e);
      return {
        areaSqM: 0,
        perimeterM: 0,
        acres: 0,
        hectares: 0,
      };
    }
  }, [path]);

  const addVertex = useCallback((latLng: { lat: number; lng: number }) => {
    setPath((current) => [...current, latLng]);
  }, []);

  const updateVertex = useCallback((index: number, latLng: { lat: number; lng: number }) => {
    setPath((current) => {
      const copy = [...current];
      copy[index] = latLng;
      return copy;
    });
  }, []);

  const removeVertex = useCallback((index: number) => {
    setPath((current) => current.filter((_, i) => i !== index));
  }, []);

  const clearPolygon = useCallback(() => {
    setPath([]);
    setIsDrawing(false);
    setIsEditing(false);
  }, []);

  const startDrawing = useCallback(() => {
    setPath([]);
    setIsDrawing(true);
    setIsEditing(false);
  }, []);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  return {
    path,
    setPath,
    isDrawing,
    setIsDrawing,
    isEditing,
    setIsEditing,
    metrics,
    addVertex,
    updateVertex,
    removeVertex,
    clearPolygon,
    startDrawing,
    stopDrawing,
  };
}
