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
                {
                    id: 'place-label',
                    type: 'symbol',
                    source: 'openmaptiles',
                    'source-layer': 'place',
                    minzoom: 10,
                    layout: {
                        'text-field': '{name:latin}',
                        'text-font': ['Noto Sans Regular'],
                        'text-size': 14,
                        'text-anchor': 'center'
                    },
                    paint: {
                        'text-color': '#ffffff',
                        'text-halo-color': '#000000',
                        'text-halo-width': 2
                    }
                },
                {
                    id: 'poi-label',
                    type: 'symbol',
                    source: 'openmaptiles',
                    'source-layer': 'poi',
                    minzoom: 14,
                    layout: {
                        'text-field': '{name:latin}',
                        'text-font': ['Noto Sans Regular'],
                        'text-size': 11,
                        'text-anchor': 'top',
                        'text-offset': [0, 0.5]
                    },
                    paint: {
                        'text-color': '#cccccc',
                        'text-halo-color': '#000000',
                        'text-halo-width': 1
                    }
                },
            ]
        };
    }

    const isDark = mode === 'dark';

    // Yandex-like Colors
    // Enhanced Vibrant Colors
    const colors = {
        background: isDark ? '#0c0c0c' : '#F3F4F6', // Cleaner grey-blueish white
        water: isDark ? '#1b1b1d' : '#89CFF0',       // Vibrant blue
        landcover: isDark ? '#2a2a2a' : '#E8F5E9',   // Light green tint
        park: isDark ? '#2a2a2a' : '#A5D6A7',        // Vibrant green
        road: isDark ? '#3a3a3a' : '#FFFFFF',        // White
        roadBorder: isDark ? '#222' : '#CFD8DC',     // Blue-grey border
        text: isDark ? '#ffffff' : '#333333',
        textHalo: isDark ? '#000000' : '#ffffff'
    };

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
                paint: { 'background-color': colors.background },
            },
            {
                id: 'water',
                type: 'fill',
                source: 'openmaptiles',
                'source-layer': 'water',
                paint: { 'fill-color': colors.water },
            },
            {
                id: 'landcover',
                type: 'fill',
                source: 'openmaptiles',
                'source-layer': 'landcover',
                paint: { 'fill-color': colors.landcover },
            },
            {
                id: 'landuse', // Parks etc
                type: 'fill',
                source: 'openmaptiles',
                'source-layer': 'landuse',
                paint: { 'fill-color': colors.park },
                filter: ['==', 'class', 'park']
            },
            {
                id: 'roads-casing',
                type: 'line',
                source: 'openmaptiles',
                'source-layer': 'transportation',
                paint: {
                    'line-color': colors.roadBorder,
                    'line-width': { base: 1.2, stops: [[13, 3], [14, 4], [20, 18]] }
                },
            },
            {
                id: 'roads',
                type: 'line',
                source: 'openmaptiles',
                'source-layer': 'transportation',
                paint: {
                    'line-color': colors.road,
                    'line-width': { base: 1.2, stops: [[13, 1.5], [14, 2.5], [20, 14]] }
                },
            },
            {
                id: '3d-buildings',
                source: 'openmaptiles',
                'source-layer': 'building',
                type: 'fill-extrusion',
                minzoom: 13,
                paint: {
                    'fill-extrusion-color': isDark ? '#333' : '#e8e8e8',
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
                    'fill-extrusion-opacity': 0.9
                },
            },
            {
                id: 'place-label',
                type: 'symbol',
                source: 'openmaptiles',
                'source-layer': 'place',
                minzoom: 10,
                layout: {
                    'text-field': '{name:latin}',
                    'text-font': ['Noto Sans Regular'],
                    'text-size': 14,
                    'text-anchor': 'center'
                },
                paint: {
                    'text-color': colors.text,
                    'text-halo-color': colors.textHalo,
                    'text-halo-width': 2
                }
            },
            {
                id: 'poi-label',
                type: 'symbol',
                source: 'openmaptiles',
                'source-layer': 'poi',
                minzoom: 14,
                layout: {
                    'text-field': [
                        'format',
                        ['match', ['get', 'class'],
                            'restaurant', '🍴 ',
                            'fast_food', '🍔 ',
                            'cafe', '☕ ',
                            'bar', '🍸 ',
                            'bank', '🏦 ',
                            'hotel', '🏨 ',
                            'hospital', '🏥 ',
                            'school', '🎓 ',
                            'shop', '🛍️ ',
                            'grocery', '🛒 ',
                            'park', '🌳 ',
                            ''
                        ],
                        { 'font-scale': 1.2 },
                        ['get', 'name:latin'],
                        {}
                    ],
                    'text-font': ['Noto Sans Regular'],
                    'text-size': 12,
                    'text-anchor': 'top',
                    'text-offset': [0, 0.5]
                },
                paint: {
                    'text-color': isDark ? '#cccccc' : '#555555',
                    'text-halo-color': colors.textHalo,
                    'text-halo-width': 1
                }
            },
        ],
    };
};

const getCategoryIcon = (category) => {
    if (!category) return '📍';
    const cat = category.toLowerCase();
    if (cat.includes('restaurant') || cat.includes('food') || cat.includes('dining') || cat.includes('burger') || cat.includes('pizza')) return '🍴';
    if (cat.includes('cafe') || cat.includes('coffee') || cat.includes('tea')) return '☕';
    if (cat.includes('hotel') || cat.includes('lodging') || cat.includes('guest')) return '🏨';
    if (cat.includes('bank') || cat.includes('atm') || cat.includes('finance')) return '🏦';
    if (cat.includes('gas') || cat.includes('fuel') || cat.includes('oil')) return '⛽';
    if (cat.includes('hospital') || cat.includes('clinic') || cat.includes('pharmacy') || cat.includes('doctor')) return '🏥';
    if (cat.includes('school') || cat.includes('university') || cat.includes('education') || cat.includes('college')) return '🎓';
    if (cat.includes('shop') || cat.includes('store') || cat.includes('mall') || cat.includes('market')) return '🛍️';
    if (cat.includes('gym') || cat.includes('fitness') || cat.includes('sport')) return '💪';
    if (cat.includes('park') || cat.includes('garden')) return '🌳';
    if (cat.includes('bar') || cat.includes('club') || cat.includes('pub')) return '🍸';
    if (cat.includes('movie') || cat.includes('cinema') || cat.includes('theater')) return '🎬';
    return '📍';
};

export default function Map({ selectedBusiness, businesses, onMarkerClick, directionsDestination, userLocation, isSidebarVisible, onMapMove }) {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const markers = useRef([]);
    const userMarkerRef = useRef(null);
    const hasCenteredRef = useRef(false);
    const [styleMode, setStyleMode] = useState('light');
    const [is3D, setIs3D] = useState(false);
    const [showLayerMenu, setShowLayerMenu] = useState(false);

    useEffect(() => {
        if (map.current) return;

        map.current = new maplibregl.Map({
            // ... (init options)
            container: mapContainer.current,
            style: getStyle('light'),
            center: [38.7578, 8.9806],
            zoom: 15,
            maxZoom: 18,
            pitch: 0,
            padding: { left: window.innerWidth > 768 ? 360 : 0 },
            attributionControl: false,
        });

        map.current.addControl(new maplibregl.NavigationControl(), 'bottom-right');

        // Handle Zoom for LOD (Level of Detail)
        const handleZoom = () => {
            const zoom = map.current.getZoom();
            const markers = document.getElementsByClassName('business-marker');
            for (let el of markers) {
                // Hide text/icon if zoomed out too far
                if (zoom < 14) {
                    el.style.opacity = '0';
                    el.style.pointerEvents = 'none';
                } else {
                    el.style.opacity = '1';
                    el.style.pointerEvents = 'auto';
                }
            }
        };
        map.current.on('zoom', handleZoom);
        map.current.on('moveend', handleZoom); // Also check on move end




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
        map.current.on('moveend', () => {
            if (onMapMove) {
                const center = map.current.getCenter();
                const zoom = map.current.getZoom();
                onMapMove({ lat: center.lat, lng: center.lng, zoom: zoom });
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

    // Toggle 3D Buildings Layer Visibility
    useEffect(() => {
        if (!map.current) return;

        const update3DLayer = () => {
            if (map.current.getLayer('3d-buildings')) {
                map.current.setLayoutProperty(
                    '3d-buildings',
                    'visibility',
                    is3D ? 'visible' : 'none'
                );
            }
        };

        // If style is still loading, wait for it
        if (!map.current.isStyleLoaded()) {
            map.current.once('styledata', update3DLayer);
        } else {
            update3DLayer();
        }
    }, [is3D, styleMode]);

    // Update User Marker
    useEffect(() => {
        if (!map.current || !userLocation) return;

        // Cleanup existing marker
        if (userMarkerRef.current) {
            userMarkerRef.current.remove();
        }

        // Force cleanup of any ghost markers
        const ghosts = document.getElementsByClassName('user-marker');
        while (ghosts.length > 0) {
            ghosts[0].remove();
        }

        const el = document.createElement('div');
        el.className = 'user-marker';
        userMarkerRef.current = new maplibregl.Marker(el)
            .setLngLat([userLocation.lng, userLocation.lat])
            .addTo(map.current);
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

            // Use custom icon based on category
            const categoryName = business.category?.name || business.category;
            const icon = getCategoryIcon(categoryName);

            el.innerHTML = `
                <div class="yandex-marker">
                    <div class="yandex-icon">
                        ${icon}
                    </div>
                    <div class="yandex-label">
                        <div class="yandex-name-row">
                            <span class="yandex-name">${business.name}</span>
                        </div>
                        <div class="yandex-rating">
                            <span>★</span> <span>${business.avg_rating ? business.avg_rating.toFixed(1) : 'New'}</span>
                        </div>
                        <div class="yandex-subtitle">
                            ${business.category?.name || business.category}
                        </div>
                    </div>
                </div>
            `;

            el.style.zIndex = '1'; // Ensure text is above other things


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
        // setShowLayerMenu(false); // No longer needed with CSS hover
        if (map.current) {
            map.current.setStyle(getStyle(mode));
        }
    };

    return (
        <div className="map-wrapper" style={{ position: 'relative', width: '100%', height: '100vh' }}>
            <div ref={mapContainer} className="map-container" />

            {/* Map Controls Group */}
            <div className="map-controls-group">
                {/* Layer Switcher */}
                <div className="layer-switcher-container">
                    <button className="map-control-btn" title="Layers">
                        🗺️
                    </button>
                    <div className="layer-menu">
                        <div className={`layer-option ${styleMode === 'light' ? 'active' : ''}`} onClick={() => changeStyle('light')}>
                            <span>☀️</span> Standard
                        </div>
                        <div className={`layer-option ${styleMode === 'dark' ? 'active' : ''}`} onClick={() => changeStyle('dark')}>
                            <span>🌑</span> Dark Mode
                        </div>
                        <div className={`layer-option ${styleMode === 'satellite' ? 'active' : ''}`} onClick={() => changeStyle('satellite')}>
                            <span>🛰️</span> Satellite
                        </div>
                    </div>
                </div>

                <div className="controls-separator" />

                {/* 3D Toggle */}
                <button
                    className="map-control-btn"
                    onClick={toggle3D}
                    title="Toggle 2D/3D"
                >
                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{is3D ? '2D' : '3D'}</span>
                </button>

                <div className="controls-separator" />

                {/* Locate Me Button */}
                <button
                    className="map-control-btn"
                    onClick={handleLocateMe}
                    title="Locate Me"
                >
                    🎯
                </button>
            </div>
        </div>
    );
}
