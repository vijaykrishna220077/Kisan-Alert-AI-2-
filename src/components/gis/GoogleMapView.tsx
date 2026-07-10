import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sprout, 
  MapPin, 
  Compass, 
  Layers, 
  Pencil, 
  Ruler, 
  Settings, 
  AlertCircle,
  HelpCircle,
  X,
  Sparkles,
  Info,
  CloudRain,
  Wind,
  Thermometer,
  Droplets,
  Zap,
  Activity,
  ShieldAlert,
  Wrench,
  Video,
  CheckCircle,
  Clock,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Sun,
  Tv,
  Brain,
  TrendingUp,
  ChevronRight,
  Maximize,
  Search,
  Gauge
} from 'lucide-react';
import L from 'leaflet';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import { FarmMarker, FarmPolygon, MapViewState } from './types';
import { useCurrentLocation } from './hooks/useCurrentLocation';
import { usePolygon } from './hooks/usePolygon';
import { useGoogleMaps } from './hooks/useGoogleMaps';
import { SearchBar } from './components/SearchBar';
import { MapTypeSwitcher } from './components/MapTypeSwitcher';
import { CurrentLocationButton } from './components/CurrentLocationButton';
import { PolygonDrawer } from './components/PolygonDrawer';

// Custom modern SVG marker icons for Leaflet
const createCustomIcon = (color: string, isSelected: boolean) => {
  const size = isSelected ? 24 : 18;
  const innerSize = isSelected ? 12 : 8;
  return L.divIcon({
    html: `
      <div style="display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
        <div style="
          background-color: ${color};
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          border: 2.5px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.35);
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="background-color: white; width: ${innerSize}px; height: ${innerSize}px; border-radius: 50%;"></div>
        </div>
      </div>
    `,
    className: 'custom-leaflet-marker-wrapper',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

const createGPSIcon = () => {
  return L.divIcon({
    html: `
      <div style="display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;">
          <span style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background-color: #3b82f6; opacity: 0.55; animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
          <span style="position: relative; width: 14px; height: 14px; border-radius: 50%; background-color: #2563eb; border: 2.5px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.3);"></span>
        </div>
      </div>
    `,
    className: 'custom-gps-marker-wrapper',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

// Interface declarations for Weather Timeline and Farm Telemetry
interface WeatherTimelineStep {
  label: string;
  subLabel: string;
  tempOffset: number;
  cloudsDensity: number;
  rainIntensity: 'none' | 'light' | 'moderate' | 'heavy' | 'thunderstorm';
  windSpeed: number; // km/h
  windDirection: number; // degrees
  humidity: number;
  pressure: number;
  soilMoistureChange: number;
  advisory: string;
  recommendations: { title: string; desc: string; category: string }[];
}

const WEATHER_TIMELINE: WeatherTimelineStep[] = [
  {
    label: "Current",
    subLabel: "Live Weather",
    tempOffset: 0,
    cloudsDensity: 0.35,
    rainIntensity: "none",
    windSpeed: 14,
    windDirection: 240,
    humidity: 48,
    pressure: 1012,
    soilMoistureChange: 0,
    advisory: "Optimal solar exposure. Stable atmosphere dominated by a warm high-pressure cell. Excellent window for organic weeding, drone mapping, and nitrogen application.",
    recommendations: [
      { category: "Spraying", title: "Apply Neem Oil", desc: "Wind speeds (14 km/h) are stable. Ideal for pest-preventative foliar spraying." },
      { category: "Solar Power", title: "Max Grid Return", desc: "Full clear skies. Solar pump grids are operating at 98% maximum load efficiency." }
    ]
  },
  {
    label: "+1 Hour",
    subLabel: "Clouds Rising",
    tempOffset: -1.2,
    cloudsDensity: 0.65,
    rainIntensity: "light",
    windSpeed: 18,
    windDirection: 250,
    humidity: 62,
    pressure: 1010,
    soilMoistureChange: 2,
    advisory: "Moisture-laden sea breeze moving in from the eastern coastal ridge. Micro-cumulus cloud deck formatting rapidly over active crops. Light localized showers.",
    recommendations: [
      { category: "Harvesting", title: "Shelter Cotton Bales", desc: "Pre-precipitation humidity rising. Cover open piles to prevent fiber damping." },
      { category: "Irrigation", title: "Reduce Water Flow", desc: "Cloud cover cooling active root zones. Throttle drip pumps by 25%." }
    ]
  },
  {
    label: "+3 Hours",
    subLabel: "Convective Storm",
    tempOffset: -4.5,
    cloudsDensity: 0.95,
    rainIntensity: "thunderstorm",
    windSpeed: 38,
    windDirection: 280,
    humidity: 92,
    pressure: 1004,
    soilMoistureChange: 18,
    advisory: "WARNING: High-energy convective thunderstorm cell approaching from Northeast. High lightning risk and sudden gusts up to 45 km/h. Stop manual field activity.",
    recommendations: [
      { category: "Emergency", title: "STOP Drip Systems", desc: "Heavy precipitation in 20 mins. Cut automated pumps to prevent fertilizer leaching." },
      { category: "Drainage", title: "Open Slurry Gates", desc: "Anticipate 18mm localized accumulation. Keep channels clear." }
    ]
  },
  {
    label: "+6 Hours",
    subLabel: "Post-Rain Saturation",
    tempOffset: -3.0,
    cloudsDensity: 0.80,
    rainIntensity: "moderate",
    windSpeed: 12,
    windDirection: 190,
    humidity: 96,
    pressure: 1007,
    soilMoistureChange: 28,
    advisory: "Convective system moving west. Atmosphere remains highly saturated. Soil moisture spiked to near field-capacity. Risk of immediate root stress in lowlands.",
    recommendations: [
      { category: "Disease", title: "Fungal Blast Risk", desc: "Extended leaf wetness period. Scan chilli plots tomorrow for early powdery mildew." },
      { category: "Irrigation", title: "Pause Watering 48h", desc: "Soil completely saturated. Allow natural percolation to recharge groundwater." }
    ]
  },
  {
    label: "+12 Hours",
    subLabel: "Cool Night Fog",
    tempOffset: -6.0,
    cloudsDensity: 0.50,
    rainIntensity: "none",
    windSpeed: 6,
    windDirection: 170,
    humidity: 85,
    pressure: 1011,
    soilMoistureChange: 24,
    advisory: "Stable atmospheric inversion setting in. High relative humidity and near-zero winds will foster thick morning radiation fog. Favorable root water uptake.",
    recommendations: [
      { category: "Monitoring", title: "Thermal Drone Scan", desc: "Low wind conditions are ideal for pre-dawn thermal crop stress diagnostics." }
    ]
  },
  {
    label: "Tomorrow",
    subLabel: "Sunny Recovery",
    tempOffset: 1.5,
    cloudsDensity: 0.20,
    rainIntensity: "none",
    windSpeed: 10,
    windDirection: 220,
    humidity: 50,
    pressure: 1013,
    soilMoistureChange: 15,
    advisory: "Clean maritime air mass settling. Warm sunshine will restore optimal crop evapotranspiration rates. Excellent solar radiation return of 8.2 kWh/m².",
    recommendations: [
      { category: "Fertilizer", title: "Apply Micro-nutrients", desc: "Perfect post-rain soil moisture. Root systems are highly active and receptive." }
    ]
  },
  {
    label: "3 Days",
    subLabel: "Dry Air Intake",
    tempOffset: 3.5,
    cloudsDensity: 0.10,
    rainIntensity: "none",
    windSpeed: 22,
    windDirection: 290,
    humidity: 34,
    pressure: 1015,
    soilMoistureChange: -10,
    advisory: "Arid high-pressure inland wind corridor active. High vapor pressure deficit (VPD) accelerating moisture loss. Rapid soil dry-out detected on non-mulched blocks.",
    recommendations: [
      { category: "Irrigation", title: "Trigger Drip Cycle 4", desc: "Soil moisture dropped 10%. Micro-schedule 35L/plot watering for early-stage cotton." }
    ]
  },
  {
    label: "7 Days",
    subLabel: "Harvest Window",
    tempOffset: 2.0,
    cloudsDensity: 0.15,
    rainIntensity: "none",
    windSpeed: 15,
    windDirection: 230,
    humidity: 44,
    pressure: 1014,
    soilMoistureChange: -20,
    advisory: "Sustained high solar insolance with dry atmospheric stability. Perfect agricultural harvesting window opens. Crop biomass NDVI index shows 0.82 maturity peak.",
    recommendations: [
      { category: "Harvesting", title: "Full Paddy Cut", desc: "0% rain forecast for the next 5 days. Dry soil makes machinery operations smooth." }
    ]
  }
];

// Interface for AI camera and security events
interface AICameraFeed {
  id: string;
  name: string;
  status: "Active" | "Alerting";
  url: string;
  detectedObjects: { label: string; confidence: number; bbox: number[] }[];
  lastUpdate: string;
  locationName: string;
  imageUrl: string;
}

export function GoogleMapView() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.FeatureGroup | null>(null);
  const polygonsLayerRef = useRef<L.FeatureGroup | null>(null);
  const activePathLayerRef = useRef<L.FeatureGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // References for drawing animations on canvas overlay
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Core Map and Geometry States (from original hook / mock context)
  const {
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
  } = useGoogleMaps({ lat: 10.9372, lng: 76.9560 }, 15);

  const {
    location: gpsLocation,
    error: gpsError,
    loading: gpsLoading,
    requestLocation,
    setError: setGpsError,
  } = useCurrentLocation();

  const {
    path: activePath,
    setPath: setActivePath,
    isDrawing,
    setIsDrawing,
    isEditing,
    setIsEditing,
    metrics,
    addVertex,
    updateVertex,
    clearPolygon,
    startDrawing,
    stopDrawing,
  } = usePolygon();

  // Ref to hold dynamic states for Leaflet event handlers to avoid stale closures
  const drawingStateRef = useRef({
    isDrawing,
    addVertex,
    setSelectedMarkerId,
    setSelectedPolygonId
  });

  useEffect(() => {
    drawingStateRef.current = {
      isDrawing,
      addVertex,
      setSelectedMarkerId,
      setSelectedPolygonId
    };
  }, [isDrawing, addVertex, setSelectedMarkerId, setSelectedPolygonId]);

  // Kisan Alert AI specific expanded states
  const [activeTimelineStep, setActiveTimelineStep] = useState<number>(0);
  const [isPlayingTimeline, setIsPlayingTimeline] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Active Map Layer Toggles
  const [layers, setLayers] = useState({
    clouds: true,
    rainRadar: true,
    wind: true,
    temperature: false,
    humidity: false,
    pressure: false,
    lightning: true,
    flood: false,
    drought: false
  });

  // Active Satellite Mode (Overlay filter logic)
  const [satelliteFilter, setSatelliteFilter] = useState<'standard' | 'ndvi' | 'infrared' | 'falseColor'>('standard');

  // Cloud Animation Configs (Interactivity requested)
  const [cloudSpeed, setCloudSpeed] = useState<number>(4); // 1-10
  const [cloudDensity, setCloudDensity] = useState<number>(0.6); // 0.1-1.0
  const [cloudOpacity, setCloudOpacity] = useState<number>(0.65); // 0.1-1.0
  const [cloudShadows, setCloudShadows] = useState<boolean>(true);

  // AI Security Camera Modal & Simulation States
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [cameras, setCameras] = useState<AICameraFeed[]>([
    {
      id: "CAM-01",
      name: "Gate #1 Security",
      status: "Active",
      url: "rtsp://gate1.kisan.ai",
      detectedObjects: [
        { label: "Tractor", confidence: 97, bbox: [120, 150, 240, 320] },
        { label: "Worker", confidence: 91, bbox: [320, 180, 380, 290] }
      ],
      lastUpdate: "Just Now",
      locationName: "Sugunapuram Main Entrance",
      imageUrl: "https://images.unsplash.com/photo-1594913785162-e6785b49eed9?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: "CAM-02",
      name: "Cattle Barn North-East",
      status: "Alerting",
      url: "rtsp://cattle.kisan.ai",
      detectedObjects: [
        { label: "Cattle escape", confidence: 94, bbox: [80, 110, 220, 260] },
        { label: "Damaged Fence", confidence: 89, bbox: [210, 220, 320, 310] }
      ],
      lastUpdate: "3 mins ago",
      locationName: "Barn East Ridge",
      imageUrl: "https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: "CAM-03",
      name: "Water Pump Terminal B",
      status: "Active",
      url: "rtsp://pumps.kisan.ai",
      detectedObjects: [
        { label: "Drip pipe", confidence: 98, bbox: [100, 100, 400, 300] }
      ],
      lastUpdate: "Just Now",
      locationName: "Kuniyamuthur Pump house",
      imageUrl: "https://images.unsplash.com/photo-1484600801535-87d419f24527?auto=format&fit=crop&w=600&q=80"
    }
  ]);

  // AI Alerts state - fully interactive cards list
  const [aiAlerts, setAiAlerts] = useState([
    { id: "a-1", type: "weather", icon: "🌧", title: "Heavy Rain Expected", desc: "Severe convective cell arriving over your fields in approximately 30 minutes. Anticipated rate: 12mm/hr.", severity: "high", ack: false },
    { id: "a-2", type: "irrigation", icon: "💧", title: "Recommended: Cut Irrigation", desc: "To minimize nitrogen leaching and root damping, cut drip pumps immediately.", severity: "medium", ack: false },
    { id: "a-3", type: "security", icon: "🚨", title: "Unknown Person Spotted", desc: "Security Camera #1 detected unidentified individual near storage yard boundary.", severity: "high", ack: false },
    { id: "a-4", type: "hazard", icon: "⚠️", title: "Cattle Trespass Detected", desc: "Camera #2 reports breach on northern perimeter fence line with cow wandering toward paddy.", severity: "high", ack: false },
    { id: "a-5", type: "equipment", icon: "🚜", title: "Tractor Left Idling", desc: "Telemetry warns main tractor engine has been running idle for over 45 minutes.", severity: "low", ack: false }
  ]);

  const selectedMarker = markers.find(m => m.id === selectedMarkerId);
  const selectedPoly = polygons.find(p => p.id === selectedPolygonId);

  // Sound generator helper for futuristic radar alerts
  const playAlertSound = (freq = 800, dur = 0.12) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      osc.start();
      osc.stop(audioCtx.currentTime + dur);
    } catch (e) {}
  };

  // Prepopulate typical Kisan Alert India farms with deep sensor attributes on load
  useEffect(() => {
    setMarkers([
      {
        id: 'mock-marker-1',
        name: 'Raju Selvam - Sugunapuram Coconut Grove',
        lat: 10.9395,
        lng: 76.9535,
        address: 'Sugunapuram East, Kuniyamuthur, Coimbatore, Tamil Nadu, 641008',
        timestamp: new Date().toLocaleDateString(),
        notes: 'Drip lines active. Sowed coconut saplings under smart water telemetry guidance.'
      },
      {
        id: 'mock-marker-2',
        name: 'Karthik Kumar - Kuniyamuthur Paddy Plot',
        lat: 10.9332,
        lng: 76.9585,
        address: 'Palakkad Main Road, Kuniyamuthur, Coimbatore, Tamil Nadu, 641008',
        timestamp: new Date().toLocaleDateString(),
        notes: 'NDVI vegetation indices are peak. Rich organic loam texture.'
      }
    ]);

    setPolygons([
      {
        id: 'mock-poly-1',
        name: 'Sugunapuram Cotton Block',
        path: [
          { lat: 10.9360, lng: 76.9500 },
          { lat: 10.9410, lng: 76.9500 },
          { lat: 10.9410, lng: 76.9540 },
          { lat: 10.9360, lng: 76.9540 },
        ],
        areaSqM: 160000,
        perimeterM: 1600,
        acres: 39.54,
        hectares: 16.0,
        color: '#8B5CF6', // Purple cash crops
        cropType: 'Cotton (MCU-5 Hybrid)',
        soilMoisture: 58
      },
      {
        id: 'mock-poly-2',
        name: 'Kuniyamuthur Rice Block',
        path: [
          { lat: 10.9300, lng: 76.9550 },
          { lat: 10.9350, lng: 76.9550 },
          { lat: 10.9350, lng: 76.9600 },
          { lat: 10.9300, lng: 76.9600 },
        ],
        areaSqM: 250000,
        perimeterM: 2000,
        acres: 61.78,
        hectares: 25.0,
        color: '#10B981', // Emerald Paddy
        cropType: 'Paddy (Rice - CO 51)',
        soilMoisture: 72
      }
    ]);
  }, []);

  // Initialize and Sync Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Ensure any existing map instance on this container is fully removed before initializing
    if (leafletMapRef.current) {
      try {
        leafletMapRef.current.remove();
      } catch (err) {
        console.error("Error removing map instance:", err);
      }
      leafletMapRef.current = null;
    }
    if (mapContainerRef.current) {
      // @ts-ignore
      mapContainerRef.current._leaflet_id = null;
      mapContainerRef.current.innerHTML = '';
    }

    const initialCenter = viewState.center;
    const initialZoom = viewState.zoom;

    const mapInstance = L.map(mapContainerRef.current, {
      center: [initialCenter.lat, initialCenter.lng],
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false
    });

    leafletMapRef.current = mapInstance;

    // Standard high-definition hybrid/imagery layers vs street map
    const defaultTileUrl = isDarkMode 
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : (viewState.mapTypeId === 'satellite' || viewState.mapTypeId === 'hybrid'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{y}/{x}.png');

    const tileLayer = L.tileLayer(defaultTileUrl, {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://www.esri.com/">Esri</a>'
    }).addTo(mapInstance);

    tileLayerRef.current = tileLayer;

    markersLayerRef.current = L.featureGroup().addTo(mapInstance);
    polygonsLayerRef.current = L.featureGroup().addTo(mapInstance);
    activePathLayerRef.current = L.featureGroup().addTo(mapInstance);

    // Single click handler on map using refs to bypass stale closures
    mapInstance.on('click', (e: L.LeafletMouseEvent) => {
      const latLng = { lat: e.latlng.lat, lng: e.latlng.lng };
      const { isDrawing: currentDrawing, addVertex: currentAddVertex, setSelectedMarkerId: currentSetSelectedMarker, setSelectedPolygonId: currentSetSelectedPolygon } = drawingStateRef.current;
      if (currentDrawing) {
        currentAddVertex(latLng);
      } else {
        currentSetSelectedMarker(null);
        currentSetSelectedPolygon(null);
      }
    });

    // Invalidate map size on div container resize (prevent gray Leaflet screen issue)
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstance) {
        mapInstance.invalidateSize();
      }
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [isDarkMode]);

  // Synchronize Leaflet mapTypeId & dark mode settings
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || !tileLayerRef.current) return;
 
    let url = 'https://{s}.tile.openstreetmap.org/{z}/{y}/{x}.png';
 
    if (isDarkMode) {
      url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    } else if (viewState.mapTypeId === 'satellite' || viewState.mapTypeId === 'hybrid') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    }
 
    tileLayerRef.current.setUrl(url);
  }, [viewState.mapTypeId, isDarkMode]);

  // Synchronize Leaflet map position when viewState center/zoom changes externally
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;
    
    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();
    
    const latDiff = Math.abs(currentCenter.lat - viewState.center.lat);
    const lngDiff = Math.abs(currentCenter.lng - viewState.center.lng);
    
    if (latDiff > 0.0001 || lngDiff > 0.0001 || currentZoom !== viewState.zoom) {
      map.setView([viewState.center.lat, viewState.center.lng], viewState.zoom, { animate: true });
    }
  }, [viewState.center, viewState.zoom]);

  // Render and update custom markers on Leaflet
  useEffect(() => {
    const map = leafletMapRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    markers.forEach(marker => {
      const isSelected = selectedMarkerId === marker.id;
      const markerColor = isSelected ? '#EF4444' : '#2D5A27';
      const leafletMarker = L.marker([marker.lat, marker.lng], {
        icon: createCustomIcon(markerColor, isSelected)
      }).addTo(layer);

      leafletMarker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        setSelectedMarkerId(marker.id);
        setSelectedPolygonId(null);
        playAlertSound(700, 0.08);
        map.setView([marker.lat, marker.lng], map.getZoom(), { animate: true });
      });
    });

    // Draw active GPS dot if available
    if (gpsLocation) {
      const gpsMarker = L.marker([gpsLocation.lat, gpsLocation.lng], {
        icon: createGPSIcon()
      }).addTo(layer);
      gpsMarker.bindPopup("<div class='p-1 text-xs font-bold font-sans'>Your Device GPS Center</div>");
    }
  }, [markers, selectedMarkerId, gpsLocation]);

  // Render and update farm polygon boundaries on Leaflet
  useEffect(() => {
    const map = leafletMapRef.current;
    const layer = polygonsLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    polygons.forEach(poly => {
      const isSelected = selectedPolygonId === poly.id;
      const polyColor = poly.color || '#10B981';

      const leafletPoly = L.polygon(poly.path.map(p => [p.lat, p.lng]), {
        color: polyColor,
        weight: isSelected ? 4 : 2,
        fillColor: polyColor,
        fillOpacity: isSelected ? 0.45 : 0.25,
        dashArray: isSelected ? '5, 5' : undefined
      }).addTo(layer);

      // Tooltip displaying crop info inside boundaries
      leafletPoly.bindTooltip(`
        <div class="p-1 font-sans text-xs">
          <p class="font-extrabold text-[#1A2E1A]">${poly.name}</p>
          <p class="text-gray-500 font-semibold">${poly.cropType || 'Unassigned crop'}</p>
          <p class="text-[10px] text-emerald-700 font-extrabold mt-1">● Crop Health Index: ${satelliteFilter === 'ndvi' ? '0.84 Vigor (Excellent)' : 'Optimal'}</p>
        </div>
      `, { sticky: true });

      leafletPoly.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        setSelectedPolygonId(poly.id);
        setSelectedMarkerId(null);
        playAlertSound(600, 0.1);
        
        // Find polygon center and fly
        const bounds = leafletPoly.getBounds();
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      });
    });
  }, [polygons, selectedPolygonId, satelliteFilter]);

  // Synchronize active drawing path on map
  useEffect(() => {
    const map = leafletMapRef.current;
    const layer = activePathLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    if (activePath.length > 0) {
      // Draw lines
      L.polyline(activePath.map(p => [p.lat, p.lng]), {
        color: '#F59E0B',
        weight: 3,
        dashArray: '5, 5'
      }).addTo(layer);

      // Draw active vertices as small red markers
      activePath.forEach((pt, index) => {
        const marker = L.circleMarker([pt.lat, pt.lng], {
          radius: 5,
          color: '#F59E0B',
          fillColor: '#FFFFFF',
          fillOpacity: 1,
          weight: 2
        }).addTo(layer);

        marker.bindTooltip(`<span class="font-sans text-[10px]">Vertex ${index + 1}</span>`, { permanent: false });
      });
    }
  }, [activePath]);

  // Synchronize GPS flying behavior
  const handleGPSRequest = () => {
    requestLocation((coords) => {
      flyTo(coords, 16);
      playAlertSound(900, 0.15);
    });
  };

  // Timeline Auto-play Loop Engine
  useEffect(() => {
    let interval: any;
    if (isPlayingTimeline) {
      interval = setInterval(() => {
        setActiveTimelineStep(prev => {
          const next = prev + 1;
          if (next >= WEATHER_TIMELINE.length) {
            setIsPlayingTimeline(false);
            return 0;
          }
          playAlertSound(750 + next * 25, 0.05);
          return next;
        });
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isPlayingTimeline]);

  // Active Weather stats based on timeline slider position
  const activeWeather = WEATHER_TIMELINE[activeTimelineStep];

  // Canvas GPU-Accelerated Live Weather Layer Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-resolution canvas pixel ratio scaling
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animated weather structures setup
    let angle = 0;
    
    // Wind Flow Particle Array
    const windParticles: { x: number; y: number; speed: number; life: number; maxLife: number }[] = [];
    for (let i = 0; i < 220; i++) {
      windParticles.push({
        x: Math.random() * canvas.clientWidth,
        y: Math.random() * canvas.clientHeight,
        speed: Math.random() * 1.5 + 0.5,
        life: Math.random() * 80,
        maxLife: Math.random() * 100 + 40
      });
    }

    // Rain drop array (simulated inside radar storm cells)
    const rainDrops: { rx: number; ry: number; speed: number; length: number }[] = [];
    for (let i = 0; i < 80; i++) {
      rainDrops.push({
        rx: Math.random() * 300 - 150,
        ry: Math.random() * 300 - 150,
        speed: Math.random() * 6 + 8,
        length: Math.random() * 8 + 6
      });
    }

    // Static storm cell geographical coordinates drifting based on time
    // Coimbatore regional bounds centered roughly near [10.9372, 76.9560]
    let stormCenterLat = 10.9520;
    let stormCenterLng = 76.9450;

    let lightningStrikeState: { active: boolean; x: number; y: number; frame: number } = {
      active: false,
      x: 0,
      y: 0,
      frame: 0
    };

    // The Master 60FPS continuous render loop
    const render = () => {
      const map = leafletMapRef.current;
      if (!map) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      if (canvas.width !== cw * window.devicePixelRatio || canvas.height !== ch * window.devicePixelRatio) {
        resizeCanvas();
      }

      ctx.clearRect(0, 0, cw, ch);
      angle += 0.005;

      // 1. DRIFT STORM CENTER AND CLOUDS OVER TIME
      // Wind Speed influences movement rates
      const currentWindSpeed = activeWeather.windSpeed;
      const currentWindDirRad = (activeWeather.windDirection * Math.PI) / 180;
      
      const speedScale = currentWindSpeed * 0.0001;
      const driftLat = Math.sin(currentWindDirRad) * speedScale;
      const driftLng = Math.cos(currentWindDirRad) * speedScale;

      stormCenterLat += driftLat;
      stormCenterLng += driftLng;

      // Wrap geographic coordinates if drifting completely out of bounds
      if (Math.abs(stormCenterLat - 10.9372) > 0.15) stormCenterLat = 10.9520;
      if (Math.abs(stormCenterLng - 76.9560) > 0.15) stormCenterLng = 76.9450;

      // 2. RENDERING TEMPERATURE HEATMAP (Radial Gradients on Map Coordinates)
      if (layers.temperature) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        
        // Heatspots mapped on regional spots
        const heatSpots = [
          { lat: 10.9580, lng: 76.9420, size: 280, color: 'rgba(239, 68, 68, 0.45)' }, // Raju's adjacent dry field
          { lat: 10.9250, lng: 76.9720, size: 240, color: 'rgba(245, 158, 11, 0.35)' },  // Southern Ridge
          { lat: 10.9150, lng: 76.9380, size: 300, color: 'rgba(59, 130, 246, 0.25)' }   // Cool forest river sink
        ];

        heatSpots.forEach(spot => {
          try {
            const pt = map.latLngToContainerPoint([spot.lat, spot.lng]);
            const radGrad = ctx.createRadialGradient(pt.x, pt.y, 10, pt.x, pt.y, spot.size);
            radGrad.addColorStop(0, spot.color);
            radGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.12)');
            radGrad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = radGrad;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, spot.size, 0, Math.PI * 2);
            ctx.fill();
          } catch(e){}
        });
        ctx.restore();
      }

      // 3. RENDERING HUMIDITY LAYER
      if (layers.humidity) {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        // Deep teal-purple mist layers moving as large waves
        const humGradient = ctx.createLinearGradient(0, 0, cw, ch);
        const cycleValue = Math.sin(angle * 2) * 10;
        humGradient.addColorStop(0, `rgba(139, 92, 246, ${0.15 + (activeWeather.humidity / 500)})`);
        humGradient.addColorStop(0.5, `rgba(59, 130, 246, ${0.1 + (activeWeather.humidity / 600)})`);
        humGradient.addColorStop(1, `rgba(16, 185, 129, ${0.05 + cycleValue / 200})`);
        ctx.fillStyle = humGradient;
        ctx.fillRect(0, 0, cw, ch);
        ctx.restore();
      }

      // 4. Atmospheric Pressure Isobar Overlay
      if (layers.pressure) {
        ctx.save();
        ctx.strokeStyle = isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(16, 185, 129, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.font = '9px monospace';
        ctx.fillStyle = isDarkMode ? 'rgba(255,255,255,0.5)' : '#065F46';

        // Draw concentric atmospheric pressure ring vectors
        const pressureCenter = map.latLngToContainerPoint([10.9372, 76.9560]);
        const count = 5;
        for (let i = 1; i <= count; i++) {
          const r = i * 110 + (Math.sin(angle) * 8);
          ctx.beginPath();
          ctx.arc(pressureCenter.x, pressureCenter.y, r, 0, Math.PI * 2);
          ctx.stroke();

          // Label text
          const textVal = `${activeWeather.pressure - (count - i) * 2} hPa`;
          ctx.fillText(textVal, pressureCenter.x + r * Math.cos(angle * 0.4), pressureCenter.y + r * Math.sin(angle * 0.4));
        }

        // Draw "H" High Pressure or "L" Low Pressure labels
        ctx.font = 'bold 18px sans-serif';
        ctx.fillStyle = activeWeather.pressure >= 1012 ? '#3B82F6' : '#EF4444';
        ctx.fillText(activeWeather.pressure >= 1012 ? "H" : "L", pressureCenter.x, pressureCenter.y - 10);
        ctx.restore();
      }

      // 5. RENDERING FLOOD & DROUGHT POLYGON OVERLAYS
      if (layers.flood) {
        ctx.save();
        ctx.fillStyle = 'rgba(59, 130, 246, 0.28)';
        ctx.strokeStyle = 'rgba(29, 78, 216, 0.6)';
        ctx.lineWidth = 2.5;
        
        // Define river coordinates
        const riverCoordinates = [
          [10.9420, 76.9480],
          [10.9380, 76.9490],
          [10.9320, 76.9450],
          [10.9290, 76.9470],
          [10.9330, 76.9520]
        ];

        ctx.beginPath();
        riverCoordinates.forEach((coord, index) => {
          const pt = map.latLngToContainerPoint([coord[0], coord[1]]);
          if (index === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw flashing warning icon over river overflow
        try {
          const warnPt = map.latLngToContainerPoint([10.9350, 76.9480]);
          ctx.fillStyle = '#EF4444';
          ctx.beginPath();
          ctx.arc(warnPt.x, warnPt.y, 8 + Math.abs(Math.sin(angle * 10)) * 5, 0, Math.PI * 2);
          ctx.fill();
        } catch(e){}
        ctx.restore();
      }

      if (layers.drought) {
        ctx.save();
        ctx.fillStyle = 'rgba(217, 119, 6, 0.22)';
        ctx.strokeStyle = 'rgba(180, 83, 9, 0.5)';
        ctx.lineWidth = 2;
        
        // Fallow non-irrigated dry lands
        const dryFields = [
          [10.9520, 76.9680],
          [10.9450, 76.9740],
          [10.9490, 76.9780],
          [10.9560, 76.9720]
        ];

        ctx.beginPath();
        dryFields.forEach((coord, idx) => {
          const pt = map.latLngToContainerPoint([coord[0], coord[1]]);
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // 6. RAIN RADAR (Drifting Radar Storm Cells)
      if (layers.rainRadar && activeWeather.rainIntensity !== 'none') {
        ctx.save();
        try {
          const pt = map.latLngToContainerPoint([stormCenterLat, stormCenterLng]);
          const baseRadius = activeWeather.rainIntensity === 'thunderstorm' ? 140 : 100;
          
          // Radar concentric color bands (resembles standard dBZ)
          // Outer band: green light rain
          ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, baseRadius + Math.sin(angle * 4) * 5, 0, Math.PI * 2);
          ctx.fill();

          // Middle band: amber/yellow moderate
          if (activeWeather.rainIntensity !== 'light') {
            ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, baseRadius * 0.65, 0, Math.PI * 2);
            ctx.fill();
          }

          // Core band: red/magenta heavy rain
          if (activeWeather.rainIntensity === 'heavy' || activeWeather.rainIntensity === 'thunderstorm') {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, baseRadius * 0.35, 0, Math.PI * 2);
            ctx.fill();

            // Severe Storm core
            ctx.fillStyle = 'rgba(139, 92, 246, 0.6)';
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, baseRadius * 0.15, 0, Math.PI * 2);
            ctx.fill();
          }

          // Render moving rain particle streaks inside storm cell
          ctx.strokeStyle = 'rgba(186, 230, 253, 0.6)';
          ctx.lineWidth = 1.5;
          rainDrops.forEach(drop => {
            // Map drops relative to storm center
            drop.ry += drop.speed;
            // Slant according to wind Speed
            drop.rx += Math.cos(currentWindDirRad) * (currentWindSpeed / 10);

            // Wrap inside storm bounds circular geometry
            const dist = Math.sqrt(drop.rx * drop.rx + drop.ry * drop.ry);
            if (dist > baseRadius) {
              const randAng = Math.random() * Math.PI * 2;
              const randRad = Math.random() * baseRadius;
              drop.rx = Math.cos(randAng) * randRad;
              drop.ry = -Math.sin(randAng) * randRad;
            }

            const startX = pt.x + drop.rx;
            const startY = pt.y + drop.ry;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            // Draw slightly slanted drops
            ctx.lineTo(startX + Math.cos(currentWindDirRad) * 2, startY + drop.length);
            ctx.stroke();
          });

        } catch (e) {}
        ctx.restore();
      }

      // 7. LIGHTNING STRIKE LOGIC (Triggered randomly inside the storm core)
      if (layers.lightning && activeWeather.rainIntensity === 'thunderstorm') {
        if (!lightningStrikeState.active && Math.random() < 0.006) {
          try {
            const pt = map.latLngToContainerPoint([
              stormCenterLat + (Math.random() - 0.5) * 0.05,
              stormCenterLng + (Math.random() - 0.5) * 0.05
            ]);
            lightningStrikeState = {
              active: true,
              x: pt.x,
              y: pt.y,
              frame: 12
            };
            playAlertSound(140, 0.35); // Heavy thunder rumble
          } catch(e){}
        }

        if (lightningStrikeState.active) {
          lightningStrikeState.frame--;
          
          if (lightningStrikeState.frame > 0) {
            ctx.save();
            // Flash screen on first few frames
            if (lightningStrikeState.frame > 9) {
              ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
              ctx.fillRect(0, 0, cw, ch);
            }

            // Draw jagged lightning path
            ctx.strokeStyle = '#FFFFFF';
            ctx.shadowColor = '#06B6D4';
            ctx.shadowBlur = 15;
            ctx.lineWidth = 3;
            
            ctx.beginPath();
            ctx.moveTo(lightningStrikeState.x + (Math.random() - 0.5) * 30, 0); // starts top
            
            const segments = 6;
            let curY = 0;
            let curX = lightningStrikeState.x;

            for (let s = 1; s <= segments; s++) {
              const targetY = (ch / segments) * s;
              const targetX = s === segments 
                ? lightningStrikeState.x 
                : curX + (Math.random() - 0.5) * 45;
              ctx.lineTo(targetX, targetY);
              curX = targetX;
              curY = targetY;
            }
            ctx.stroke();

            // Glowing ground contact radial ring
            ctx.strokeStyle = '#06B6D4';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(lightningStrikeState.x, lightningStrikeState.y, (12 - lightningStrikeState.frame) * 4, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
          } else {
            lightningStrikeState.active = false;
          }
        }
      }

      // 8. CLOUDS OVERLAY SYSTEM (Drifting fluffy cumulus structures with shadows)
      if (layers.clouds) {
        ctx.save();
        
        // Setup 4 distinct clouds with fixed lat/lng and drifting offsets
        const cloudGroups = [
          { lat: 10.9420, lng: 76.9210, width: 200, height: 90 },
          { lat: 10.9250, lng: 76.9650, width: 250, height: 110 },
          { lat: 10.9580, lng: 76.9480, width: 180, height: 80 },
          { lat: 10.9120, lng: 76.9320, width: 220, height: 95 }
        ];

        cloudGroups.forEach((c, idx) => {
          try {
            // Apply drift to geographic center
            const timeDriftLat = Math.sin(angle * 0.1 + idx) * 0.003;
            const timeDriftLng = (angle * cloudSpeed * 0.0006) % 0.15; // drifts West to East
            const pt = map.latLngToContainerPoint([c.lat + timeDriftLat, c.lng + timeDriftLng - 0.07]);

            // Shadow Offset: standard 16px down, 12px right
            if (cloudShadows) {
              const radGradShad = ctx.createRadialGradient(pt.x + 15, pt.y + 20, 10, pt.x + 15, pt.y + 20, c.width * cloudDensity);
              radGradShad.addColorStop(0, 'rgba(0,0,0,0.18)');
              radGradShad.addColorStop(0.5, 'rgba(0,0,0,0.06)');
              radGradShad.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = radGradShad;
              ctx.beginPath();
              ctx.ellipse(pt.x + 15, pt.y + 20, c.width * cloudDensity, c.height * cloudDensity, 0, 0, Math.PI * 2);
              ctx.fill();
            }

            // Cloud Body (Radial fluffy white gradient)
            const radGradCloud = ctx.createRadialGradient(pt.x, pt.y, 5, pt.x, pt.y, c.width * cloudDensity);
            
            // Adjust white value and transparency by density and overall opacity
            radGradCloud.addColorStop(0, `rgba(255, 255, 255, ${cloudOpacity})`);
            radGradCloud.addColorStop(0.4, `rgba(240, 248, 255, ${cloudOpacity * 0.85})`);
            radGradCloud.addColorStop(0.8, `rgba(224, 231, 255, ${cloudOpacity * 0.3})`);
            radGradCloud.addColorStop(1, 'rgba(255,255,255,0)');

            ctx.fillStyle = radGradCloud;
            ctx.beginPath();
            ctx.ellipse(pt.x, pt.y, c.width * cloudDensity, c.height * cloudDensity, 0, 0, Math.PI * 2);
            ctx.fill();

          } catch(e){}
        });

        ctx.restore();
      }

      // 9. RENDERING WIND FLOW PARTICLES (Windy style fluid trails)
      if (layers.wind) {
        ctx.save();
        ctx.lineWidth = 1.0;
        
        windParticles.forEach(p => {
          p.life++;
          
          // Calculate speed based on slider wind settings
          const wvx = Math.cos(currentWindDirRad) * (p.speed * (currentWindSpeed / 8));
          const wvy = Math.sin(currentWindDirRad) * (p.speed * (currentWindSpeed / 8));

          p.x += wvx;
          p.y += wvy;

          // Reset when out of bounds or expired
          if (p.life > p.maxLife || p.x < 0 || p.x > cw || p.y < 0 || p.y > ch) {
            p.x = Math.random() * cw;
            p.y = Math.random() * ch;
            p.life = 0;
          }

          // Glowing neon cyan wind trail line
          ctx.strokeStyle = isDarkMode 
            ? `rgba(6, 182, 212, ${0.1 + (1.0 - p.life / p.maxLife) * 0.45})`
            : `rgba(16, 185, 129, ${0.15 + (1.0 - p.life / p.maxLife) * 0.48})`;
          ctx.beginPath();
          ctx.moveTo(p.x - wvx * 3.5, p.y - wvy * 3.5);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        });
        ctx.restore();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [layers, activeTimelineStep, cloudSpeed, cloudDensity, cloudOpacity, cloudShadows, isDarkMode]);

  // Autocomplete prediction selection handler
  const handlePlaceSelect = (details: any) => {
    const searchMarker: FarmMarker = {
      id: `search-${Date.now()}`,
      name: details.name || 'Searched Location',
      lat: details.lat,
      lng: details.lng,
      address: details.address,
      timestamp: new Date().toLocaleString(),
    };

    setMarkers(prev => [...prev, searchMarker]);
    setSelectedMarkerId(searchMarker.id);
    flyTo({ lat: details.lat, lng: details.lng }, 15);
    playAlertSound(850, 0.1);
  };

  // Register drawn boundary polygon
  const handleRegisterPolygon = (name: string, color: string, cropType: string) => {
    addPolygon({
      name,
      path: activePath,
      areaSqM: metrics.areaSqM,
      perimeterM: metrics.perimeterM,
      acres: metrics.acres,
      hectares: metrics.hectares,
      color,
      cropType,
      soilMoisture: Math.floor(Math.random() * (75 - 40 + 1) + 40)
    });
    clearPolygon();
    playAlertSound(1100, 0.25);
  };

  // Acknowledge AI alert
  const handleAcknowledgeAlert = (id: string) => {
    setAiAlerts(prev => prev.map(a => a.id === id ? { ...a, ack: true } : a));
    playAlertSound(1000, 0.1);
  };

  // Run AI analysis scan simulation
  const handleAIScan = (camId: string) => {
    playAlertSound(1200, 0.3);
    setCameras(prev => prev.map(cam => {
      if (cam.id === camId) {
        return {
          ...cam,
          status: "Active",
          detectedObjects: [
            { label: "Normal activity", confidence: 99, bbox: [0, 0, 0, 0] }
          ],
          lastUpdate: "Scanned & Verified"
        };
      }
      return cam;
    }));
  };

  return (
    <div className={`flex flex-col lg:flex-row gap-6 w-full min-h-[82vh] max-h-[140vh] overflow-hidden rounded-3xl border shadow-2xl transition-all ${
      isDarkMode 
        ? 'bg-slate-950 border-slate-800 text-slate-100' 
        : 'bg-white border-emerald-100 text-[#2D3628]'
    }`}>
      
      {/* 1. LEFT COLUMN: FARM INTELLIGENCE SIDEBAR & METRIC GRIDS */}
      <div className={`w-full lg:w-[410px] flex flex-col gap-5 p-5 overflow-y-auto shrink-0 select-none ${
        isDarkMode ? 'bg-slate-950 border-r border-slate-800' : 'bg-[#FAFBF9] border-r border-emerald-500/10'
      }`}>
        
        {/* BRAND & GPS CONTROLS CONTAINER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center text-white font-black shadow shadow-emerald-500/20">
              <Brain className="w-4 h-4 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight">Kisan Alert AI</h2>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black tracking-wider uppercase">GIS CLOUD COMMAND</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Dark Mode switcher */}
            <button 
              onClick={() => {
                setIsDarkMode(!isDarkMode);
                playAlertSound(800, 0.05);
              }}
              className={`p-2 rounded-xl border cursor-pointer transition-all ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800' : 'bg-white border-emerald-100 text-gray-500 hover:bg-gray-50'
              }`}
              title="Toggle Day/Night Mode"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>

            {/* Audio alarm sound toggle */}
            <button 
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                playAlertSound(900, 0.05);
              }}
              className={`p-2 rounded-xl border cursor-pointer transition-all ${
                soundEnabled 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-slate-100 dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-400'
              }`}
              title={soundEnabled ? "Mute alert buzzers" : "Unmute alert buzzers"}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* Quick focus back on primary farm center */}
            <button
              onClick={() => {
                flyTo({ lat: 10.9372, lng: 76.9560 }, 15);
                playAlertSound(750, 0.1);
              }}
              className="px-2.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] shadow-sm flex items-center gap-1 cursor-pointer transition-all"
            >
              <Maximize className="w-3 h-3" /> Focus Farm
            </button>
          </div>
        </div>

        {/* Dynamic location geocoder search */}
        <SearchBar onPlaceSelect={handlePlaceSelect} />

        {/* GIS PLOT BOUNDARY DRAWER */}
        <PolygonDrawer
          isDrawing={isDrawing}
          isEditing={isEditing}
          pathLength={activePath.length}
          metrics={metrics}
          onStartDrawing={startDrawing}
          onStopDrawing={stopDrawing}
          onClear={clearPolygon}
          onSave={handleRegisterPolygon}
          savedPolygons={polygons}
          selectedPolygonId={selectedPolygonId}
          onSelectPolygon={setSelectedPolygonId}
          onDeletePolygon={deletePolygon}
        />

        {/* 2. DYNAMIC FARM DETAILS & TELEMETRY GAUGES */}
        <AnimatePresence mode="wait">
          {selectedPoly ? (
            <motion.div 
              key={selectedPoly.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className={`rounded-2xl p-4 border ${
                isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-emerald-500/10'
              }`}
            >
              <div className="flex justify-between items-start border-b pb-3 mb-3 border-emerald-500/10">
                <div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                    {selectedPoly.cropType || "Active Plot"}
                  </span>
                  <h4 className="font-bold text-sm mt-1.5">{selectedPoly.name}</h4>
                  <p className="text-[10px] text-gray-400 font-mono">ID: {selectedPoly.id}</p>
                </div>
                <button 
                  onClick={() => setSelectedPolygonId(null)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Grid of Real-Time Farm Sensors */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className={`p-2.5 rounded-xl border text-xs ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-[#FAFBF9] border-emerald-500/5'}`}>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Acres</p>
                  <p className="text-base font-black mt-0.5">{selectedPoly.acres} ac</p>
                  <p className="text-[9px] text-gray-500">Perimeter: {selectedPoly.perimeterM}m</p>
                </div>

                <div className={`p-2.5 rounded-xl border text-xs ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-[#FAFBF9] border-emerald-500/5'}`}>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Root Zone Moisture</p>
                  <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {selectedPoly.soilMoisture !== undefined ? selectedPoly.soilMoisture + activeWeather.soilMoistureChange : 55}%
                  </p>
                  <p className="text-[9px] text-gray-500">Optimum: 50% - 75%</p>
                </div>

                <div className={`p-2.5 rounded-xl border text-xs ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-[#FAFBF9] border-emerald-500/5'}`}>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Pest / Disease Risk</p>
                  <p className={`text-base font-black mt-0.5 ${
                    activeWeather.rainIntensity === 'thunderstorm' ? 'text-red-500' : 'text-amber-500'
                  }`}>
                    {activeWeather.rainIntensity === 'thunderstorm' ? "84% (High)" : "22% (Low)"}
                  </p>
                  <p className="text-[9px] text-gray-500">Blast infection risk</p>
                </div>

                <div className={`p-2.5 rounded-xl border text-xs ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-[#FAFBF9] border-emerald-500/5'}`}>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Groundwater Table</p>
                  <p className="text-base font-black text-blue-600 dark:text-blue-400 mt-0.5">-42.4 m</p>
                  <p className="text-[9px] text-gray-500">Aquifer recovery rate: +2%</p>
                </div>
              </div>

              {/* Recharts Soil Moisture Trend chart */}
              <div className="space-y-1.5">
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">7-Day Biomass &amp; Moisture Projection</p>
                <div className="h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart 
                      data={[
                        { name: "Day 1", index: 0.72, moisture: 50 },
                        { name: "Day 2", index: 0.75, moisture: 65 },
                        { name: "Day 3", index: 0.82, moisture: 80 },
                        { name: "Day 4", index: 0.84, moisture: 75 },
                        { name: "Day 5", index: 0.81, moisture: 60 },
                        { name: "Day 6", index: 0.79, moisture: 54 },
                        { name: "Day 7", index: 0.84, moisture: 48 }
                      ]}
                      margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                    >
                      <XAxis dataKey="name" stroke="#8A9A8A" fontSize={8} tickLine={false} />
                      <YAxis stroke="#8A9A8A" fontSize={8} tickLine={false} />
                      <Tooltip contentStyle={{ fontSize: "10px", borderRadius: "8px" }} />
                      <Area type="monotone" dataKey="moisture" stroke="#3B82F6" fill="rgba(59, 130, 246, 0.1)" strokeWidth={1.5} name="Moisture %" />
                      <Area type="monotone" dataKey="index" stroke="#10B981" fill="rgba(16, 185, 129, 0.1)" strokeWidth={1.5} name="NDVI Vigor" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </motion.div>
          ) : selectedMarker ? (
            <motion.div
              key={selectedMarker.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className={`rounded-2xl p-4 border ${
                isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-emerald-500/10'
              }`}
            >
              <div className="flex justify-between items-start border-b pb-2 mb-2 border-emerald-500/10">
                <div className="flex gap-2 items-center">
                  <MapPin className="w-4 h-4 text-red-500" />
                  <h4 className="font-extrabold text-xs">{selectedMarker.name}</h4>
                </div>
                <button onClick={() => setSelectedMarkerId(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-2 leading-relaxed">{selectedMarker.address}</p>
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-xl text-[11px] border border-emerald-500/10">
                <span className="font-extrabold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block mb-0.5">MOCK TELEMETRY NOTES:</span>
                "{selectedMarker.notes || 'No active sensor notes configured.'}"
              </div>
            </motion.div>
          ) : (
            <div className={`p-5 text-center rounded-2xl border border-dashed ${
              isDarkMode ? 'bg-slate-900/20 border-slate-800 text-slate-400' : 'bg-white border-emerald-500/10 text-gray-400'
            }`}>
              <MapPin className="w-8 h-8 text-emerald-600/30 mx-auto mb-2 animate-bounce" />
              <p className="text-xs font-bold">Select any farm plot boundary or marker on the map to query dynamic crop metrics.</p>
            </div>
          )}
        </AnimatePresence>

        {/* 3. AI WEATHER PREDICTIONS WIDGET */}
        <div className={`rounded-2xl p-4 border ${
          isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-emerald-500/10'
        }`}>
          <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-emerald-500/10 justify-between">
            <div className="flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-black">AI Agronomic Forecast</h3>
            </div>
            <span className="text-[9px] font-bold text-[#2D5A27] bg-[#EBF3E5] px-1.5 py-0.5 rounded-full font-mono">
              Step: {activeWeather.label}
            </span>
          </div>

          <p className="text-[11px] leading-relaxed italic text-gray-500 dark:text-gray-300">
            "{activeWeather.advisory}"
          </p>

          <div className="mt-3 space-y-2">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Dynamic Tasks Checklist:</p>
            {activeWeather.recommendations.map((rec, i) => (
              <div key={i} className="flex gap-2 p-2 rounded-xl bg-emerald-50/45 dark:bg-emerald-950/20 border border-emerald-500/5 text-xs">
                <div className="w-1.5 rounded bg-emerald-500 shrink-0"></div>
                <div>
                  <span className="font-extrabold text-[#2D5A27] dark:text-emerald-400">{rec.category} • {rec.title}</span>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{rec.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. REAL-TIME AI EMERGENCY ALERTS TICKER */}
        <div className={`rounded-2xl p-4 border ${
          isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-emerald-500/10'
        }`}>
          <div className="flex justify-between items-center pb-2 mb-2 border-b border-emerald-500/10">
            <h3 className="text-xs font-black text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 animate-pulse text-red-500" />
              Live Security &amp; Operational Alerts
            </h3>
            <span className="text-[9px] font-extrabold bg-red-100 dark:bg-red-950 text-red-700 px-1.5 py-0.5 rounded-full">
              {aiAlerts.filter(a => !a.ack).length} active
            </span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {aiAlerts.filter(a => !a.ack).map((alert) => (
              <div 
                key={alert.id}
                className={`p-2.5 rounded-xl border flex gap-2 relative overflow-hidden transition-all ${
                  alert.severity === 'high' 
                    ? 'bg-red-50/60 dark:bg-red-950/20 border-red-200 dark:border-red-900/30 text-red-950 dark:text-red-100' 
                    : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30 text-amber-950 dark:text-amber-100'
                }`}
              >
                <div className="text-base leading-none shrink-0 mt-0.5">{alert.icon}</div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <span className="font-extrabold text-[11px] leading-tight block">{alert.title}</span>
                    <button 
                      onClick={() => handleAcknowledgeAlert(alert.id)}
                      className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-emerald-500/10 hover:bg-emerald-50 cursor-pointer"
                    >
                      Acknowledge
                    </button>
                  </div>
                  <p className="text-[10px] opacity-80 mt-1 leading-relaxed">{alert.desc}</p>
                </div>
              </div>
            ))}

            {aiAlerts.filter(a => !a.ack).length === 0 && (
              <div className="text-center py-4 text-xs text-emerald-600 flex items-center justify-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> All threats and operational alerts solved!
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 2. MAIN MAP CANVAS VIEWPORT COLUMN */}
      <div className="flex-1 flex flex-col relative h-[82vh] overflow-hidden">
        
        {/* UPPER FLOATING BAR: LIVE RADAR CHRONOLOGY CONTROL */}
        <div className="absolute top-4 left-4 right-4 flex flex-col md:flex-row md:items-center justify-between gap-3 z-[1000] pointer-events-none">
          
          {/* Glassmorphic Active Stats readout */}
          <div className="px-3.5 py-2.5 bg-black/85 backdrop-blur-md rounded-2xl border border-white/10 flex items-center gap-4 text-white pointer-events-auto shadow-2xl">
            <div className="flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-sky-400 animate-bounce" />
              <div>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Estimated Rain Arrival</p>
                <p className="text-xs font-black text-white">
                  {activeTimelineStep === 0 ? "Storm core at 4.2 km (Approaching)" : 
                   activeTimelineStep === 1 ? "Storm core at 1.8 km (ETA 15 mins)" :
                   activeTimelineStep === 2 ? "Rain active on your fields!" :
                   "Precipitation passed - drying"}
                </p>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 border-l border-white/10 pl-4">
              <Wind className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Wind Particle Stream</p>
                <p className="text-xs font-black text-white">{activeWeather.windSpeed} km/h • {activeWeather.windDirection}° SW</p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 border-l border-white/10 pl-4">
              <Thermometer className="w-4 h-4 text-orange-400" />
              <div>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Avg Thermal Index</p>
                <p className="text-xs font-black text-white">
                  {28 + activeWeather.tempOffset}°C
                </p>
              </div>
            </div>
          </div>

          {/* AI Security Camera Trigger widgets */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {cameras.map(cam => (
              <button
                key={cam.id}
                onClick={() => {
                  setActiveCameraId(cam.id);
                  playAlertSound(650, 0.1);
                }}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-tight border transition-all cursor-pointer flex items-center gap-1.5 ${
                  cam.status === 'Alerting'
                    ? 'bg-red-600 hover:bg-red-700 text-white border-red-500 animate-pulse'
                    : 'bg-black/80 hover:bg-black text-gray-200 border-white/10'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                {cam.name} {cam.status === 'Alerting' && '• AI THREAT'}
              </button>
            ))}
          </div>

        </div>

        {/* FLOATING RIGHT PANELS DECK: WINDY LAYERS MENU & SATELLITE SPECTRUMS */}
        <div className="absolute top-20 right-4 flex flex-col gap-3 items-end z-[1000] pointer-events-none">
          
          {/* Windy Layers Selector Panel */}
          <div className="p-3.5 bg-black/85 backdrop-blur-md rounded-2xl border border-white/10 text-white flex flex-col gap-2 pointer-events-auto shadow-2xl w-52 select-none">
            <p className="text-[9px] font-extrabold text-sky-400 uppercase tracking-widest flex items-center gap-1">
              <Layers className="w-3 h-3" /> Live Weather overlays
            </p>
            
            <div className="grid grid-cols-1 gap-1 pt-1.5 text-xs">
              <button 
                onClick={() => setLayers(prev => ({ ...prev, clouds: !prev.clouds }))}
                className={`px-2 py-1 rounded-lg flex items-center justify-between cursor-pointer transition-all ${layers.clouds ? 'bg-sky-600 font-bold' : 'hover:bg-white/10'}`}
              >
                <span>Cumulus Clouds</span>
                <span className="text-[9px] opacity-70">Animated</span>
              </button>

              <button 
                onClick={() => setLayers(prev => ({ ...prev, rainRadar: !prev.rainRadar }))}
                className={`px-2 py-1 rounded-lg flex items-center justify-between cursor-pointer transition-all ${layers.rainRadar ? 'bg-indigo-600 font-bold' : 'hover:bg-white/10'}`}
              >
                <span>Rain Radar</span>
                <span className="text-[9px] opacity-70">Drifting</span>
              </button>

              <button 
                onClick={() => setLayers(prev => ({ ...prev, wind: !prev.wind }))}
                className={`px-2 py-1 rounded-lg flex items-center justify-between cursor-pointer transition-all ${layers.wind ? 'bg-emerald-600 font-bold' : 'hover:bg-white/10'}`}
              >
                <span>Wind Particles</span>
                <span className="text-[9px] opacity-70">Trails</span>
              </button>

              <button 
                onClick={() => setLayers(prev => ({ ...prev, temperature: !prev.temperature }))}
                className={`px-2 py-1 rounded-lg flex items-center justify-between cursor-pointer transition-all ${layers.temperature ? 'bg-red-600 font-bold' : 'hover:bg-white/10'}`}
              >
                <span>Temp Heatmap</span>
                <span className="text-[9px] opacity-70">Gradients</span>
              </button>

              <button 
                onClick={() => setLayers(prev => ({ ...prev, humidity: !prev.humidity }))}
                className={`px-2 py-1 rounded-lg flex items-center justify-between cursor-pointer transition-all ${layers.humidity ? 'bg-purple-600 font-bold' : 'hover:bg-white/10'}`}
              >
                <span>Humidity Vapor</span>
                <span className="text-[9px] opacity-70">Purple</span>
              </button>

              <button 
                onClick={() => setLayers(prev => ({ ...prev, pressure: !prev.pressure }))}
                className={`px-2 py-1 rounded-lg flex items-center justify-between cursor-pointer transition-all ${layers.pressure ? 'bg-amber-600 font-bold' : 'hover:bg-white/10'}`}
              >
                <span>Atm Pressure</span>
                <span className="text-[9px] opacity-70">Isobars</span>
              </button>

              <button 
                onClick={() => setLayers(prev => ({ ...prev, lightning: !prev.lightning }))}
                className={`px-2 py-1 rounded-lg flex items-center justify-between cursor-pointer transition-all ${layers.lightning ? 'bg-cyan-600 font-bold' : 'hover:bg-white/10'}`}
              >
                <span>Live Lightning</span>
                <span className="text-[9px] opacity-70">Strikes</span>
              </button>

              <button 
                onClick={() => setLayers(prev => ({ ...prev, flood: !prev.flood }))}
                className={`px-2 py-1 rounded-lg flex items-center justify-between cursor-pointer transition-all ${layers.flood ? 'bg-blue-600 font-bold' : 'hover:bg-white/10'}`}
              >
                <span>Flood Hazard</span>
                <span className="text-[9px] opacity-70">Overflow</span>
              </button>

              <button 
                onClick={() => setLayers(prev => ({ ...prev, drought: !prev.drought }))}
                className={`px-2 py-1 rounded-lg flex items-center justify-between cursor-pointer transition-all ${layers.drought ? 'bg-[#92400e] font-bold' : 'hover:bg-white/10'}`}
              >
                <span>Soil Drought</span>
                <span className="text-[9px] opacity-70">Dryness</span>
              </button>
            </div>
          </div>

          {/* NASA Satellite Spectra view */}
          <div className="p-3 bg-black/85 backdrop-blur-md rounded-2xl border border-white/10 text-white flex flex-col gap-2 pointer-events-auto shadow-2xl w-52 select-none">
            <p className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
              <Sun className="w-3.5 h-3.5" /> Satellite Spectra view
            </p>
            <div className="grid grid-cols-2 gap-1 text-[10px] font-bold">
              <button 
                onClick={() => {
                  setSatelliteFilter('standard');
                  changeMapType('hybrid');
                  playAlertSound(700, 0.05);
                }}
                className={`p-1.5 rounded-lg text-center cursor-pointer ${satelliteFilter === 'standard' ? 'bg-emerald-600' : 'hover:bg-white/10'}`}
              >
                Standard
              </button>

              <button 
                onClick={() => {
                  setSatelliteFilter('ndvi');
                  changeMapType('satellite');
                  playAlertSound(800, 0.05);
                }}
                className={`p-1.5 rounded-lg text-center cursor-pointer ${satelliteFilter === 'ndvi' ? 'bg-green-700' : 'hover:bg-white/10'}`}
                title="Normalized Difference Vegetation Index (Chlorophyll Plant Vigor)"
              >
                NDVI Vigor
              </button>

              <button 
                onClick={() => {
                  setSatelliteFilter('infrared');
                  changeMapType('satellite');
                  playAlertSound(900, 0.05);
                }}
                className={`p-1.5 rounded-lg text-center cursor-pointer ${satelliteFilter === 'infrared' ? 'bg-purple-700' : 'hover:bg-white/10'}`}
              >
                Infrared Thermal
              </button>

              <button 
                onClick={() => {
                  setSatelliteFilter('falseColor');
                  changeMapType('satellite');
                  playAlertSound(1000, 0.05);
                }}
                className={`p-1.5 rounded-lg text-center cursor-pointer ${satelliteFilter === 'falseColor' ? 'bg-orange-700' : 'hover:bg-white/10'}`}
              >
                Spectral Color
              </button>
            </div>
          </div>

          {/* Cloud Customizer Engine controls */}
          <div className="p-3 bg-black/85 backdrop-blur-md rounded-2xl border border-white/10 text-white flex flex-col gap-2.5 pointer-events-auto shadow-2xl w-52 select-none text-[10px]">
            <p className="font-extrabold text-[#10B981] uppercase tracking-widest">Clouds Engine</p>
            
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span>Speed Offset</span>
                <span className="font-mono">{cloudSpeed}x</span>
              </div>
              <input 
                type="range" min="1" max="10" 
                value={cloudSpeed} 
                onChange={(e) => setCloudSpeed(Number(e.target.value))} 
                className="w-full accent-emerald-500 cursor-pointer h-1 bg-white/20 rounded"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span>Density scale</span>
                <span className="font-mono">{Math.round(cloudDensity * 100)}%</span>
              </div>
              <input 
                type="range" min="10" max="100" step="10"
                value={cloudDensity * 100} 
                onChange={(e) => setCloudDensity(Number(e.target.value) / 100)} 
                className="w-full accent-emerald-500 cursor-pointer h-1 bg-white/20 rounded"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span>Opacity</span>
                <span className="font-mono">{Math.round(cloudOpacity * 100)}%</span>
              </div>
              <input 
                type="range" min="10" max="100" step="5"
                value={cloudOpacity * 100} 
                onChange={(e) => setCloudOpacity(Number(e.target.value) / 100)} 
                className="w-full accent-emerald-500 cursor-pointer h-1 bg-white/20 rounded"
              />
            </div>

            <button
              onClick={() => setCloudShadows(!cloudShadows)}
              className={`py-1 rounded-lg text-center font-bold ${cloudShadows ? 'bg-sky-950 text-sky-400 border border-sky-800/40' : 'bg-white/10 hover:bg-white/20'}`}
            >
              Shadow Mapping: {cloudShadows ? "ON" : "OFF"}
            </button>
          </div>

        </div>

        {/* FLOATING LEGENDS CARD (Bottom Left of Map) */}
        <div className="absolute bottom-28 left-4 z-[1000] pointer-events-none">
          <div className="p-3 bg-black/85 backdrop-blur-md rounded-2xl border border-white/10 text-white shadow-2xl text-[10px] flex flex-col gap-2 w-44 select-none pointer-events-auto">
            <span className="font-extrabold uppercase tracking-widest text-[#10B981]">Dynamic Legends Scale</span>
            
            {layers.temperature && (
              <div className="space-y-1">
                <span>Regional Heat Temp (°C)</span>
                <div className="h-2 w-full bg-gradient-to-r from-blue-500 via-yellow-400 to-red-500 rounded" />
                <div className="flex justify-between text-[8px] opacity-75 font-mono">
                  <span>18°C (Cool)</span>
                  <span>42°C (Heatwave)</span>
                </div>
              </div>
            )}

            {layers.rainRadar && (
              <div className="space-y-1">
                <span>Radar Reflectivity (dBZ)</span>
                <div className="h-2 w-full bg-gradient-to-r from-green-500 via-yellow-500 via-red-500 to-purple-600 rounded" />
                <div className="flex justify-between text-[8px] opacity-75 font-mono">
                  <span>Light</span>
                  <span>Thunderstorm</span>
                </div>
              </div>
            )}

            {satelliteFilter === 'ndvi' && (
              <div className="space-y-1">
                <span>NDVI Biomass Index</span>
                <div className="h-2 w-full bg-gradient-to-r from-[#ef4444] via-[#f59e0b] to-[#10b981] rounded" />
                <div className="flex justify-between text-[8px] opacity-75 font-mono">
                  <span>0.1 (Fallow)</span>
                  <span>0.9 (Vapor Peak)</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 border-t border-white/10 pt-1.5 opacity-80 text-[8.5px]">
              <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
              <span>Emerald: Paddy</span>
            </div>
            <div className="flex items-center gap-2 opacity-80 text-[8.5px]">
              <div className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
              <span>Purple: Cotton</span>
            </div>
          </div>
        </div>

        {/* THE GEOGRAPHICAL LEAFLET MAP ELEMENT */}
        <div ref={mapContainerRef} className="w-full h-full relative z-0" />

        {/* THE ANIMATION OVERLAY LAYER (60FPS high-perf weather layer canvas) */}
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full pointer-events-none z-[400]" 
        />

        {/* FLOATING LAYER SATELLITE TYPE SWITCHER */}
        <div className="absolute top-4 right-4 flex flex-col gap-3 items-end z-[1000]">
          <MapTypeSwitcher
            currentType={viewState.mapTypeId}
            onChangeType={changeMapType}
          />
        </div>

        {/* FLOATING ACTION BOTTOM CONTROLS */}
        <div className="absolute bottom-28 right-4 flex flex-col gap-2 items-end z-[1000] pointer-events-auto select-none">
          <CurrentLocationButton
            loading={gpsLoading}
            onClick={handleGPSRequest}
          />
          <div className="flex flex-col bg-black/85 backdrop-blur rounded-xl border border-white/10 overflow-hidden shadow-xl text-white">
            <button 
              onClick={() => leafletMapRef.current?.zoomIn()} 
              className="p-2.5 hover:bg-white/10 border-b border-white/10 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button 
              onClick={() => leafletMapRef.current?.zoomOut()} 
              className="p-2.5 hover:bg-white/10 cursor-pointer"
            >
              <Trash2 className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </div>

        {/* 3. WEATHER TIME-TRAVEL CHRONOLOGY TIMELINE */}
        <div className="absolute bottom-4 left-4 right-4 bg-black/85 backdrop-blur-md border border-white/10 rounded-2xl p-4 z-[1000] shadow-2xl pointer-events-auto select-none">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            
            {/* Timeline slider controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setIsPlayingTimeline(!isPlayingTimeline);
                  playAlertSound(900, 0.1);
                }}
                className={`p-2 rounded-xl transition-all font-bold cursor-pointer ${
                  isPlayingTimeline ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                }`}
                title="Play 7-Day weather changes progression loop"
              >
                {isPlayingTimeline ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>

              <div>
                <span className="text-[10px] text-[#10B981] font-black uppercase tracking-widest block">GIS Chronology</span>
                <span className="text-xs text-white font-extrabold">{activeWeather.label} ({activeWeather.subLabel})</span>
              </div>
            </div>

            {/* Simulated weather icons slider indicators */}
            <div className="flex-1 min-w-[280px] flex items-center justify-between gap-2 px-4 relative">
              {WEATHER_TIMELINE.map((step, idx) => {
                const isActive = idx === activeTimelineStep;
                return (
                  <button
                    key={step.label}
                    onClick={() => {
                      setActiveTimelineStep(idx);
                      setIsPlayingTimeline(false);
                      playAlertSound(700 + idx * 30, 0.05);
                    }}
                    className={`flex flex-col items-center gap-1 cursor-pointer relative z-10 group`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border transition-all ${
                      isActive 
                        ? 'bg-emerald-600 border-emerald-400 text-white scale-110 shadow shadow-emerald-500/35' 
                        : 'bg-slate-900 border-white/10 text-gray-400 hover:text-white hover:border-white/30'
                    }`}>
                      {step.rainIntensity === 'none' ? '☀️' : step.rainIntensity === 'thunderstorm' ? '⚡' : '🌧'}
                    </div>
                    <span className={`text-[9px] font-bold ${isActive ? 'text-emerald-400 font-extrabold' : 'text-gray-400'}`}>
                      {step.label}
                    </span>
                  </button>
                );
              })}
              
              {/* Slider track background bar */}
              <div className="absolute top-4 left-6 right-6 h-0.5 bg-white/10 z-0" />
            </div>

          </div>
        </div>

        {/* ACTIVE DRAWING INSTRUCTIONS ALERT */}
        {isDrawing && (
          <div className="absolute top-20 left-4 bg-amber-500/95 backdrop-blur border border-amber-600 rounded-2xl p-4 max-w-xs text-black shadow-2xl z-[1000] animate-pulse">
            <div className="flex gap-2">
              <Pencil className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-xs">BOUNDARY DRAWER INTERACTIVE</p>
                <p className="text-[11px] font-semibold mt-1 leading-relaxed">
                  Click directly on farm coordinates to add polygon vertices. Save in the left panel to complete.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 3. AI FARM SECURITY CAMERA OVERLAY MODAL */}
      <AnimatePresence>
        {activeCameraId && (
          (() => {
            const cam = cameras.find(c => c.id === activeCameraId);
            if (!cam) return null;
            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[2000] p-4"
              >
                <motion.div
                  initial={{ scale: 0.9, y: 15 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 15 }}
                  className={`w-full max-w-2xl rounded-3xl border overflow-hidden shadow-2xl ${
                    isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-emerald-500/15'
                  }`}
                >
                  {/* Camera Header */}
                  <div className="p-4 border-b border-emerald-500/10 flex justify-between items-center bg-black/5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${cam.status === 'Alerting' ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                      <div>
                        <h3 className="font-extrabold text-sm text-[#1A2E1A] dark:text-emerald-50">{cam.name}</h3>
                        <p className="text-[10px] text-gray-400 font-mono">Live RTSP: {cam.url}</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => setActiveCameraId(null)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Camera Simulated Frame Stream */}
                  <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                    <img 
                      src={cam.imageUrl} 
                      alt="AI Feed" 
                      className="w-full h-full object-cover opacity-80" 
                      referrerPolicy="no-referrer"
                    />

                    {/* AI Object Bounding Boxes */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 500 300" preserveAspectRatio="none">
                      {cam.detectedObjects.map((obj, idx) => {
                        const [x, y, w, h] = obj.bbox;
                        if (x === 0) return null;
                        const strokeColor = cam.status === 'Alerting' ? '#EF4444' : '#10B981';
                        return (
                          <g key={idx}>
                            <rect x={x} y={y} width={w - x} height={h - y} fill="none" stroke={strokeColor} strokeWidth="3" className="animate-pulse" />
                            <rect x={x} y={y - 18} width={130} height={18} fill={strokeColor} />
                            <text x={x + 5} y={y - 5} fill="white" className="text-[9.5px] font-extrabold font-mono uppercase">
                              {obj.label} ({obj.confidence}%)
                            </text>
                          </g>
                        );
                      })}
                    </svg>

                    {/* Telemetry diagnostics stats overlay */}
                    <div className="absolute bottom-4 left-4 p-2 bg-black/75 rounded-lg border border-white/10 font-mono text-[8px] text-emerald-400 space-y-0.5 select-none pointer-events-none">
                      <p>● COGNITIVE_MODEL: RESNET_YOLOV8_AG</p>
                      <p>● ANALYTICS: {cam.status === 'Alerting' ? "THREAT_BREACH" : "NORMAL_ACTIVITY"}</p>
                      <p>● FPS: 30.0 / BINDINGS: VERIFIED</p>
                    </div>
                  </div>

                  {/* Actions & Dispatch Controller */}
                  <div className="p-4 bg-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Camera Location</span>
                      <span className="font-extrabold">{cam.locationName}</span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAIScan(cam.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md cursor-pointer transition-all"
                      >
                        Run Recalibration AI Scan
                      </button>
                      <button
                        onClick={() => setActiveCameraId(null)}
                        className="px-4 py-2 border border-gray-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 font-extrabold rounded-xl cursor-pointer"
                      >
                        Dismiss Feed
                      </button>
                    </div>
                  </div>

                </motion.div>
              </motion.div>
            );
          })()
        )}
      </AnimatePresence>

    </div>
  );
}
