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
        background: isDark ? '#0c0c0c' : '#F5F5F5', // Light grey background
        water: isDark ? '#1b1b1d' : '#4FC3F7',       // Nice Water Blue
        landcover: isDark ? '#2a2a2a' : '#E8F5E9',   // Very subtle green tint
        park: isDark ? '#2a2a2a' : '#81C784',        // Nice Tinted Green
        road: isDark ? '#3a3a3a' : '#E0E0E0',        // Grey Roads
        roadBorder: isDark ? '#222' : '#BDBDBD',     // Darker Grey Border
        building: isDark ? '#333' : '#EEEEEE',       // Light Grey Buildings
        rail: isDark ? '#555' : '#9E9E9E',           // Train Lines
        text: isDark ? '#ffffff' : '#212121',
        textHalo: isDark ? '#000000' : '#ffffff'
    };

    return {
        version: 8,
        sources: {
            openmaptiles: {
                type: 'vector',
                tiles: [window.location.origin + `/api/tiles/{z}/{x}/{y}.pbf?v=3`], // Fresh tiles
                minzoom: 0,
                maxzoom: 14,
            },
            'osm-buildings': {
                type: 'vector',
                tiles: [window.location.origin + '/buildings-tiles/public.buildings/{z}/{x}/{y}.pbf'],
                minzoom: 12,
                maxzoom: 15,
            }
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
                id: 'railways',
                type: 'line',
                source: 'openmaptiles',
                'source-layer': 'transportation',
                filter: ['==', 'class', 'rail'],
                paint: {
                    'line-color': colors.rail,
                    'line-width': 2,
                    'line-dasharray': [2, 2]
                }
            },
            {
                id: 'roads-casing',
                type: 'line',
                source: 'openmaptiles',
                'source-layer': 'transportation',
                filter: ['!=', 'class', 'rail'], // Exclude rails from generic roads
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
                filter: ['!=', 'class', 'rail'], // Exclude rails from generic roads
                paint: {
                    'line-color': colors.road,
                    'line-width': { base: 1.2, stops: [[13, 1.5], [14, 2.5], [20, 14]] }
                },
            },
            {
                id: 'building-2d',
                type: 'fill',
                source: 'openmaptiles',
                'source-layer': 'building',
                maxzoom: 13,
                paint: {
                    'fill-color': colors.building,
                    'fill-opacity': 1,
                    'fill-outline-color': '#cfcfcf'
                }
            },
            {
                id: '3d-buildings',
                source: 'openmaptiles',
                'source-layer': 'building',
                type: 'fill-extrusion',
                minzoom: 13,
                paint: {
                    'fill-extrusion-color': colors.building,
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
                id: 'osm-buildings-detailed',
                type: 'fill',
                source: 'osm-buildings',
                'source-layer': 'public.buildings',
                minzoom: 13,
                paint: {
                    'fill-color': colors.building,
                    'fill-opacity': 0.8,
                    'fill-outline-color': '#999999'
                }
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

const getCategoryColor = (category) => {
    if (!category) return '#757575'; // Default Grey
    const cat = category.toLowerCase();
    if (cat.includes('bank') || cat.includes('finance') || cat.includes('atm')) return '#1a73e8'; // Blue
    if (cat.includes('hotel') || cat.includes('lodging')) return '#e91e63'; // Pink
    if (cat.includes('restaurant') || cat.includes('food') || cat.includes('dining')) return '#ff6d00'; // Orange
    if (cat.includes('cafe') || cat.includes('coffee')) return '#ef6c00'; // Dark Orange
    if (cat.includes('hospital') || cat.includes('clinic') || cat.includes('pharmacy')) return '#d32f2f'; // Red
    if (cat.includes('park') || cat.includes('garden')) return '#2e7d32'; // Green
    if (cat.includes('shop') || cat.includes('store') || cat.includes('mall')) return '#0288d1'; // Light Blue
    if (cat.includes('school') || cat.includes('university') || cat.includes('education')) return '#546e7a'; // Blue Grey
    if (cat.includes('gym') || cat.includes('fitness')) return '#ffca28'; // Amber
    if (cat.includes('bar') || cat.includes('club')) return '#9c27b0'; // Purple
    return '#757575';
};

export default function Map({ selectedBusiness, businesses, onMarkerClick, directionsDestination, userLocation, isSidebarVisible, onMapMove, isCategoryView }) {
    // ... (refs and state)
    const mapContainer = useRef(null);
    const map = useRef(null);
    const markers = useRef([]);
    const userMarkerRef = useRef(null);
    const hasCenteredRef = useRef(false);
    const [styleMode, setStyleMode] = useState('light');
    const [is3D, setIs3D] = useState(false);
    const [showLayerMenu, setShowLayerMenu] = useState(false);

    // Ref to hold the latest onMapMove callback
    const onMapMoveRef = useRef(onMapMove);

    // Update ref when prop changes
    useEffect(() => {
        onMapMoveRef.current = onMapMove;
    }, [onMapMove]);

    useEffect(() => {
        if (map.current) return;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: getStyle('light'),
            center: [38.7578, 8.9806],
            zoom: 15,
            maxZoom: 18,
            pitch: 0,
            padding: { left: window.innerWidth > 768 ? 360 : 0 },
            attributionControl: false,
        });

        // Add standard navigation control (zoom + compass)
        map.current.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: false }), 'bottom-right');

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
            if (onMapMoveRef.current) {
                const center = map.current.getCenter();
                const zoom = map.current.getZoom();
                onMapMoveRef.current({ lat: center.lat, lng: center.lng, zoom: zoom });
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

    // Update 'my-places' source when businesses change
    useEffect(() => {
        if (!map.current) return;

        const geojson = {
            type: 'FeatureCollection',
            features: businesses.map(b => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [b.lng, b.lat]
                },
                properties: {
                    id: b.id,
                    name: b.name,
                    category: b.category?.name || b.category,
                    icon: getCategoryIcon(b.category?.name || b.category),
                    color: getCategoryColor(b.category?.name || b.category),
                    rating: b.avg_rating
                }
            }))
        };

        if (map.current.getSource('my-places')) {
            map.current.getSource('my-places').setData(geojson);
        } else {
            // Source doesn't exist yet (map might be initializing), it will be added in map load
            // But we can try to add it if map is loaded
            if (map.current.isStyleLoaded()) {
                map.current.addSource('my-places', { type: 'geojson', data: geojson });
                // Add layer... (handled in init or separate function)
            }
        }
    }, [businesses]);

    // Initialize Map Layers for Businesses
    useEffect(() => {
        if (!map.current) return;

        const addLayers = () => {
            // Generate a white circle icon for the background
            if (!map.current.hasImage('circle-bg')) {
                const width = 64; // High res for crispness
                const height = 64;
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                // Draw white circle
                ctx.beginPath();
                ctx.arc(width / 2, height / 2, width / 2 - 2, 0, 2 * Math.PI);
                ctx.fillStyle = '#ffffff';
                ctx.fill();

                // Add border (optional, maybe just white is enough if we color it? 
                // Actually, we want the ICON to be colored. 
                // MapLibre icon-color tints the WHOLE image (alpha mask).
                // So we need a WHITE circle to tint it.
                // But we also want a white border?
                // Or we can make the circle slightly smaller and add a white stroke?
                // If we use SDF: 'sdf': true. Then we can use icon-color and icon-halo-color.

                const imageData = ctx.getImageData(0, 0, width, height);
                map.current.addImage('circle-bg', imageData, { sdf: true });
            }

            if (!map.current.getSource('my-places')) {
                map.current.addSource('my-places', {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [] }
                });

                // Single Symbol Layer for Icon + Background
                // This ensures they hide/show together based on collision
                map.current.addLayer({
                    id: 'my-places-symbol',
                    type: 'symbol',
                    source: 'my-places',
                    layout: {
                        'icon-image': 'circle-bg',
                        'icon-size': 0.4, // Smaller size (approx 25px)
                        'icon-allow-overlap': false, // PREVENT CLUSTERING/OVERLAP
                        'icon-ignore-placement': false,
                        'icon-padding': 2, // Space between icons

                        'text-field': ['get', 'icon'], // The Emoji
                        'text-size': 14, // Smaller emoji
                        'text-allow-overlap': false, // Hide text if it overlaps
                        'text-ignore-placement': false,
                        'text-offset': [0, 0], // Center on icon
                        'text-anchor': 'center',

                        'symbol-sort-key': ['get', 'rating'] // Show higher rated places first
                    },
                    paint: {
                        'icon-color': ['get', 'color'], // Tint the circle
                        'icon-halo-color': '#ffffff', // White border
                        'icon-halo-width': 2,
                        'text-color': '#ffffff' // Emoji color (might not affect standard emojis much, but good practice)
                    }
                });

                // Label (Name) - Only visible at higher zoom levels
                // We make this a separate layer so names can hide while icons stay
                map.current.addLayer({
                    id: 'my-places-label',
                    type: 'symbol',
                    source: 'my-places',
                    minzoom: 15, // Only show names when zoomed in
                    layout: {
                        'text-field': ['get', 'name'],
                        'text-font': ['Noto Sans Regular'],
                        'text-size': 11,
                        'text-offset': [0, 1.8],
                        'text-anchor': 'top',
                        'text-max-width': 12,
                        'text-optional': true // Hide label if it clashes with other labels
                    },
                    paint: {
                        'text-color': '#333333',
                        'text-halo-color': '#ffffff',
                        'text-halo-width': 2
                    }
                });

                // Handle Clicks
                map.current.on('click', 'my-places-symbol', (e) => {
                    const feature = e.features[0];
                    const business = {
                        id: feature.properties.id,
                        name: feature.properties.name,
                        category: feature.properties.category,
                        lng: feature.geometry.coordinates[0],
                        lat: feature.geometry.coordinates[1],
                        avg_rating: feature.properties.rating
                    };
                    onMarkerClick(business);
                });

                // Cursor pointer
                map.current.on('mouseenter', 'my-places-symbol', () => {
                    map.current.getCanvas().style.cursor = 'pointer';
                });
                map.current.on('mouseleave', 'my-places-symbol', () => {
                    map.current.getCanvas().style.cursor = '';
                });
            }
        };

        if (map.current.isStyleLoaded()) {
            addLayers();
        } else {
            map.current.on('load', addLayers);
        }
    }, [map.current]); // Run once when map is ready

    // Selected Business Marker (Big Pin)
    useEffect(() => {
        if (!map.current) return;

        // Remove existing selected marker
        const existing = document.getElementsByClassName('selected-marker');
        while (existing.length > 0) existing[0].remove();

        if (selectedBusiness) {
            const el = document.createElement('div');
            el.className = 'selected-marker';
            el.innerHTML = `<div style="font-size: 32px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">📍</div>`;

            new maplibregl.Marker(el)
                .setLngLat([selectedBusiness.lng, selectedBusiness.lat])
                .addTo(map.current);
        }
    }, [selectedBusiness]);

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

                {/* Rotate Button */}
                <button
                    className="map-control-btn"
                    onClick={() => {
                        if (map.current) {
                            map.current.easeTo({ bearing: map.current.getBearing() - 45, duration: 500 });
                        }
                    }}
                    title="Rotate Map"
                >
                    🔄
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
