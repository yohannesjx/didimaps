'use client';
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function Map() {
  const mapContainer = useRef(null);

  useEffect(() => {
    if (!mapContainer.current) {
      console.error('FATAL: Map container not found');
      return;
    }

    console.log('FINAL DEBUG - Container dimensions:', {
      width: mapContainer.current.offsetWidth,
      height: mapContainer.current.offsetHeight
    });

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [38.7578, 9.0054],
      zoom: 12
    });

    map.on('load', () => console.log('FINAL DEBUG - Map loaded'));
    map.on('error', (e) => console.error('FINAL DEBUG - Map error:', e));

    return () => map.remove();
  }, []);

  return <div ref={mapContainer} style={{
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'red'
  }} />;
}
