import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './Map.css';
import { decodePolyline } from '../utils/polyline';

export default function Map({ selectedBusiness, businesses, onMarkerClick, directionsDestination, userLocation, isSidebarVisible, onMapMove }) {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const markers = useRef([]);
    const userMarkerRef = useRef(null);

    useEffect(() => {
        if (map.current) return; // Initialize map only once

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: {
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
                        paint: {
                            'background-color': '#0c0c0c',
                        },
                    },
                    {
                        id: 'water',
                        type: 'fill',
                        source: 'openmaptiles',
                        'source-layer': 'water',
                        paint: {
                            'fill-color': '#1b1b1d',
                        },
                    },
                    {
                        id: 'landcover',
                        type: 'fill',
                        source: 'openmaptiles',
                        'source-layer': 'landcover',
                        paint: {
                            'fill-color': '#2a2a2a',
                            'fill-opacity': 0.4,
                        },
                    },
                    {
                        id: 'roads',
                        type: 'line',
                        source: 'openmaptiles',
                        'source-layer': 'transportation',
                        paint: {
                            'line-color': '#3a3a3a',
                            'line-width': 2,
                        },
                    },
                    {
                        id: 'buildings',
                        type: 'fill',
                        source: 'openmaptiles',
                        'source-layer': 'building',
                        paint: {
                            'fill-color': '#2a2a2a',
                            'fill-opacity': 0.7,
                        },
                    },
                ],
            },
            center: [38.7578, 8.9806], // Addis Ababa
            zoom: 12,
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

    return <div ref={mapContainer} className="map-container" />;
}
