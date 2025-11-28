'use client';

import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapStore } from '@/lib/store';
import { api } from '@/lib/api';
import polyline from '@mapbox/polyline';

export default function Map() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const routeLayerAdded = useRef(false);

  const {
    center,
    zoom,
    setCenter,
    setZoom,
    theme,
    businesses,
    setBusinesses,
    setSelectedBusiness,
    userLocation,
    setUserLocation,
    routeGeometry,
    selectedCategory,
  } = useMapStore();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    console.log('Initializing map...');

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      // Use server-provided TileJSON style to ensure tiles render correctly
      style: 'https://maps.didi.et/api/tiles/json?tileset=addis',
      center: center,
      zoom: zoom,
      attributionControl: false,
    });

    // Surface MapLibre errors to the browser console
    map.current.on('error', (e) => {
      console.error('MapLibre error:', e.error || e);
    });

    map.current.on('load', () => {
      console.log('Map style loaded');
    });

    // Add navigation controls
    map.current.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'bottom-right'
    );

    // Add geolocate control
    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    });
    map.current.addControl(geolocate, 'bottom-right');

    geolocate.on('geolocate', (e: GeolocationPosition) => {
      setUserLocation([e.coords.longitude, e.coords.latitude]);
    });

    // Update store on move
    map.current.on('moveend', () => {
      if (!map.current) return;
      const c = map.current.getCenter();
      setCenter([c.lng, c.lat]);
      setZoom(map.current.getZoom());
      
      // Fetch nearby businesses when map moves
      fetchNearbyBusinesses(c.lat, c.lng);
    });

    // Initial fetch
    const c = map.current.getCenter();
    console.log('Map initialized at center:', c.lat, c.lng, 'zoom:', map.current.getZoom());
    fetchNearbyBusinesses(c.lat, c.lng);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Fetch nearby businesses
  const fetchNearbyBusinesses = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await api.getNearbyBusinesses(lat, lng, 2000, selectedCategory || undefined);
      setBusinesses(res.businesses || []);
    } catch (err) {
      console.error('Failed to fetch businesses:', err);
    }
  }, [selectedCategory, setBusinesses]);

  // Update style when theme changes
  useEffect(() => {
    // For now we use a single style URL; theme only affects overlays/markers.
    if (!map.current) return;
  }, [theme]);

  // Update markers when businesses change
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add new markers
    businesses.forEach((biz) => {
      const el = document.createElement('div');
      el.className = 'business-marker';
      el.innerHTML = `
        <div class="marker-pin ${theme === 'dark' ? 'dark' : ''}">
          <span class="marker-icon">${getCategoryIcon(biz.category?.icon)}</span>
        </div>
      `;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([biz.lng, biz.lat])
        .addTo(map.current!);

      el.addEventListener('click', () => {
        setSelectedBusiness(biz);
        map.current?.flyTo({ center: [biz.lng, biz.lat], zoom: 16 });
      });

      markersRef.current.push(marker);
    });
  }, [businesses, theme, setSelectedBusiness]);

  // Update user location marker
  useEffect(() => {
    if (!map.current || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat(userLocation);
    } else {
      const el = document.createElement('div');
      el.className = 'user-marker';
      el.innerHTML = `
        <div class="user-dot">
          <div class="user-dot-inner"></div>
          <div class="user-dot-pulse"></div>
        </div>
      `;

      userMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat(userLocation)
        .addTo(map.current);
    }
  }, [userLocation]);

  // Draw route
  useEffect(() => {
    if (!map.current) return;

    // Remove existing route layer
    if (routeLayerAdded.current) {
      if (map.current.getLayer('route')) {
        map.current.removeLayer('route');
      }
      if (map.current.getSource('route')) {
        map.current.removeSource('route');
      }
      routeLayerAdded.current = false;
    }

    if (!routeGeometry) return;

    // Decode polyline
    const decoded = polyline.decode(routeGeometry);
    const coordinates = decoded.map(([lat, lng]: [number, number]) => [lng, lat]);

    map.current.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates,
        },
      },
    });

    map.current.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': theme === 'dark' ? '#e94560' : '#4A90D9',
        'line-width': 5,
        'line-opacity': 0.8,
      },
    });

    routeLayerAdded.current = true;

    // Fit bounds to route
    if (coordinates.length > 0) {
      const firstCoord: [number, number] = [coordinates[0][0], coordinates[0][1]];
      const bounds = coordinates.reduce(
        (bounds: maplibregl.LngLatBounds, coord: number[]) => 
          bounds.extend([coord[0], coord[1]] as [number, number]),
        new maplibregl.LngLatBounds(firstCoord, firstCoord)
      );
      map.current.fitBounds(bounds, { padding: 80 });
    }
  }, [routeGeometry, theme]);

  // Refetch when category changes
  useEffect(() => {
    if (!map.current) return;
    const c = map.current.getCenter();
    fetchNearbyBusinesses(c.lat, c.lng);
  }, [selectedCategory, fetchNearbyBusinesses]);

  return (
    <>
      <div ref={mapContainer} className="absolute inset-0" />
      <style jsx global>{`
        .business-marker {
          cursor: pointer;
        }
        .marker-pin {
          width: 36px;
          height: 36px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          border: 2px solid #4A90D9;
          transition: transform 0.2s;
        }
        .marker-pin:hover {
          transform: scale(1.1);
        }
        .marker-pin.dark {
          background: #1a1a2e;
          border-color: #e94560;
        }
        .marker-icon {
          font-size: 16px;
        }
        .user-marker {
          pointer-events: none;
        }
        .user-dot {
          position: relative;
          width: 20px;
          height: 20px;
        }
        .user-dot-inner {
          position: absolute;
          inset: 4px;
          background: #4A90D9;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .user-dot-pulse {
          position: absolute;
          inset: 0;
          background: rgba(74, 144, 217, 0.3);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .maplibregl-ctrl-logo,
        .maplibregl-ctrl-attrib {
          display: none !important;
        }
      `}</style>
    </>
  );
}

function getCategoryIcon(icon?: string): string {
  const icons: Record<string, string> = {
    utensils: '🍽️',
    coffee: '☕',
    bed: '🏨',
    'shopping-bag': '🛍️',
    landmark: '🏦',
    hospital: '🏥',
    pill: '💊',
    fuel: '⛽',
    dumbbell: '💪',
    scissors: '✂️',
    'graduation-cap': '🎓',
    church: '⛪',
    moon: '🕌',
    store: '🏪',
    music: '🎵',
  };
  return icons[icon || ''] || '📍';
}
