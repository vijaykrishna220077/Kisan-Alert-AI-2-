import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers, MapPin } from 'lucide-react';
import { FarmerProfile } from '../../types';

interface SatelliteTelemetryMapProps {
  activeFarmer: FarmerProfile;
  satelliteLayer: 'ndvi' | 'moisture' | 'true-color';
}

// Map farmer profile to stable geographic coordinates in India
export function getFarmerCoordinates(farmer: FarmerProfile) {
  if (farmer.id === 'FMR-701') return { lat: 16.2435, lng: 80.6412 }; // Tenali, AP
  if (farmer.id === 'FMR-802') return { lat: 16.1681, lng: 74.8251 }; // Gokak, Karnataka

  // Stable hashing based on name and ID for dynamically created farmers
  let hash = 0;
  const str = farmer.name + farmer.id;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Centered in Guntur region with minor stable offset
  const latOffset = (Math.abs(hash % 1000) / 15000) - 0.033;
  const lngOffset = (Math.abs((hash >> 3) % 1000) / 15000) - 0.033;
  return {
    lat: 16.3067 + latOffset,
    lng: 80.4365 + lngOffset
  };
}

export function SatelliteTelemetryMap({ activeFarmer, satelliteLayer }: SatelliteTelemetryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const activeFarmerRef = useRef<FarmerProfile>(activeFarmer);
  
  // Track Leaflet layers to remove/update them dynamically
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const polygonsGroupRef = useRef<L.FeatureGroup | null>(null);
  const markerGroupRef = useRef<L.FeatureGroup | null>(null);

  // Keep ref up to date
  useEffect(() => {
    activeFarmerRef.current = activeFarmer;
  }, [activeFarmer]);

  // Initial Leaflet map boot
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const coords = getFarmerCoordinates(activeFarmer);

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      center: [coords.lat, coords.lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false
    });

    mapRef.current = map;

    // Use Esri World Imagery as the default base satellite layer
    const satelliteTileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    const tileLayer = L.tileLayer(satelliteTileUrl, {
      maxZoom: 19,
      attribution: 'Esri Satellite'
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Add layers
    polygonsGroupRef.current = L.featureGroup().addTo(map);
    markerGroupRef.current = L.featureGroup().addTo(map);

    // Watch resizing
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync zoom and flyTo whenever activeFarmer changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const coords = getFarmerCoordinates(activeFarmer);
    map.flyTo([coords.lat, coords.lng], 15, {
      animate: true,
      duration: 1.2
    });
  }, [activeFarmer]);

  // Re-draw Sentinel-2 telemetry overlays whenever activeFarmer or satelliteLayer updates
  useEffect(() => {
    const map = mapRef.current;
    const polygonsGroup = polygonsGroupRef.current;
    const markerGroup = markerGroupRef.current;

    if (!map || !polygonsGroup || !markerGroup) return;

    // Clear old drawings
    polygonsGroup.clearLayers();
    markerGroup.clearLayers();

    const coords = getFarmerCoordinates(activeFarmer);
    const { lat, lng } = coords;

    // Define 3 contiguous plot shapes styled dynamically based on the telemetry layer
    const plot1Coords: L.LatLngTuple[] = [
      [lat - 0.0018, lng - 0.0018],
      [lat + 0.0004, lng - 0.0022],
      [lat + 0.0008, lng + 0.0006],
      [lat - 0.0012, lng + 0.0008],
    ];

    const plot2Coords: L.LatLngTuple[] = [
      [lat + 0.0004, lng - 0.0022],
      [lat + 0.0026, lng - 0.0016],
      [lat + 0.0022, lng + 0.0014],
      [lat + 0.0008, lng + 0.0006],
    ];

    const plot3Coords: L.LatLngTuple[] = [
      [lat - 0.0012, lng + 0.0008],
      [lat + 0.0008, lng + 0.0006],
      [lat + 0.0022, lng + 0.0014],
      [lat - 0.0006, lng + 0.0024],
    ];

    // Determine styles based on telemetry layer
    let plot1Style: L.PolylineOptions & { tooltip: string } = {
      color: '#ffffff',
      weight: 1,
      fillColor: '#2D5A27',
      fillOpacity: 0.6,
      tooltip: 'Plot A: NDVI 0.81 (Healthy canopy, optimal nitrogen)'
    };

    let plot2Style: L.PolylineOptions & { tooltip: string } = {
      color: '#ffffff',
      weight: 1,
      fillColor: '#60965A',
      fillOpacity: 0.5,
      tooltip: 'Plot B: NDVI 0.64 (Moderate canopy development)'
    };

    let plot3Style: L.PolylineOptions & { tooltip: string } = {
      color: '#ffffff',
      weight: 1,
      fillColor: '#E9C46A',
      fillOpacity: 0.45,
      tooltip: 'Plot C: NDVI 0.41 (Stressed canopy or sparse growth)'
    };

    if (satelliteLayer === 'moisture') {
      plot1Style = {
        color: '#ffffff',
        weight: 1,
        fillColor: '#1D3557',
        fillOpacity: 0.55,
        tooltip: 'Plot A: Soil Moisture 74% (High hydration, well-irrigated)'
      };
      plot2Style = {
        color: '#ffffff',
        weight: 1,
        fillColor: '#4CC9F0',
        fillOpacity: 0.5,
        tooltip: 'Plot B: Soil Moisture 52% (Optimal moisture buffer)'
      };
      plot3Style = {
        color: '#ffffff',
        weight: 1,
        fillColor: '#F4A261',
        fillOpacity: 0.45,
        tooltip: 'Plot C: Soil Moisture 29% (Dry zone, priority irrigation needed)'
      };
    } else if (satelliteLayer === 'true-color') {
      // True Color represents raw satellite view with boundary overlays
      plot1Style = {
        color: '#F59E0B',
        weight: 2,
        fillColor: 'transparent',
        fillOpacity: 0,
        tooltip: `${activeFarmer.name}'s West Field Boundary`
      };
      plot2Style = {
        color: '#F59E0B',
        weight: 2,
        fillColor: 'transparent',
        fillOpacity: 0,
        tooltip: `${activeFarmer.name}'s North Field Boundary`
      };
      plot3Style = {
        color: '#F59E0B',
        weight: 2,
        fillColor: 'transparent',
        fillOpacity: 0,
        tooltip: `${activeFarmer.name}'s East Field Boundary`
      };
    }

    // Add plot polygons to the map
    [
      { coords: plot1Coords, style: plot1Style },
      { coords: plot2Coords, style: plot2Style },
      { coords: plot3Coords, style: plot3Style }
    ].forEach((p, idx) => {
      const poly = L.polygon(p.coords, {
        color: p.style.color,
        weight: p.style.weight,
        fillColor: p.style.fillColor,
        fillOpacity: p.style.fillOpacity,
        className: 'transition-all duration-300 hover:fill-opacity-70'
      });

      poly.bindTooltip(p.style.tooltip, {
        sticky: true,
        className: 'leaflet-tooltip-custom font-sans text-xs px-2.5 py-1.5 shadow-lg rounded-lg border-0 bg-[#1A2E1A] text-white font-semibold'
      });

      poly.addTo(polygonsGroup);
    });

    // Create a beautiful custom pulsing marker representing the active farm center point
    const customPulsingMarkerIcon = L.divIcon({
      html: `
        <div class="flex items-center justify-center w-[36px] h-[36px] relative">
          <span class="absolute w-[24px] h-[24px] rounded-full bg-[#E63946] opacity-60 animate-ping"></span>
          <span class="absolute w-[12px] h-[12px] rounded-full bg-[#E63946] border-2 border-white shadow-md"></span>
        </div>
      `,
      className: 'custom-satellite-marker',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    const marker = L.marker([lat, lng], { icon: customPulsingMarkerIcon });
    marker.bindTooltip(`
      <div class="text-xs p-1 font-sans">
        <p class="font-bold text-[#E63946]">${activeFarmer.name}'s Farm</p>
        <p class="text-[10px] text-gray-500">${activeFarmer.taluka}, ${activeFarmer.district}</p>
      </div>
    `, {
      direction: 'top',
      offset: [0, -10],
      className: 'leaflet-tooltip-custom font-sans shadow-md rounded border border-gray-200 bg-white font-medium text-gray-800'
    });

    marker.addTo(markerGroup);

  }, [activeFarmer, satelliteLayer]);

  return (
    <div className="w-full h-full relative" id="sentinel-satellite-map-root">
      {/* Actual Leaflet DOM element */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full z-0" 
        style={{ background: '#cbd5e1' }}
      />
    </div>
  );
}
