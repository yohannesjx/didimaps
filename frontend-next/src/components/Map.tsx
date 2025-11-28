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

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (map.current) return; // initialize map only once
    if (!mapContainer.current) return;

    const initializeMap = async () => {
      try {
        setLoading(true);
        // Fetch the style JSON manually
        const response = await fetch('/map-assets/style.json');
        if (!response.ok) {
          throw new Error(`Failed to load style: ${response.status} ${response.statusText}`);
        }
        const style = await response.json();

        // Resolve absolute URL for sprites and glyphs
        const origin = window.location.origin;
        if (style.sprite && style.sprite.startsWith('/')) {
          style.sprite = `${origin}${style.sprite}`;
        }
        if (style.glyphs && style.glyphs.startsWith('/')) {
          style.glyphs = `${origin}${style.glyphs}`;
        }

        // Resolve absolute URL for sources
        Object.keys(style.sources).forEach((sourceKey) => {
          const source = style.sources[sourceKey];
          if (source.tiles) {
            source.tiles = source.tiles.map((t: string) => t.startsWith('/') ? `${origin}${t}` : t);
          }
        });

        map.current = new maplibregl.Map({
          container: mapContainer.current!,
          style: style, // Pass the modified style object
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

        map.current.on('style.load', () => {
          console.log('Map style loaded successfully');
          setLoading(false);
        });

        map.current.on('error', (e) => {
          console.error('Map error:', e);
          setError(`Map error: ${e.error?.message || 'Unknown error'}`);
        });

      } catch (err: any) {
        console.error('Error initializing map:', err);
        setError(err.message || 'Failed to initialize map');
        setLoading(false);
      }
    };

    initializeMap();

  }, [lng, lat, zoom]);

  return (
    <div className="relative w-full h-full min-h-screen bg-gray-100">
      {error && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-red-100 bg-opacity-90">
          <div className="p-4 bg-white rounded shadow-lg">
            <h3 className="text-red-600 font-bold">Error Loading Map</h3>
            <p className="text-gray-700">{error}</p>
          </div>
        </div>
      )}
      {loading && !error && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-white">Loading Map...</div>
        </div>
      )}
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
}
