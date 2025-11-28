'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function Map() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  // Default to Addis Ababa, Ethiopia
  const [lng] = useState(38.7578);
  const [lat] = useState(8.9806);
  const [zoom] = useState(12);

  useEffect(() => {
    if (map.current) return; // initialize map only once
    if (!mapContainer.current) return;

    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: '/map-assets/style.json',
        center: [lng, lat],
        zoom: zoom,
        attributionControl: false,
      });

      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
      
      map.current.addControl(new maplibregl.GeolocateControl({
          positionOptions: {
              enableHighAccuracy: true
          },
          trackUserLocation: true
      }), 'top-right');

      map.current.addControl(new maplibregl.AttributionControl({
          customAttribution: '<a href="https://openmaptiles.org/" target="_blank">&copy; OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>'
      }), 'bottom-right');

      // Debugging: Log when style loads or errors
      map.current.on('style.load', () => {
        console.log('Map style loaded successfully');
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
      });

    } catch (error) {
      console.error('Error initializing map:', error);
    }

  }, [lng, lat, zoom]);

  return (
    <div className="relative w-full h-full min-h-screen bg-gray-100">
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
}
