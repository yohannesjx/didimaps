'use client';
import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function Map() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [debug, setDebug] = useState({
    webgl: false,
    container: false,
    mapCreated: false,
    error: null
  });

  useEffect(() => {
    // 1. Verify container
    if (!mapContainer.current) {
      setDebug(prev => ({...prev, error: 'NO_CONTAINER'}));
      return;
    }
    setDebug(prev => ({...prev, container: true}));

    // 2. Verify WebGL
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      setDebug(prev => ({...prev, error: 'NO_WEBGL'}));
      return;
    }
    setDebug(prev => ({...prev, webgl: true}));

    // 3. Create map
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [38.7578, 9.0054],
      zoom: 12
    });
    setDebug(prev => ({...prev, mapCreated: true}));

    // 4. Event handlers
    map.on('load', () => console.log('Map loaded'));
    map.on('error', (e) => {
      console.error('Map error:', e);
      setDebug(prev => ({...prev, error: e.error?.message || 'MAP_ERROR'}));
    });

    return () => map.remove();
  }, []);

  return (
    <div style={{ position: 'relative', height: '100vh' }}>
      {/* Map container */}
      <div ref={mapContainer} style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: debug.error ? '#ffdddd' : '#f0f0f0'
      }} />

      {/* Debug overlay */}
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        background: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontFamily: 'monospace',
        zIndex: 1000
      }}>
        <div style={{color: debug.container ? 'green' : 'red'}}>
          CONTAINER: {debug.container ? 'OK' : 'FAIL'}
        </div>
        <div style={{color: debug.webgl ? 'green' : 'red'}}>
          WEBGL: {debug.webgl ? 'OK' : debug.error === 'NO_WEBGL' ? 'FAIL' : 'CHECKING...'}
        </div>
        <div style={{color: debug.mapCreated ? 'green' : 'red'}}>
          MAP: {debug.mapCreated ? 'CREATED' : debug.error || 'INITIALIZING'}
        </div>
      </div>
    </div>
  );
}
