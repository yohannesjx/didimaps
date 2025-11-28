import type { StyleSpecification } from 'maplibre-gl';

// Default to API tiles path (no auth); can be overridden via NEXT_PUBLIC_TILE_URL
const TILE_URL = process.env.NEXT_PUBLIC_TILE_URL || 'https://maps.didi.et/api/tiles/{z}/{x}/{y}.pbf';
const GLYPHS_URL = 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf';

export const lightStyle: StyleSpecification = {
  version: 8,
  name: 'Didi Maps Light',
  glyphs: GLYPHS_URL,
  sources: {
    'osm-tiles': {
      type: 'vector',
      tiles: [TILE_URL],
      maxzoom: 14,
    },
  },
  layers: [
    // Background
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#f8f9fa' },
    },
    // Water
    {
      id: 'water',
      type: 'fill',
      source: 'osm-tiles',
      'source-layer': 'water',
      paint: { 'fill-color': '#c9e4f6' },
    },
    // Landuse
    {
      id: 'landuse-park',
      type: 'fill',
      source: 'osm-tiles',
      'source-layer': 'landuse',
      filter: ['in', 'class', 'park', 'grass', 'cemetery'],
      paint: { 'fill-color': '#e8f5e9' },
    },
    {
      id: 'landuse-residential',
      type: 'fill',
      source: 'osm-tiles',
      'source-layer': 'landuse',
      filter: ['==', 'class', 'residential'],
      paint: { 'fill-color': '#f5f5f5' },
    },
    // Buildings
    {
      id: 'buildings',
      type: 'fill',
      source: 'osm-tiles',
      'source-layer': 'building',
      minzoom: 13,
      paint: {
        'fill-color': '#e0e0e0',
        'fill-outline-color': '#d0d0d0',
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0, 15, 0.9],
      },
    },
    // Roads - casing first
    {
      id: 'roads-motorway-casing',
      type: 'line',
      source: 'osm-tiles',
      'source-layer': 'transportation',
      filter: ['in', 'class', 'motorway', 'trunk'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#bdbdbd',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 3, 18, 20],
      },
    },
    {
      id: 'roads-primary-casing',
      type: 'line',
      source: 'osm-tiles',
      'source-layer': 'transportation',
      filter: ['==', 'class', 'primary'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#bdbdbd',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 18, 14],
      },
    },
    // Roads - fill
    {
      id: 'roads-motorway',
      type: 'line',
      source: 'osm-tiles',
      'source-layer': 'transportation',
      filter: ['in', 'class', 'motorway', 'trunk'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#ffffff',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 18, 16],
      },
    },
    {
      id: 'roads-primary',
      type: 'line',
      source: 'osm-tiles',
      'source-layer': 'transportation',
      filter: ['==', 'class', 'primary'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#ffffff',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.5, 18, 10],
      },
    },
    {
      id: 'roads-secondary',
      type: 'line',
      source: 'osm-tiles',
      'source-layer': 'transportation',
      filter: ['==', 'class', 'secondary'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#ffffff',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 18, 8],
      },
    },
    {
      id: 'roads-minor',
      type: 'line',
      source: 'osm-tiles',
      'source-layer': 'transportation',
      filter: ['in', 'class', 'minor', 'service', 'residential', 'tertiary'],
      minzoom: 12,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#ffffff',
        'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.5, 18, 6],
      },
    },
    // Labels
    {
      id: 'road-labels',
      type: 'symbol',
      source: 'osm-tiles',
      'source-layer': 'transportation_name',
      minzoom: 13,
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 11,
        'symbol-placement': 'line',
        'text-font': ['Open Sans Regular'],
      },
      paint: {
        'text-color': '#666666',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5,
      },
    },
    {
      id: 'place-labels',
      type: 'symbol',
      source: 'osm-tiles',
      'source-layer': 'place',
      layout: {
        'text-field': ['get', 'name'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 10, 12, 14, 16],
        'text-font': ['Open Sans Bold'],
      },
      paint: {
        'text-color': '#333333',
        'text-halo-color': '#ffffff',
        'text-halo-width': 2,
      },
    },
  ],
};

export const darkStyle: StyleSpecification = {
  version: 8,
  name: 'Didi Maps Dark',
  glyphs: GLYPHS_URL,
  sources: {
    'osm-tiles': {
      type: 'vector',
      tiles: [TILE_URL],
      maxzoom: 14,
    },
  },
  layers: [
    // Background
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#1a1a2e' },
    },
    // Water
    {
      id: 'water',
      type: 'fill',
      source: 'osm-tiles',
      'source-layer': 'water',
      paint: { 'fill-color': '#0f3460' },
    },
    // Landuse
    {
      id: 'landuse-park',
      type: 'fill',
      source: 'osm-tiles',
      'source-layer': 'landuse',
      filter: ['in', 'class', 'park', 'grass', 'cemetery'],
      paint: { 'fill-color': '#1e3a2f' },
    },
    {
      id: 'landuse-residential',
      type: 'fill',
      source: 'osm-tiles',
      'source-layer': 'landuse',
      filter: ['==', 'class', 'residential'],
      paint: { 'fill-color': '#16213e' },
    },
    // Buildings
    {
      id: 'buildings',
      type: 'fill',
      source: 'osm-tiles',
      'source-layer': 'building',
      minzoom: 13,
      paint: {
        'fill-color': '#0f0f23',
        'fill-outline-color': '#2a2a4a',
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0, 15, 0.9],
      },
    },
    // Roads - casing
    {
      id: 'roads-motorway-casing',
      type: 'line',
      source: 'osm-tiles',
      'source-layer': 'transportation',
      filter: ['in', 'class', 'motorway', 'trunk'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#0f3460',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 3, 18, 20],
      },
    },
    // Roads - fill
    {
      id: 'roads-motorway',
      type: 'line',
      source: 'osm-tiles',
      'source-layer': 'transportation',
      filter: ['in', 'class', 'motorway', 'trunk'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#e94560',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 18, 16],
      },
    },
    {
      id: 'roads-primary',
      type: 'line',
      source: 'osm-tiles',
      'source-layer': 'transportation',
      filter: ['==', 'class', 'primary'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#4a5568',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.5, 18, 10],
      },
    },
    {
      id: 'roads-secondary',
      type: 'line',
      source: 'osm-tiles',
      'source-layer': 'transportation',
      filter: ['==', 'class', 'secondary'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#3a3a5c',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 18, 8],
      },
    },
    {
      id: 'roads-minor',
      type: 'line',
      source: 'osm-tiles',
      'source-layer': 'transportation',
      filter: ['in', 'class', 'minor', 'service', 'residential', 'tertiary'],
      minzoom: 12,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#2a2a4a',
        'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.5, 18, 6],
      },
    },
    // Labels
    {
      id: 'road-labels',
      type: 'symbol',
      source: 'osm-tiles',
      'source-layer': 'transportation_name',
      minzoom: 13,
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 11,
        'symbol-placement': 'line',
        'text-font': ['Open Sans Regular'],
      },
      paint: {
        'text-color': '#a0a0b0',
        'text-halo-color': '#1a1a2e',
        'text-halo-width': 1.5,
      },
    },
    {
      id: 'place-labels',
      type: 'symbol',
      source: 'osm-tiles',
      'source-layer': 'place',
      layout: {
        'text-field': ['get', 'name'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 10, 12, 14, 16],
        'text-font': ['Open Sans Bold'],
      },
      paint: {
        'text-color': '#e0e0f0',
        'text-halo-color': '#1a1a2e',
        'text-halo-width': 2,
      },
    },
  ],
};
