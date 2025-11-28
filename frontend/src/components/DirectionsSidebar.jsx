import { useState, useEffect } from 'react';
import './DirectionsSidebar.css';

export default function DirectionsSidebar({ origin, destination, onBack, onStartNavigation }) {
    const [mode, setMode] = useState('driving'); // driving, walking, transit
    const [routeInfo, setRouteInfo] = useState(null);

    useEffect(() => {
        // Mock route calculation
        if (origin && destination) {
            // Calculate fake distance/time based on coordinates
            const dist = Math.sqrt(
                Math.pow(destination.lat - origin.lat, 2) +
                Math.pow(destination.lng - origin.lng, 2)
            ) * 111; // rough km conversion

            let speed = 30; // km/h
            if (mode === 'walking') speed = 5;
            if (mode === 'transit') speed = 20;

            const time = Math.round((dist / speed) * 60); // minutes

            setRouteInfo({
                distance: dist.toFixed(1),
                time: time,
                traffic: 'Light traffic'
            });
        }
    }, [origin, destination, mode]);

    return (
        <div className="directions-sidebar">
            <div className="directions-header">
                <button className="back-btn" onClick={onBack}>←</button>
                <div className="travel-modes">
                    <button
                        className={`mode-btn ${mode === 'driving' ? 'active' : ''}`}
                        onClick={() => setMode('driving')}
                    >
                        🚗
                    </button>
                    <button
                        className={`mode-btn ${mode === 'transit' ? 'active' : ''}`}
                        onClick={() => setMode('transit')}
                    >
                        🚌
                    </button>
                    <button
                        className={`mode-btn ${mode === 'walking' ? 'active' : ''}`}
                        onClick={() => setMode('walking')}
                    >
                        🚶
                    </button>
                </div>
            </div>

            <div className="route-inputs">
                <div className="input-group">
                    <span className="dot origin"></span>
                    <input type="text" value="My Location" readOnly />
                </div>
                <div className="connector"></div>
                <div className="input-group">
                    <span className="dot destination"></span>
                    <input type="text" value={destination?.name || 'Select destination'} readOnly />
                </div>
            </div>

            {routeInfo && (
                <div className="route-results">
                    <div className="primary-route">
                        <div className="route-time">
                            <span className="minutes">{routeInfo.time} min</span>
                            <span className="distance">({routeInfo.distance} km)</span>
                        </div>
                        <div className="route-details">
                            Fastest route • {routeInfo.traffic}
                        </div>
                        <button className="start-btn" onClick={onStartNavigation}>
                            Start Navigation
                        </button>
                    </div>

                    <div className="route-steps">
                        <div className="step">
                            <span className="step-icon">⬆️</span>
                            <p>Head north on Bole Road</p>
                        </div>
                        <div className="step">
                            <span className="step-icon">➡️</span>
                            <p>Turn right onto Meskel Square</p>
                        </div>
                        <div className="step">
                            <span className="step-icon">📍</span>
                            <p>Arrive at {destination?.name}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
