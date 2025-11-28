import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './Map.css';

export default function Map({ selectedBusiness, businesses, onMarkerClick }) {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const markers = useRef([]);

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

        // Cleanup
        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, []);

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
            <span style="font-size: 12px; color: #666;">${business.category}</span>
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

    return <div ref={mapContainer} className="map-container" />;
}
