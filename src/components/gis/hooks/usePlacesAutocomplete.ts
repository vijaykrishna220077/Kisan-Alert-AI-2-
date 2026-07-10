import { useState, useCallback } from 'react';

// Highly relevant regional agricultural hubs in Coimbatore & Tamil Nadu for instant search/autocomplete fallbacks
const OFFLINE_AGRICULTURAL_SUGGESTIONS = [
  {
    place_id: "off-1",
    lat: 10.9372,
    lng: 76.9560,
    name: "Kuniyamuthur",
    address: "Kuniyamuthur, Coimbatore, Tamil Nadu, 641008",
    district: "Coimbatore",
    state: "Tamil Nadu",
    country: "India",
    postalCode: "641008"
  },
  {
    place_id: "off-2",
    lat: 11.0168,
    lng: 76.9558,
    name: "Coimbatore",
    address: "Coimbatore, Tamil Nadu, India",
    district: "Coimbatore",
    state: "Tamil Nadu",
    country: "India",
    postalCode: "641001"
  },
  {
    place_id: "off-3",
    lat: 11.789597,
    lng: 78.024539,
    name: "Edappadi",
    address: "Edappadi, Salem District, Tamil Nadu, India",
    district: "Salem",
    state: "Tamil Nadu",
    country: "India",
    postalCode: "637101"
  },
  {
    place_id: "off-4",
    lat: 11.6643,
    lng: 78.1460,
    name: "Salem",
    address: "Salem, Tamil Nadu, India",
    district: "Salem",
    state: "Tamil Nadu",
    country: "India",
    postalCode: "636001"
  },
  {
    place_id: "off-5",
    lat: 10.9250,
    lng: 76.9450,
    name: "Sugunapuram",
    address: "Sugunapuram, Kuniyamuthur, Coimbatore, Tamil Nadu, 641008",
    district: "Coimbatore",
    state: "Tamil Nadu",
    country: "India",
    postalCode: "641008"
  },
  {
    place_id: "off-6",
    lat: 11.4102,
    lng: 76.6950,
    name: "Ooty",
    address: "Ootacamund, Nilgiris District, Tamil Nadu, India",
    district: "Nilgiris",
    state: "Tamil Nadu",
    country: "India",
    postalCode: "643001"
  }
];

export function usePlacesAutocomplete() {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPredictions = useCallback(async (input: string) => {
    if (!input.trim() || input.trim().length < 2) {
      setPredictions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch from OpenStreetMap Nominatim with safety timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}&addressdetails=1&limit=6`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'KisanAlertAI/1.0'
        }
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`OSM HTTP error: ${res.status}`);
      }

      const results = await res.json();

      if (results && results.length > 0) {
        const mapped = results.map((r: any) => {
          const parts = r.display_name.split(',');
          const main_text = r.name || parts[0].trim();
          const secondary_text = parts.slice(1).join(',').trim();

          return {
            place_id: `osm-${r.place_id || Math.random().toString()}`,
            structured_formatting: {
              main_text,
              secondary_text
            },
            raw: r
          };
        });
        setPredictions(mapped);
      } else {
        // No network results, let's filter local suggestions as fallback
        const filtered = OFFLINE_AGRICULTURAL_SUGGESTIONS.filter(item => 
          item.name.toLowerCase().includes(input.toLowerCase()) ||
          item.address.toLowerCase().includes(input.toLowerCase())
        ).map(item => ({
          place_id: item.place_id,
          structured_formatting: {
            main_text: item.name,
            secondary_text: item.address
          },
          raw: {
            lat: String(item.lat),
            lon: String(item.lng),
            display_name: item.address,
            name: item.name,
            address: {
              county: item.district,
              state: item.state,
              country: item.country,
              postcode: item.postalCode
            }
          }
        }));
        setPredictions(filtered);
      }
    } catch (err: any) {
      console.warn("Nominatim Geocoding network failed or timed out. Switching to offline suggestions:", err);
      // Fallback to offline search suggestions
      const filtered = OFFLINE_AGRICULTURAL_SUGGESTIONS.filter(item => 
        item.name.toLowerCase().includes(input.toLowerCase()) ||
        item.address.toLowerCase().includes(input.toLowerCase())
      ).map(item => ({
        place_id: item.place_id,
        structured_formatting: {
          main_text: item.name,
          secondary_text: item.address
        },
        raw: {
          lat: String(item.lat),
          lon: String(item.lng),
          display_name: item.address,
          name: item.name,
          address: {
            county: item.district,
            state: item.state,
            country: item.country,
            postcode: item.postalCode
          }
        }
      }));
      setPredictions(filtered);
    } finally {
      setLoading(false);
    }
  }, []);

  const getDetails = useCallback(async (placeId: string): Promise<any> => {
    const pred = predictions.find(p => p.place_id === placeId);
    if (!pred) {
      throw new Error("No place prediction found matching id " + placeId);
    }

    const r = pred.raw;
    const address = r.address || {};
    
    // Parse address components logically from Nominatim
    const district = address.county || address.district || address.state_district || '';
    const state = address.state || '';
    const country = address.country || '';
    const postalCode = address.postcode || '';

    return {
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      address: r.display_name || '',
      name: r.name || r.display_name.split(',')[0],
      district,
      state,
      country,
      postalCode,
    };
  }, [predictions]);

  return {
    predictions,
    loading,
    error,
    fetchPredictions,
    getDetails,
    setPredictions
  };
}
