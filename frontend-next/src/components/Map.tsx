'use client';
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function Map() {
  const mapContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [38.7578, 9.0054],
      zoom: 12,
      attributionControl: false
    });

    // Preserve hand cursor behavior
    map.on('load', () => {
      const canvas = map.getCanvasContainer();
      canvas.style.cursor = 'pointer'; // Force hand cursor
    });

    return () => map.remove();
  }, []);

  return (
    <div 
      ref={mapContainer} 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'red',
        cursor: 'pointer' // Ensures hand cursor even during load
      }}
    />
  );
}
