import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './Map.css';
import { decodePolyline } from '../utils/polyline';

const getStyle = (mode) => {
    if (mode === 'satellite') {
        return {
            version: 8,
            sources: {
                satellite: {
                    type: 'raster',
                    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
                    tileSize: 256,
                    attribution: 'Esri',
                    maxzoom: 18
                },
                openmaptiles: {
                    type: 'vector',
                    tiles: [window.location.origin + '/api/tiles/{z}/{x}/{y}.pbf'],
                    minzoom: 0,
                    maxzoom: 14,
                }
            },
            layers: [
                {
                    id: 'satellite',
                    type: 'raster',
                    source: 'satellite',
                    paint: { 'raster-opacity': 1 }
                },
                {
                    id: 'roads',
                    type: 'line',
                    source: 'openmaptiles',
                    'source-layer': 'transportation',
                    paint: { 'line-color': '#ffffff', 'line-width': 1, 'line-opacity': 0.6 }
                },
                {
                    id: '3d-buildings',
                    source: 'openmaptiles',
                    'source-layer': 'building',
                    type: 'fill-extrusion',
                    minzoom: 13,
                    paint: {
                        'fill-extrusion-color': '#ffffff',
                        'fill-extrusion-height': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            13,
                            0,
                            13.05,
                            ['get', 'render_height']
                        ],
                        'fill-extrusion-base': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            13,
                            0,
                            13.05,
                            ['get', 'render_min_height']
                        ],
                        'fill-extrusion-opacity': 0.2
                    },
                },
            ]
        };
    }

    const isDark = mode === 'dark';
    return {
        version: 8,
        sources: {
            openmaptiles: {
                type: 'vector',
                tiles: [window.location.origin + '/api/tiles/{z}/{x}/{y}.pbf'],
                minzoom: 0,
                maxzoom: 14,
            },
        },
        layers: [
            {
                id: 'background',
                type: 'background',
                paint: { 'background-color': isDark ? '#0c0c0c' : '#f8f9fa' },
            },
            {
                id: 'water',
                type: 'fill',
                source: 'openmaptiles',
                'source-layer': 'water',
                paint: { 'fill-color': isDark ? '#1b1b1d' : '#aadaff' },
            },
            {
                id: 'landcover',
                type: 'fill',
                source: 'openmaptiles',
                'source-layer': 'landcover',
                paint: { 'fill-color': isDark ? '#2a2a2a' : '#e6e6e6', 'fill-opacity': 0.4 },
            },
            {
                id: 'roads',
                type: 'line',
                source: 'openmaptiles',
                'source-layer': 'transportation',
                paint: { 'line-color': isDark ? '#3a3a3a' : '#ffffff', 'line-width': 2 },
            },
            {
                id: '3d-buildings',
                source: 'openmaptiles',
                'source-layer': 'building',
                type: 'fill-extrusion',
                minzoom: 13,
                paint: {
                    'fill-extrusion-color': isDark ? '#333' : '#d1d1d1',
                    'fill-extrusion-height': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        13,
                        0,
                        13.05,
                        ['get', 'render_height']
                    ],
                    'fill-extrusion-base': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        13,
                        0,
                        13.05,
                        ['get', 'render_min_height']
                    ],
                    'fill-extrusion-opacity': 0.8
                },
            },
        ],
    };
};

export default function Map({ selectedBusiness, businesses, onMarkerClick, directionsDestination, userLocation, isSidebarVisible, onMapMove }) {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const markers = useRef([]);
    const userMarkerRef = useRef(null);
    const [styleMode, setStyleMode] = useState('dark');
    const [is3D, setIs3D] = useState(true);
    const [showLayerMenu, setShowLayerMenu] = useState(false);

    useEffect(() => {
        if (map.current) return; // Initialize map only once

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: getStyle('dark'),
            center: [38.7578, 8.9806], // Addis Ababa
            zoom: 15,
            maxZoom: 18, // Limit max zoom
            pitch: 45,
            // Initial padding: 360px left for desktop, 0 for mobile
            padding: { left: window.innerWidth > 768 ? 360 : 0 },
            attributionControl: false, // Hide default attribution
        });

        // Add navigation controls (Zoom in/out) to bottom-right
        map.current.addControl(new maplibregl.NavigationControl(), 'bottom-right');

        // Handle window resize to adjust padding dynamically
        const handleResize = () => {
            if (map.current) {
                const isDesktop = window.innerWidth > 768;
                map.current.easeTo({
                    padding: { left: (isDesktop && isSidebarVisible) ? 360 : 0 },
                    duration: 300
                });
            }
        };
        window.addEventListener('resize', handleResize);

        // Track map movement
        map.current.on('move', () => {
            if (onMapMove) {
                const center = map.current.getCenter();
                onMapMove({ lat: center.lat, lng: center.lng });
            }
        });

        // Update padding when sidebar visibility changes
        if (map.current) {
            const isDesktop = window.innerWidth > 768;
            map.current.easeTo({
                padding: { left: (isDesktop && isSidebarVisible) ? 360 : 0 },
                duration: 300
            });
        }

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, []);

    // Update User Marker
    useEffect(() => {
        if (!map.current || !userLocation) return;

        if (!userMarkerRef.current) {
            const el = document.createElement('div');
            el.className = 'user-marker';
            userMarkerRef.current = new maplibregl.Marker(el)
                .setLngLat([userLocation.lng, userLocation.lat])
                .addTo(map.current);
        } else {
            userMarkerRef.current.setLngLat([userLocation.lng, userLocation.lat]);
        }
    }, [userLocation]);

    // Update padding when sidebar visibility changes
    useEffect(() => {
        if (map.current) {
            const isDesktop = window.innerWidth > 768;
            map.current.easeTo({
                padding: { left: (isDesktop && isSidebarVisible) ? 360 : 0 },
                duration: 300
            });
        }
    }, [isSidebarVisible]);

    // Update markers when businesses change
    useEffect(() => {
        if (!map.current || !businesses) return;

        // Clear existing markers
        markers.current.forEach(m => m.remove());
        markers.current = [];

        // Add new markers
        businesses.forEach((business) => {
            const el = document.createElement('div');
            el.className = 'business-marker';
            el.innerHTML = '📍';
            el.style.fontSize = '28px';
            el.style.cursor = 'pointer';
            el.style.transition = 'transform 0.2s';

            el.addEventListener('mouseenter', () => {
                el.style.transform = 'scale(1.2)';
            });

            el.addEventListener('mouseleave', () => {
                el.style.transform = 'scale(1)';
            });

            const popup = new maplibregl.Popup({ offset: 25 })
                .setHTML(`
          <div style="padding: 8px;">
            <strong style="font-size: 14px;">${business.name}</strong><br/>
            <span style="font-size: 12px; color: #666;">${business.category?.name || business.category}</span>
          </div>
        `);

            const marker = new maplibregl.Marker(el)
                .setLngLat([business.lng, business.lat])
                .setPopup(popup)
                .addTo(map.current);

            el.addEventListener('click', () => {
                onMarkerClick(business);
            });

            markers.current.push(marker);
        });
    }, [businesses, onMarkerClick]);

    // Fly to selected business
    useEffect(() => {
        if (!map.current || !selectedBusiness) return;

        map.current.flyTo({
            center: [selectedBusiness.lng, selectedBusiness.lat],
            zoom: 15,
            duration: 1500,
        });
    }, [selectedBusiness]);

    // Draw route when directions destination is set
    useEffect(() => {
        if (!map.current) return;

        // Remove existing route if any
        if (map.current.getSource('route')) {
            map.current.removeLayer('route');
            map.current.removeSource('route');
        }

        if (directionsDestination && userLocation) {
            const fetchRoute = async () => {
                try {
                    const res = await fetch(`/api/route?from=${userLocation.lat},${userLocation.lng}&to=${directionsDestination.lat},${directionsDestination.lng}`);
                    if (!res.ok) throw new Error('Route fetch failed');
                    const data = await res.json();

                    if (data.routes && data.routes.length > 0) {
                        const geometry = data.routes[0].geometry;
                        const coordinates = decodePolyline(geometry);

                        // Fix visual gap by connecting to exact start/end points
                        if (coordinates.length > 0) {
                            coordinates.unshift([userLocation.lng, userLocation.lat]);
                            coordinates.push([directionsDestination.lng, directionsDestination.lat]);
                        }

                        const routeGeoJSON = {
                            type: 'Feature',
                            properties: {},
                            geometry: {
                                type: 'LineString',
                                coordinates: coordinates
                            }
                        };

                        map.current.addSource('route', {
                            type: 'geojson',
                            data: routeGeoJSON
                        });

                        map.current.addLayer({
                            id: 'route',
                            type: 'line',
                            source: 'route',
                            layout: {
                                'line-join': 'round',
                                'line-cap': 'round'
                            },
                            paint: {
                                'line-color': '#4285f4',
                                'line-width': 6,
                                'line-opacity': 0.8
                            }
                        });

                        // Fit bounds
                        const bounds = new maplibregl.LngLatBounds();
                        coordinates.forEach(coord => bounds.extend(coord));
                        map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
                    }
                } catch (err) {
                    console.error('Routing error:', err);
                }
            };

            fetchRoute();
        }
    }, [directionsDestination, userLocation]);

    const hasCenteredRef = useRef(false);

    // Auto-center on user location when first detected
    useEffect(() => {
        if (userLocation && map.current && !hasCenteredRef.current) {
            map.current.flyTo({
                center: [userLocation.lng, userLocation.lat],
                zoom: 15,
                pitch: 45,
                duration: 2000
            });
            hasCenteredRef.current = true;
        }
    }, [userLocation]);

    const handleLocateMe = () => {
        if (userLocation && map.current) {
            map.current.flyTo({
                center: [userLocation.lng, userLocation.lat],
                zoom: 17,
                pitch: is3D ? 50 : 0,
                duration: 2000
            });
        }
    };

    const toggle3D = () => {
        const nextState = !is3D;
        setIs3D(nextState);
        if (map.current) {
            map.current.easeTo({
                pitch: nextState ? 60 : 0,
                duration: 1000
            });
        }
    };

    const changeStyle = (mode) => {
        setStyleMode(mode);
        setShowLayerMenu(false);
        if (map.current) {
            map.current.setStyle(getStyle(mode));
        }
    };

    return (
        <div className="map-wrapper" style={{ position: 'relative', width: '100%', height: '100vh' }}>
            <div ref={mapContainer} className="map-container" />

            {/* Top Right Controls */}
            <div style={{ position: 'absolute', top: '20px', right: '10px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Layer Switcher */}
                <div style={{ position: 'relative' }}>
                    <button
                        className="map-control-btn"
                        onClick={() => setShowLayerMenu(!showLayerMenu)}
                        title="Layers"
                        style={{ width: '40px', height: '40px', background: 'white', border: 'none', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', cursor: 'pointer', fontSize: '20px' }}
                    >
                        🗺️
                    </button>
                    {showLayerMenu && (
                        <div className="layer-menu" style={{
                            position: 'absolute', top: '0', right: '50px',
                            background: 'white', padding: '8px', borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px'
                        }}>
                            <div onClick={() => changeStyle('dark')} style={{ padding: '8px', cursor: 'pointer', borderRadius: '4px', background: styleMode === 'dark' ? '#f0f0f0' : 'transparent' }}>🌑 Dark</div>
                            <div onClick={() => changeStyle('light')} style={{ padding: '8px', cursor: 'pointer', borderRadius: '4px', background: styleMode === 'light' ? '#f0f0f0' : 'transparent' }}>☀️ Light</div>
                            <div onClick={() => changeStyle('satellite')} style={{ padding: '8px', cursor: 'pointer', borderRadius: '4px', background: styleMode === 'satellite' ? '#f0f0f0' : 'transparent' }}>🛰️ Satellite</div>
                        </div>
                    )}
                </div>

                {/* 3D Toggle */}
                <button
                    className="map-control-btn"
                    onClick={toggle3D}
                    title="Toggle 2D/3D"
                    style={{ width: '40px', height: '40px', background: 'white', border: 'none', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
                >
                    {is3D ? '2D' : '3D'}
                </button>
            </div>

            {/* Locate Me Button */}
            <button
                className="map-control-btn"
                onClick={handleLocateMe}
                style={{
                    position: 'absolute',
                    bottom: '110px', // Positioned above zoom controls
                    right: '10px',
                    zIndex: 10,
                    background: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    width: '29px',
                    height: '29px',
                    boxShadow: '0 0 0 2px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px'
                }}
                title="Locate Me"
            >
                🎯
            </button>
        </div>
    );
}
