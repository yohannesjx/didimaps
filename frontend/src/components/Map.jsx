import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './Map.css';

export default function Map() {
    const mapContainer = useRef(null);
    const map = useRef(null);

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
        });

        // Add navigation controls
        map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

        // Add geolocate control
        map.current.addControl(
            new maplibregl.GeolocateControl({
                positionOptions: {
                    enableHighAccuracy: true,
                },
                trackUserLocation: true,
            }),
            'top-right'
        );

        // Add business markers
        const businesses = [
            { id: 1, name: 'Yod Abyssinia', lat: 8.9806, lng: 38.7578 },
            { id: 2, name: 'Tomoca Coffee', lat: 9.0320, lng: 38.7469 },
            { id: 3, name: 'Castelli Restaurant', lat: 9.0330, lng: 38.7400 },
        ];

        businesses.forEach((business) => {
            // Create marker element
            const el = document.createElement('div');
            el.className = 'business-marker';
            el.innerHTML = '📍';
            el.style.fontSize = '24px';
            el.style.cursor = 'pointer';

            // Add marker to map
            const marker = new maplibregl.Marker(el)
                .setLngLat([business.lng, business.lat])
                .addTo(map.current);

            // Add popup
            const popup = new maplibregl.Popup({ offset: 25 })
                .setHTML(`<strong>${business.name}</strong>`);

            el.addEventListener('click', () => {
                popup.addTo(map.current);
                marker.setPopup(popup);
                marker.togglePopup();
            });
        });

        // Cleanup
        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, []);

    return <div ref={mapContainer} className="map-container" />;
}
