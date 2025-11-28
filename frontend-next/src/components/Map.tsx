'use client';
import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// WebGL support check
function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
}

export default function Map() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('Initializing...');

  useEffect(() => {
    if (!mapContainer.current) {
      setStatus('Error: No container element');
      return;
    }

    if (!isWebGLAvailable()) {
      setStatus('Error: WebGL not supported');
      return;
    }

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [38.7578, 9.0054],
      zoom: 12,
      attributionControl: false
    });

    map.on('load', () => setStatus('Map loaded successfully'));
    map.on('error', (e) => setStatus(`Error: ${e.error?.message || e.message || 'Unknown error'}`));

    map.on('sourcedata', (e) => {
      if (e.sourceId === 'osm') {
        setStatus(`Loading tiles: ${e.sourceId}`);
      }
    });

    return () => map.remove();
  }, []);

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <div 
        ref={mapContainer} 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#f0f0f0',
          cursor: 'pointer'
        }}
      />
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        background: 'white',
        padding: '8px',
        borderRadius: '4px',
        zIndex: 1,
        fontFamily: 'monospace'
      }}>
        {status}
      </div>
    </div>
  );
}
