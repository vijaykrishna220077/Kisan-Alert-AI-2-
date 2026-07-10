import React, { useState, useEffect } from 'react';
import './leaflet-setup';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polygon, Polyline, CircleMarker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import { 
  MapPin, 
  Compass, 
  Info, 
  Navigation, 
  Layers, 
  Trash2, 
  Plus, 
  Check, 
  X,
  Sparkles,
  RefreshCw,
  FolderOpen,
  CloudSun,
  Maximize2,
  Crosshair
} from 'lucide-react';

// Fix Leaflet's default icon path issues with Vite bundling
// @ts-ignore
import icon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface FarmPolygon {
  id: string;
  name: string;
  path: { lat: number; lng: number }[];
  areaSqM: number;
  perimeterM: number;
  acres: number;
  hectares: number;
  color: string;
  cropType: string;
  soilMoisture: number;
  shapeType?: string;
}

// Spherical/Geodesic Polygon Area Calculation (Shoelace on Sphere)
function calculatePolygonArea(coords: { lat: number; lng: number }[]): number {
  if (coords.length < 3) return 0;
  
  // Try to use Leaflet Draw's L.GeometryUtil.geodesicArea if available for perfect native consistency
  if (typeof L !== 'undefined' && (L as any).GeometryUtil && (L as any).GeometryUtil.geodesicArea) {
    try {
      const latLngs = coords.map(c => L.latLng(c.lat, c.lng));
      return (L as any).GeometryUtil.geodesicArea(latLngs);
    } catch (e) {
      console.warn("Failed to use L.GeometryUtil.geodesicArea, falling back to math formula:", e);
    }
  }

  let area = 0;
  const radius = 6378137; // Earth's radius in meters
  const rad = Math.PI / 180;
  
  for (let i = 0; i < coords.length; i++) {
    const p1 = coords[i];
    const p2 = coords[(i + 1) % coords.length];
    
    area += (p2.lng - p1.lng) * rad * (2 + Math.sin(p1.lat * rad) + Math.sin(p2.lat * rad));
  }
  
  return Math.abs(area * radius * radius / 2.0);
}

// Polygon Perimeter Calculation using native L.LatLng.distanceTo with Haversine fallback
function calculatePolygonPerimeter(coords: { lat: number; lng: number }[], isClosed: boolean = true): number {
  if (coords.length < 2) return 0;

  // Use Leaflet's built-in L.LatLng.distanceTo if L is available
  if (typeof L !== 'undefined') {
    try {
      let perimeter = 0;
      const limit = isClosed ? coords.length : coords.length - 1;
      for (let i = 0; i < limit; i++) {
        const p1 = L.latLng(coords[i].lat, coords[i].lng);
        const p2 = L.latLng(coords[(i + 1) % coords.length].lat, coords[(i + 1) % coords.length].lng);
        perimeter += p1.distanceTo(p2);
      }
      return perimeter;
    } catch (e) {
      console.warn("Failed to use L.LatLng.distanceTo, falling back to Haversine:", e);
    }
  }

  let perimeter = 0;
  const limit = isClosed ? coords.length : coords.length - 1;
  for (let i = 0; i < limit; i++) {
    const p1 = coords[i];
    const p2 = coords[(i + 1) % coords.length];
    
    // Haversine / Distance formula between two lat/lng points
    const R = 6378137; // Earth radius in meters
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    perimeter += R * c;
  }
  return perimeter;
}

// Format distance beautifully into km or m depending on length
function formatDistance(meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000;
    return `${km.toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}

// Component to dynamically pan and zoom the map
function ChangeMapView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// Helper to handle map clicks for manual point plotting
interface MapClickHandlerProps {
  onMapClick: (lat: number, lng: number) => void;
  enabled: boolean;
}

function MapClickHandler({ onMapClick, enabled }: MapClickHandlerProps) {
  useMapEvents({
    click(e) {
      if (enabled) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Helper to track real-time cursor coordinates and drawing state changes
interface MapEventsTrackerProps {
  onDrawingStateChange: (active: boolean) => void;
  onMouseMove: (lat: number, lng: number, x: number, y: number) => void;
  onMouseOut: () => void;
}

function MapEventsTracker({
  onDrawingStateChange,
  onMouseMove,
  onMouseOut,
}: MapEventsTrackerProps) {
  const map = useMap();

  useEffect(() => {
    const handleDrawStart = () => {
      onDrawingStateChange(true);
    };
    const handleDrawStop = () => {
      onDrawingStateChange(false);
    };
    const handleDrawCreated = () => {
      onDrawingStateChange(false);
    };

    map.on('draw:drawstart', handleDrawStart);
    map.on('draw:drawstop', handleDrawStop);
    map.on('draw:created', handleDrawCreated);

    return () => {
      map.off('draw:drawstart', handleDrawStart);
      map.off('draw:drawstop', handleDrawStop);
      map.off('draw:created', handleDrawCreated);
    };
  }, [map, onDrawingStateChange]);

  useMapEvents({
    mousemove(e) {
      onMouseMove(e.latlng.lat, e.latlng.lng, e.containerPoint.x, e.containerPoint.y);
    },
    mouseout() {
      onMouseOut();
    },
  });

  return null;
}

// Leaflet Draw event handler and control mounter
interface DrawControlProps {
  onPolygonCreated: (coords: { lat: number; lng: number }[], areaSqM: number, perimeterM: number, shapeType?: string) => void;
  onLiveCoordsChange: (coords: { lat: number; lng: number }[]) => void;
  onLiveDrawingActive: (active: boolean) => void;
}

function DrawControl({ 
  onPolygonCreated, 
  onLiveCoordsChange, 
  onLiveDrawingActive 
}: DrawControlProps) {
  const map = useMap();

  useEffect(() => {
    const globalL = (window as any).L || L;
    if (!globalL.Control || !(globalL.Control as any).Draw) {
      console.error("Leaflet Draw control is not defined on L");
      return;
    }

    // Add a feature group to map as required by Leaflet Draw
    const drawnItems = new globalL.FeatureGroup();
    map.addLayer(drawnItems);

    const drawControl = new (globalL.Control as any).Draw({
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          showLength: true,
          metric: true,
          feet: false,
          nautic: false,
          shapeOptions: {
            color: '#10B981', // Emerald boundary
            fillColor: '#10B981',
            fillOpacity: 0.3,
            weight: 3,
          }
        },
        rectangle: false,
        polyline: {
          showLength: true,
          metric: true,
          feet: false,
          nautic: false,
          shapeOptions: {
            color: '#F59E0B', // Amber polyline
            weight: 4,
          }
        },
        circle: false,
        circlemarker: false,
        marker: false,
      },
      edit: {
        featureGroup: drawnItems,
        remove: false,
        edit: false
      }
    });

    map.addControl(drawControl);

    const handleCreated = (e: any) => {
      const layer = e.layer;
      const layerType = e.layerType; // 'polygon', 'rectangle', 'polyline'
      const latlngs = layer.getLatLngs();
      
      let coords: { lat: number; lng: number }[] = [];
      if (Array.isArray(latlngs[0])) {
        coords = (latlngs[0] as any).map((pt: any) => ({ lat: pt.lat, lng: pt.lng }));
      } else {
        coords = (latlngs as any).map((pt: any) => ({ lat: pt.lat, lng: pt.lng }));
      }

      // Calculate area and perimeter (polylines do not enclose any area)
      const isPolyline = layerType === 'polyline';
      const areaSqM = isPolyline ? 0 : calculatePolygonArea(coords);
      const perimeterM = calculatePolygonPerimeter(coords, !isPolyline);

      // Remove the temporary layer from drawing immediately, React will render the final saved polygon
      layer.remove();

      onPolygonCreated(coords, areaSqM, perimeterM, layerType);
    };

    const handleDrawVertex = (ev: any) => {
      try {
        if (ev && ev.layers) {
          const layers = ev.layers.getLayers();
          const coords = layers.map((layer: any) => {
            const latlng = layer.getLatLng();
            return { lat: latlng.lat, lng: latlng.lng };
          });
          onLiveCoordsChange(coords);
        }
      } catch (err) {
        console.warn("Failed to extract live draw vertices:", err);
      }
    };

    const handleDrawStart = () => {
      onLiveDrawingActive(true);
      onLiveCoordsChange([]);
    };

    const handleDrawStop = () => {
      onLiveDrawingActive(false);
      onLiveCoordsChange([]);
    };

    map.on((globalL as any).Draw.Event.CREATED, handleCreated);
    map.on('draw:drawvertex', handleDrawVertex);
    map.on('draw:drawstart', handleDrawStart);
    map.on('draw:drawstop', handleDrawStop);

    return () => {
      map.off((globalL as any).Draw.Event.CREATED, handleCreated);
      map.off('draw:drawvertex', handleDrawVertex);
      map.off('draw:drawstart', handleDrawStart);
      map.off('draw:drawstop', handleDrawStop);
      map.removeControl(drawControl);
      map.removeLayer(drawnItems);
    };
  }, [map, onPolygonCreated, onLiveCoordsChange, onLiveDrawingActive]);

  return null;
}

export function LeafletMapView({ activeFarmerId = 'USR-701' }: { activeFarmerId?: string }) {
  const defaultCenter: [number, number] = [16.3067, 80.4365]; // Set center to Guntur for alignment
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  const [mapZoom, setMapZoom] = useState<number>(14);
  const [selectedOverlay, setSelectedOverlay] = useState<'osm' | 'terrain' | 'satellite'>('osm');

  // Prepopulated high-fidelity interactive farm blocks
  const [polygons, setPolygons] = useState<FarmPolygon[]>([]);

  // DB Sync integration: fetch farm boundaries for the current active farmer
  const fetchFarms = async () => {
    try {
      const res = await fetch(`/api/farms?farmerId=${activeFarmerId}`);
      const data = await res.json();
      if (data.success && data.farms) {
        const mapped = data.farms.map((f: any) => ({
          id: f.id,
          name: f.name,
          path: f.coords,
          areaSqM: f.areaSqM,
          perimeterM: f.perimeterM || 0,
          acres: f.acres,
          hectares: f.hectares,
          color: f.color || '#10B981',
          cropType: f.cropType || 'Crop',
          soilMoisture: f.soilMoisture || 60,
          shapeType: 'polygon'
        }));
        setPolygons(mapped);
        
        // Pan to first polygon centroid if exists
        if (mapped.length > 0 && mapped[0].path && mapped[0].path.length > 0) {
          const avgLat = mapped[0].path.reduce((sum: number, p: any) => sum + p.lat, 0) / mapped[0].path.length;
          const avgLng = mapped[0].path.reduce((sum: number, p: any) => sum + p.lng, 0) / mapped[0].path.length;
          setMapCenter([avgLat, avgLng]);
        }
      }
    } catch (err) {
      console.error("Failed to load saved polygons:", err);
    }
  };

  useEffect(() => {
    fetchFarms();
  }, [activeFarmerId]);

  // Overlay tile configurations
  const tileLayers = {
    osm: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    terrain: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors'
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri World Imagery'
    }
  };

  // State to handle the current newly drawn polygon details awaiting name/save
  const [pendingPolygon, setPendingPolygon] = useState<{
    path: { lat: number; lng: number }[];
    areaSqM: number;
    perimeterM: number;
    acres: number;
    hectares: number;
  } | null>(null);

  // Form states for saving the newly drawn polygon
  const [newName, setNewName] = useState<string>('');
  const [newCropType, setNewCropType] = useState<string>('Cotton');
  const [newSoilMoisture, setNewSoilMoisture] = useState<number>(60);
  const [selectedColor, setSelectedColor] = useState<string>('#10B981');

  // Manual point-by-point plotting states
  const [isManualPlotting, setIsManualPlotting] = useState<boolean>(true);
  const [customPath, setCustomPath] = useState<{ lat: number; lng: number }[]>([]);

  // Real-time cursor coordinates, drawing active state, and container ref
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number; x: number; y: number } | null>(null);
  const [isDrawingActive, setIsDrawingActive] = useState<boolean>(false);
  const [liveDrawCoords, setLiveDrawCoords] = useState<{ lat: number; lng: number }[]>([]);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Real-time live area planimeter metrics (for floating badge)
  const livePlanimeterMetrics = React.useMemo(() => {
    const path = isManualPlotting ? customPath : liveDrawCoords;
    if (!path || path.length === 0) return null;

    // To make it super active, let's include the cursor coord as a potential next vertex
    const completePath = [...path];
    if (cursorCoords) {
      completePath.push({ lat: cursorCoords.lat, lng: cursorCoords.lng });
    }

    const isClosed = completePath.length >= 3;
    const areaSqM = isClosed ? calculatePolygonArea(completePath) : 0;
    const perimeterM = calculatePolygonPerimeter(completePath, isClosed);
    
    return {
      pointsCount: path.length,
      areaSqM,
      perimeterM,
      acres: Number((areaSqM * 0.000247105).toFixed(3)),
      hectares: Number((areaSqM * 0.0001).toFixed(3))
    };
  }, [isManualPlotting, customPath, liveDrawCoords, cursorCoords]);

  const handleDrawingStateChange = React.useCallback((active: boolean) => {
    setIsDrawingActive(active);
    if (!active) {
      setLiveDrawCoords([]);
    }
  }, []);

  const handleMouseMove = React.useCallback((lat: number, lng: number, x: number, y: number) => {
    setCursorCoords({ lat, lng, x, y });
  }, []);

  const handleMouseOut = React.useCallback(() => {
    setCursorCoords(null);
  }, []);

  // Real-time metrics calculations for manual custom path
  const customMetrics = React.useMemo(() => {
    if (customPath.length < 2) {
      return { areaSqM: 0, perimeterM: 0, acres: 0, hectares: 0 };
    }
    const isClosed = customPath.length >= 3;
    const area = isClosed ? calculatePolygonArea(customPath) : 0;
    const perimeter = calculatePolygonPerimeter(customPath, isClosed);
    return {
      areaSqM: area,
      perimeterM: perimeter,
      acres: Number((area * 0.000247105).toFixed(2)),
      hectares: Number((area * 0.0001).toFixed(2))
    };
  }, [customPath]);

  const handleMapClickForPlotting = (lat: number, lng: number) => {
    setCustomPath(prev => [...prev, { lat, lng }]);
  };

  const handleUndoLastPoint = () => {
    setCustomPath(prev => prev.slice(0, -1));
  };

  const handleClearCustomPath = () => {
    setCustomPath([]);
  };

  const handleSaveCustomPath = () => {
    if (customPath.length < 3) return;
    
    setPendingPolygon({
      path: customPath,
      areaSqM: customMetrics.areaSqM,
      perimeterM: customMetrics.perimeterM,
      acres: customMetrics.acres,
      hectares: customMetrics.hectares
    });

    // Preset nice default inputs for the custom plotted shape
    setNewName(`My Custom Plotted Block ${polygons.length + 1}`);
    setNewCropType('Maize');
    setNewSoilMoisture(Math.floor(Math.random() * 30) + 50);
    setSelectedColor('#8B5CF6'); // custom purple color by default

    // Clear plotting state as it's transferred to pending save
    setIsManualPlotting(false);
    setCustomPath([]);
  };

  const handlePolygonCreated = (
    coords: { lat: number; lng: number }[],
    areaSqM: number,
    perimeterM: number,
    shapeType: string = 'polygon'
  ) => {
    const acres = Number((areaSqM * 0.000247105).toFixed(2));
    const hectares = Number((areaSqM * 0.0001).toFixed(2));
    
    setPendingPolygon({
      path: coords,
      areaSqM,
      perimeterM,
      acres,
      hectares,
      shapeType
    });

    // Reset form inputs with defaults
    setNewName(shapeType === 'polyline' ? `My New Route / Path ${polygons.length + 1}` : `My New Field Block ${polygons.length + 1}`);
    setNewCropType(shapeType === 'polyline' ? 'Access Path / Fence' : 'Maize');
    setNewSoilMoisture(shapeType === 'polyline' ? 0 : Math.floor(Math.random() * 30) + 50); // random moisture 50-80%
    setSelectedColor(shapeType === 'polyline' ? '#F59E0B' : ['#10B981', '#3B82F6', '#EF4444', '#8B5CF6'][Math.floor(Math.random() * 4)]);
  };

  const handleSavePolygon = async () => {
    if (!pendingPolygon) return;

    const savedPayload = {
      farmerId: activeFarmerId,
      name: newName.trim() || `Field Block ${polygons.length + 1}`,
      coords: pendingPolygon.path,
      areaSqM: pendingPolygon.areaSqM,
      acres: pendingPolygon.acres,
      hectares: pendingPolygon.hectares,
      cropType: newCropType,
      sowingDate: new Date().toISOString().split("T")[0],
      status: "Growth",
      color: selectedColor,
      soilMoisture: newSoilMoisture
    };

    try {
      const res = await fetch("/api/farms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(savedPayload)
      });
      const data = await res.json();
      if (data.success) {
        fetchFarms();
        setPendingPolygon(null);
      }
    } catch (err) {
      console.error("Error saving polygon to DB, performing fallback:", err);
      const saved: FarmPolygon = {
        id: `poly-${Date.now()}`,
        name: savedPayload.name,
        path: savedPayload.coords,
        areaSqM: savedPayload.areaSqM,
        perimeterM: pendingPolygon.perimeterM || 0,
        acres: savedPayload.acres,
        hectares: savedPayload.hectares,
        color: selectedColor,
        cropType: newCropType,
        soilMoisture: newSoilMoisture,
        shapeType: pendingPolygon.shapeType || 'polygon'
      };
      setPolygons(prev => [...prev, saved]);
      setPendingPolygon(null);
    }
  };

  const handleDeletePolygon = async (id: string) => {
    try {
      const res = await fetch(`/api/farms/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchFarms();
      } else {
        setPolygons(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error("Error deleting polygon:", err);
      setPolygons(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleFocusPolygon = (poly: FarmPolygon) => {
    if (poly.path.length > 0) {
      const avgLat = poly.path.reduce((sum, p) => sum + p.lat, 0) / poly.path.length;
      const avgLng = poly.path.reduce((sum, p) => sum + p.lng, 0) / poly.path.length;
      setMapCenter([avgLat, avgLng]);
      setMapZoom(15);
    }
  };

  const handleResetView = () => {
    setMapCenter(defaultCenter);
    setMapZoom(14);
  };

  const containerWidth = containerRef.current?.clientWidth || 800;
  const containerHeight = containerRef.current?.clientHeight || 600;
  
  const isLabelRight = cursorCoords ? cursorCoords.x > containerWidth - 240 : false;
  const isLabelBottom = cursorCoords ? cursorCoords.y > containerHeight - 140 : false;
  
  const labelLeft = cursorCoords ? (isLabelRight ? cursorCoords.x - 240 : cursorCoords.x + 15) : 0;
  const labelTop = cursorCoords ? (isLabelBottom ? cursorCoords.y - 140 : cursorCoords.y + 15) : 0;

  let labelSegmentDistance: number | null = null;
  if (isManualPlotting && customPath.length > 0 && cursorCoords) {
    const lastPt = customPath[customPath.length - 1];
    labelSegmentDistance = L.latLng(lastPt.lat, lastPt.lng).distanceTo(L.latLng(cursorCoords.lat, cursorCoords.lng));
  }

  const formattedSegmentDistance = labelSegmentDistance !== null ? formatDistance(labelSegmentDistance) : null;

  return (
    <div className="flex flex-col gap-6 w-full bg-[#FAFBF9] dark:bg-slate-900 border border-emerald-500/10 rounded-3xl p-4 md:p-6 shadow-xl transition-all">
      
      {/* Custom injected styles to beautify leaflet draw icons */}
      <style>{`
        /* Make the toolbar container have rounded corners, nice borders, elegant shadow, and backdrop-blur */
        .leaflet-bar {
          box-shadow: 0 4px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
          border: 1px solid rgba(16, 185, 129, 0.15) !important;
          border-radius: 12px !important;
          overflow: hidden !important;
          background: rgba(255, 255, 255, 0.85) !important;
          backdrop-filter: blur(8px) !important;
          -webkit-backdrop-filter: blur(8px) !important;
        }
        
        .dark .leaflet-bar {
          background: rgba(30, 41, 59, 0.85) !important;
          border-color: rgba(16, 185, 129, 0.25) !important;
        }

        .leaflet-draw-toolbar {
          margin-top: 0 !important;
          border-radius: 12px !important;
          overflow: hidden !important;
        }

        .leaflet-draw-toolbar a {
          background-image: none !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 18px !important;
          color: #059669 !important; /* Emerald-600 */
          background-color: transparent !important;
          border-bottom: 1px solid rgba(226, 232, 240, 0.8) !important;
          transition: all 0.2s ease-in-out;
          width: 34px !important;
          height: 34px !important;
        }
        
        .dark .leaflet-draw-toolbar a {
          color: #34d399 !important; /* Emerald-400 */
          border-bottom: 1px solid rgba(51, 65, 85, 0.8) !important;
        }

        .leaflet-draw-toolbar a:last-child {
          border-bottom: none !important;
        }

        .leaflet-draw-toolbar a:hover {
          background-color: rgba(240, 253, 244, 0.9) !important;
          color: #047857 !important;
        }
        
        .dark .leaflet-draw-toolbar a:hover {
          background-color: rgba(6, 78, 59, 0.5) !important;
          color: #34d399 !important;
        }

        .leaflet-draw-draw-polygon::before {
          content: "⬡" !important;
          font-weight: 900;
          font-size: 19px;
        }
        .leaflet-draw-draw-rectangle::before {
          content: "▭" !important;
          font-weight: 900;
          font-size: 16px;
        }
        .leaflet-draw-draw-polyline::before {
          content: "∿" !important;
          font-weight: 900;
          font-size: 19px;
        }
        .leaflet-draw-actions {
          background-color: rgba(30, 41, 59, 0.9) !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1) !important;
          backdrop-filter: blur(6px) !important;
          -webkit-backdrop-filter: blur(6px) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          overflow: hidden !important;
        }
        .leaflet-draw-actions a {
          color: #ffffff !important;
          background-color: transparent !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          padding: 6px 12px !important;
          transition: all 0.15s ease;
        }
        .leaflet-draw-actions a:hover {
          background-color: rgba(255, 255, 255, 0.15) !important;
          color: #34d399 !important;
        }
      `}</style>

      {/* Header with Title and Control Toggles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-500/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-700 dark:text-emerald-400">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </span>
            <div>
              <h3 className="text-base font-black text-[#1A2E1A] dark:text-emerald-400">
                Kisan GIS & Field Boundary Mapping
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Precision agriculture mapping tools with real-time field acreage calculation.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button Toggles */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Layer Selector */}
          <div className="flex bg-white dark:bg-slate-800 border border-emerald-500/15 rounded-xl p-0.5 text-xs font-semibold shadow-sm">
            <button
              onClick={() => setSelectedOverlay('osm')}
              className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                selectedOverlay === 'osm'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              Streets
            </button>
            <button
              onClick={() => setSelectedOverlay('terrain')}
              className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                selectedOverlay === 'terrain'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              Terrain
            </button>
            <button
              onClick={() => setSelectedOverlay('satellite')}
              className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                selectedOverlay === 'satellite'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              Satellite
            </button>
          </div>

          <button
            onClick={handleResetView}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-emerald-500/15 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-400 cursor-pointer shadow-sm transition-all"
          >
            <Navigation className="w-3.5 h-3.5 rotate-45" /> Focus Farm
          </button>
        </div>
      </div>

      {/* Main Two-Column Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Side: Field Registry & Controls */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          
          {/* Mapping Mode Selection Card */}
          <div className="bg-white dark:bg-slate-800 border border-emerald-500/10 p-4 rounded-2xl shadow-sm">
            <h4 className="text-xs font-black text-gray-800 dark:text-emerald-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-600" /> Boundary Mapping Mode
            </h4>
            
            <div className="flex flex-col gap-2">
              <button
                disabled
                className="w-full py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between bg-purple-50 border-purple-500 text-purple-900 dark:bg-purple-950/20 dark:text-purple-400"
              >
                <span>Manual Point Plotting</span>
                <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded font-black">Active</span>
              </button>
            </div>
          </div>

          {/* Manual Plotting Controller Panel */}
          {isManualPlotting && (
            <div className="bg-purple-50/50 dark:bg-purple-950/10 border border-purple-500/20 p-4 rounded-2xl shadow-sm flex flex-col gap-3 animate-fade-in">
              <div>
                <h4 className="text-xs font-black text-purple-800 dark:text-purple-400 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-purple-600 animate-pulse" /> Manual Point Plotter
                </h4>
                <p className="text-[10.5px] text-purple-900/80 dark:text-purple-400/80 mt-1 leading-relaxed">
                  Click directly anywhere on the map to add coordinates. You can pin <strong>unlimited points</strong> freely!
                </p>
              </div>

              {/* Status and Count */}
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-purple-500/10 text-xs font-bold">
                <span className="text-gray-500">Pinned Vertices:</span>
                <span className="text-purple-700 dark:text-purple-400 text-sm font-extrabold">{customPath.length} points</span>
              </div>

              {/* Dynamic metrics if >= 2 points */}
              {customPath.length >= 3 ? (
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-purple-500/10 text-[11px] text-gray-600 dark:text-gray-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Est. Area:</span>
                    <strong className="text-gray-900 dark:text-gray-200">{customMetrics.acres} Acres</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Perimeter:</span>
                    <strong className="text-gray-900 dark:text-gray-200">{formatDistance(customMetrics.perimeterM)}</strong>
                  </div>
                </div>
              ) : customPath.length === 2 ? (
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-purple-500/10 text-[11px] text-gray-600 dark:text-gray-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Segment Length:</span>
                    <strong className="text-purple-700 dark:text-purple-400">{formatDistance(customMetrics.perimeterM)}</strong>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2 text-[10px] text-purple-600/70 font-semibold italic">
                  Plot at least 2 points for distance, 3 points for acreage.
                </div>
              )}

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleUndoLastPoint}
                  disabled={customPath.length === 0}
                  className="py-2 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-purple-500/15 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer transition-all flex items-center justify-center gap-1"
                >
                  <RefreshCw className="w-3 h-3 rotate-180" /> Undo Point
                </button>
                <button
                  onClick={handleClearCustomPath}
                  disabled={customPath.length === 0}
                  className="py-2 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/10 border border-purple-500/15 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-bold text-red-600 dark:text-red-400 cursor-pointer transition-all flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Reset Plot
                </button>
              </div>

              <button
                onClick={handleSaveCustomPath}
                disabled={customPath.length < 3}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed text-white font-extrabold rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-md"
              >
                <Check className="w-4 h-4" /> Finish & Save Boundary
              </button>
            </div>
          )}

          {/* Instructions Block */}
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/10 p-4 rounded-2xl">
            <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" /> Boundary Tools instructions
            </h4>
            <p className="text-[11px] text-emerald-900/80 dark:text-emerald-400/80 mt-1.5 leading-relaxed">
              {isManualPlotting ? (
                <span>Simply click directly on any coordinate on the map to pin a vertex. You can drop as many points as you like to outline the crop area perfectly!</span>
              ) : (
                <span>Use the map toolbar on the left side of the map container to select Draw Field Area (⬡) to map and show enclosed crop acreage, or select Draw Route (∿) for pathways.</span>
              )}
            </p>
          </div>

          {/* New Drawn Polygon Save Form */}
          {pendingPolygon && (
            <div className="bg-white dark:bg-slate-800 border-2 border-emerald-500 rounded-2xl p-4 shadow-lg animate-fade-in">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-2 mb-3">
                <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                  <Plus className="w-4 h-4" /> {pendingPolygon.shapeType === 'polyline' ? 'Save Route / Path' : 'Save Field Area'}
                </h4>
                <button 
                  onClick={() => setPendingPolygon(null)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1">
                    {pendingPolygon.shapeType === 'polyline' ? 'Route / Path Name' : 'Field / Plot Name'}
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={pendingPolygon.shapeType === 'polyline' ? "Enter route name..." : "Enter block name..."}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1">
                      {pendingPolygon.shapeType === 'polyline' ? 'Path Type' : 'Crop Type'}
                    </label>
                    {pendingPolygon.shapeType === 'polyline' ? (
                      <select
                        value={newCropType}
                        onChange={(e) => setNewCropType(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-2 py-2 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="Irrigation Channel">Irrigation Channel</option>
                        <option value="Tractor Road">Tractor Road</option>
                        <option value="Fencing Boundary">Fencing Boundary</option>
                        <option value="Power Line Grid">Power Line Grid</option>
                        <option value="Access Pathway">Access Pathway</option>
                      </select>
                    ) : (
                      <select
                        value={newCropType}
                        onChange={(e) => setNewCropType(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-2 py-2 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="Cotton">Cotton</option>
                        <option value="Paddy (Rice)">Paddy (Rice)</option>
                        <option value="Maize">Maize</option>
                        <option value="Sugarcane">Sugarcane</option>
                        <option value="Wheat">Wheat</option>
                        <option value="Vegetables">Vegetables</option>
                        <option value="Coconut Grove">Coconut Grove</option>
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1">
                      {pendingPolygon.shapeType === 'polyline' ? 'Est. Width (m)' : 'Soil Moisture (%)'}
                    </label>
                    <input
                      type="number"
                      min={pendingPolygon.shapeType === 'polyline' ? "1" : "10"}
                      max="100"
                      value={newSoilMoisture}
                      onChange={(e) => setNewSoilMoisture(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-2 py-2 text-gray-800 dark:text-gray-100 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Color Selection */}
                <div>
                  <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Display Color Accent
                  </label>
                  <div className="flex gap-2.5">
                    {['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'].map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        style={{ backgroundColor: color }}
                        className={`w-6 h-6 rounded-full cursor-pointer transition-all border-2 ${
                          selectedColor === color ? 'border-black dark:border-white scale-110 shadow-sm' : 'border-transparent opacity-70'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Metrics Readout */}
                <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-gray-100 dark:border-slate-700 mt-1">
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600 dark:text-gray-400">
                    {pendingPolygon.shapeType === 'polyline' ? (
                      <>
                        <div className="col-span-2">
                          <span className="font-semibold block">Total Route Length:</span>
                          <strong className="text-amber-600 dark:text-amber-400 text-sm">{formatDistance(pendingPolygon.perimeterM)}</strong>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="font-semibold block">Calculated Area:</span>
                          <strong className="text-gray-950 dark:text-gray-100">{pendingPolygon.acres} Acres</strong>
                        </div>
                        <div>
                          <span className="font-semibold block">Perimeter:</span>
                          <strong className="text-gray-950 dark:text-gray-100">{formatDistance(pendingPolygon.perimeterM)}</strong>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleSavePolygon}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-md"
                >
                  <Check className="w-4 h-4" /> Save {pendingPolygon.shapeType === 'polyline' ? 'Route / Path' : 'Field Area Block'}
                </button>
              </div>
            </div>
          )}

          {/* Active Fields List */}
          <div className="bg-white dark:bg-slate-800/80 border border-emerald-500/10 rounded-2xl p-4 shadow-sm flex flex-col flex-1">
            <h4 className="text-xs font-black text-gray-800 dark:text-emerald-400 border-b border-gray-100 dark:border-slate-700 pb-2 mb-3 flex items-center gap-1.5">
              <FolderOpen className="w-4 h-4 text-emerald-600" /> Active Field Registry ({polygons.length})
            </h4>

            {polygons.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-400 dark:text-gray-500 select-none">
                No active boundaries drawn yet. Try using the drawing toolbar on the map!
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1">
                {polygons.map((poly) => (
                  <div 
                    key={poly.id}
                    className="group bg-slate-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 hover:border-emerald-500/30 p-3 rounded-xl transition-all"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div 
                        onClick={() => handleFocusPolygon(poly)}
                        className="cursor-pointer flex-1 min-w-0"
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: poly.color }} />
                          <h5 className="font-black text-xs text-gray-800 dark:text-gray-200 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {poly.name}
                          </h5>
                        </div>
                        
                        <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                          {poly.shapeType === 'polyline' ? (
                            <>
                              <div>Route: <span className="font-semibold text-gray-700 dark:text-gray-300">{poly.cropType}</span></div>
                              <div>Length: <span className="font-semibold text-gray-700 dark:text-gray-300">{formatDistance(poly.perimeterM)}</span></div>
                              <div>Width: <span className="font-semibold text-amber-600 dark:text-amber-400">{poly.soilMoisture}m</span></div>
                              <div className="text-amber-600 font-extrabold uppercase tracking-wide text-[9px]">Path Route</div>
                            </>
                          ) : (
                            <>
                              <div>Crop: <span className="font-semibold text-gray-700 dark:text-gray-300">{poly.cropType}</span></div>
                              <div>Acreage: <span className="font-semibold text-gray-700 dark:text-gray-300">{poly.acres} ac</span></div>
                              <div>Perimeter: <span className="font-semibold text-gray-700 dark:text-gray-300">{formatDistance(poly.perimeterM)}</span></div>
                              <div>Moisture: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{poly.soilMoisture}%</span></div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleFocusPolygon(poly)}
                          title="Center Map"
                          className="p-1 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-100 dark:border-slate-700 rounded-lg text-gray-500 hover:text-emerald-600 cursor-pointer transition-colors"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePolygon(poly.id)}
                          title="Delete Area"
                          className="p-1 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/20 border border-gray-100 dark:border-slate-700 rounded-lg text-gray-400 hover:text-red-600 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Large OpenStreetMap Canvas */}
        <div className="lg:col-span-3">
          <div ref={containerRef} className="relative w-full h-[550px] md:h-[650px] rounded-3xl overflow-hidden border border-emerald-500/10 shadow-inner bg-slate-100 dark:bg-slate-950 z-10">
            {/* OpenStreetMap via Leaflet */}
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%' }}
              className="z-10"
            >
              <ChangeMapView center={mapCenter} zoom={mapZoom} />

              {/* Event tracker for real-time cursor coordinates and drawing state */}
              <MapEventsTracker
                onDrawingStateChange={handleDrawingStateChange}
                onMouseMove={handleMouseMove}
                onMouseOut={handleMouseOut}
              />
              
              <TileLayer
                attribution={tileLayers[selectedOverlay].attribution}
                url={tileLayers[selectedOverlay].url}
              />

              {/* Native Leaflet Draw Controls */}
              {!isManualPlotting && (
                <DrawControl 
                  onPolygonCreated={handlePolygonCreated} 
                  onLiveCoordsChange={setLiveDrawCoords}
                  onLiveDrawingActive={setIsDrawingActive}
                />
              )}
              
              {/* Manual Direct-Click Map Plotting Handler */}
              <MapClickHandler onMapClick={handleMapClickForPlotting} enabled={isManualPlotting} />

              {/* Real-time Interactive Manual Plotted Path Visuals */}
              {customPath.length > 0 && (
                <>
                  {/* Connect clicked points with animated/dashed polyline */}
                  <Polyline
                    positions={customPath.map(p => [p.lat, p.lng])}
                    pathOptions={{
                      color: '#8B5CF6',
                      weight: 3,
                      dashArray: '5, 10'
                    }}
                  />
                  
                  {/* Connect closed boundary preview if we have at least 3 points */}
                  {customPath.length >= 3 && (
                    <Polygon
                      positions={customPath.map(p => [p.lat, p.lng])}
                      pathOptions={{
                        color: '#8B5CF6',
                        fillColor: '#8B5CF6',
                        fillOpacity: 0.15,
                        weight: 1,
                        dashArray: '3, 3'
                      }}
                    />
                  )}

                  {/* Render high-contrast interactive circles for each point */}
                  {customPath.map((pt, index) => (
                    <CircleMarker
                      key={`custom-vertex-${index}`}
                      center={[pt.lat, pt.lng]}
                      radius={6}
                      pathOptions={{
                        color: '#7C3AED',
                        fillColor: '#FFFFFF',
                        fillOpacity: 1,
                        weight: 2.5
                      }}
                    >
                      <Popup>
                        <div className="p-1.5 min-w-[120px] text-center select-none font-sans">
                          <p className="font-extrabold text-xs text-purple-900">Vertex #{index + 1}</p>
                          <p className="text-[10px] text-gray-500 font-mono mt-1 mb-2">
                            Lat: {pt.lat.toFixed(5)}<br />
                            Lng: {pt.lng.toFixed(5)}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCustomPath(prev => prev.filter((_, i) => i !== index));
                            }}
                            className="w-full py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 rounded text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            Delete Point
                          </button>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </>
              )}
              
              {/* Active Farm Location Marker */}
              <Marker position={defaultCenter}>
                <Popup>
                  <div className="p-2 min-w-[200px] text-slate-800 select-none">
                    <div className="flex items-center gap-1.5 border-b border-emerald-500/10 pb-1.5 mb-1.5">
                      <MapPin className="w-4 h-4 text-red-500" />
                      <span className="font-extrabold text-xs text-emerald-900">Sugunapuram Cotton Farm</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed mb-2">
                      Primary automated GIS sensor plot and crop canopy observatory.
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 text-[9px] font-bold bg-emerald-50 p-1.5 rounded border border-emerald-500/5">
                      <div className="text-emerald-800">
                        <div>Soil Moisture:</div>
                        <div className="text-xs text-[#2D5A27]">68.5%</div>
                      </div>
                      <div className="text-emerald-800">
                        <div>Crop Age:</div>
                        <div className="text-xs text-[#2D5A27]">65 days</div>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>

              {/* Render Saved Fields/Paths as Interactive Polygons or Polylines */}
              {polygons.map((poly) => {
                const positions = poly.path.map(p => [p.lat, p.lng] as [number, number]);
                if (poly.shapeType === 'polyline') {
                  return (
                    <Polyline
                      key={poly.id}
                      positions={positions}
                      pathOptions={{
                        color: poly.color,
                        weight: 4,
                        dashArray: '5, 5'
                      }}
                    >
                      <Popup>
                        <div className="p-2 min-w-[180px] text-slate-800 select-none">
                          <div className="flex items-center gap-1 pb-1 mb-1 border-b border-gray-100">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: poly.color }} />
                            <span className="font-black text-xs text-gray-900">{poly.name}</span>
                          </div>
                          <div className="space-y-1.5 text-[10px] text-gray-600">
                            <div><strong>Route Type:</strong> {poly.cropType}</div>
                            <div><strong>Est. Length:</strong> {formatDistance(poly.perimeterM)}</div>
                            <div><strong>Width:</strong> {poly.soilMoisture} meters</div>
                          </div>
                        </div>
                      </Popup>
                    </Polyline>
                  );
                }

                return (
                  <Polygon
                    key={poly.id}
                    positions={positions}
                    pathOptions={{
                      color: poly.color,
                      fillColor: poly.color,
                      fillOpacity: 0.25,
                      weight: 3,
                      dashArray: '2, 5'
                    }}
                  >
                    <Popup>
                      <div className="p-2 min-w-[180px] text-slate-800 select-none">
                        <div className="flex items-center gap-1 pb-1 mb-1 border-b border-gray-100">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: poly.color }} />
                          <span className="font-black text-xs text-gray-900">{poly.name}</span>
                        </div>
                        <div className="space-y-1.5 text-[10px] text-gray-600">
                          <div><strong>Crop:</strong> {poly.cropType}</div>
                          <div><strong>Size:</strong> {poly.acres} Acres ({poly.hectares} ha)</div>
                          <div><strong>Perimeter:</strong> {formatDistance(poly.perimeterM)}</div>
                          <div className="flex items-center gap-1 font-bold text-emerald-700">
                            <CloudSun className="w-3.5 h-3.5" />
                            <span>Telemetry: {poly.soilMoisture}% Moisture</span>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Polygon>
                );
              })}
            </MapContainer>

            {/* Real-time Area Planimeter Badge */}
            {(isManualPlotting || isDrawingActive) && livePlanimeterMetrics && livePlanimeterMetrics.pointsCount > 0 && (
              <div className="absolute top-4 right-4 z-[450] bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md px-4 py-3 rounded-2xl border border-emerald-500/30 text-white shadow-2xl flex flex-col gap-2 min-w-[200px] animate-fade-in">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="font-extrabold text-[10px] uppercase tracking-wider text-emerald-400">Live GIS Planimeter</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded-md font-bold">
                    {livePlanimeterMetrics.pointsCount} {livePlanimeterMetrics.pointsCount === 1 ? 'vertex' : 'vertices'}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Estimated Area</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-emerald-400 font-sans tracking-tight">
                      {livePlanimeterMetrics.acres.toFixed(3)}
                    </span>
                    <span className="text-xs font-bold text-emerald-300">acres</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-2 text-[10px] font-mono text-gray-300">
                  <div>
                    <span className="text-[9px] text-gray-400 block font-sans">PERIMETER</span>
                    <strong className="text-white">{formatDistance(livePlanimeterMetrics.perimeterM)}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 block font-sans">METRIC AREA</span>
                    <strong className="text-white">{Math.round(livePlanimeterMetrics.areaSqM).toLocaleString()} m²</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Real-time Coordinate & Precision Placement Label */}
            {(isManualPlotting || isDrawingActive) && cursorCoords && (
              <div 
                className="absolute pointer-events-none bg-slate-950/90 dark:bg-slate-900/95 backdrop-blur-md text-white px-3 py-2.5 rounded-2xl shadow-2xl border border-emerald-500/30 text-xs z-[5000] flex flex-col gap-1.5 transition-all duration-75 select-none min-w-[210px]"
                style={{ 
                  left: `${labelLeft}px`, 
                  top: `${labelTop}px`,
                }}
              >
                {/* Header */}
                <div className="flex items-center gap-1.5 border-b border-white/10 pb-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
                  <span className="font-extrabold text-[10px] uppercase tracking-wider text-emerald-400">
                    {isManualPlotting ? 'Manual Point Plotter' : 'Precision Draw Active'}
                  </span>
                </div>

                {/* Coordinate text */}
                <div className="font-mono text-[10px] space-y-1 text-gray-200">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-400">LAT:</span>
                    <strong className="text-white font-semibold">{cursorCoords.lat.toFixed(6)}° N</strong>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-400">LNG:</span>
                    <strong className="text-white font-semibold">{cursorCoords.lng.toFixed(6)}° E</strong>
                  </div>
                </div>

                {/* Plotting Context / Guides */}
                {isManualPlotting && (
                  <div className="border-t border-white/10 pt-1.5 mt-0.5 space-y-1 text-[10px]">
                    <div className="flex justify-between text-gray-300">
                      <span>Placed Vertices:</span>
                      <strong className="text-purple-400 font-extrabold">{customPath.length}</strong>
                    </div>
                    {formattedSegmentDistance && (
                      <div className="flex justify-between text-gray-300">
                        <span>Segment Length:</span>
                        <strong className="text-amber-400 font-extrabold">{formattedSegmentDistance}</strong>
                      </div>
                    )}
                    <div className="text-[9px] text-emerald-300/90 font-medium italic mt-1 text-center bg-emerald-950/40 py-1 rounded-lg border border-emerald-500/10">
                      {customPath.length === 0 ? 'Click map to place 1st point' : 
                       customPath.length === 1 ? 'Click map to place 2nd point' : 
                       'Click to place vertex / double-click to finish'}
                    </div>
                  </div>
                )}

                {!isManualPlotting && isDrawingActive && (
                  <div className="border-t border-white/10 pt-1.5 mt-0.5 text-[9px] text-emerald-300/90 font-medium italic text-center bg-emerald-950/40 py-1 rounded-lg border border-emerald-500/10">
                    Click map to add vertex and draw boundary
                  </div>
                )}
              </div>
            )}

            {/* Floating Coordinates Tag */}
            <div className="absolute bottom-4 left-4 z-[400] bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white font-mono text-[10px] pointer-events-none flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span>Lat: {mapCenter[0].toFixed(4)} | Lng: {mapCenter[1].toFixed(4)}</span>
            </div>

            {/* Info Tag */}
            <div className="absolute bottom-4 right-4 z-[400] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-500/10 text-gray-700 dark:text-gray-300 text-[10px] flex items-center gap-1.5 max-w-[240px] md:max-w-xs shadow-md">
              <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Click on the map directly to place vertices and plot your farm boundary. Double-click or click on the first point to finish!</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
