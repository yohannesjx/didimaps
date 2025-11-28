import { useState, useEffect } from 'react';
import BusinessCard from './BusinessCard';
import './BusinessSidebar.css?v=2';

export default function BusinessSidebar({ businesses, selectedBusiness, onSelectBusiness, isVisible, onClose }) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Auto-expand when a business is selected on mobile
    useEffect(() => {
        if (selectedBusiness && window.innerWidth <= 768) {
            setIsExpanded(true);
        }
    }, [selectedBusiness]);

    return (
        <div className={`business-list ${isExpanded ? 'expanded' : ''} ${!isVisible ? 'hidden' : ''}`}>
            {/* Mobile Drag Handle / Toggle */}
            <div className="mobile-handle" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="handle-bar"></div>
            </div>

            <div className="business-list-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2>Places in Addis Ababa</h2>
                        <p>{businesses.length} {businesses.length === 1 ? 'business' : 'businesses'}</p>
                    </div>
                    {/* Close button for desktop sidebar */}
                    <button className="close-sidebar-btn" onClick={onClose}>✕</button>
                </div>
            </div>

            {/* Action Buttons Row (Mobile Style - Google Maps) */}
            {selectedBusiness && (
                <div className="action-buttons-row">
                    <button className="action-btn primary" onClick={() => {
                        const event = new CustomEvent('requestDirections', { detail: selectedBusiness });
                        window.dispatchEvent(event);
                    }}>
                        <span className="icon">🔷</span> Directions
                    </button>
                    <button className="action-btn secondary">
                        <span className="icon">🚀</span> Start
                    </button>
                    <button className="action-btn secondary">
                        <span className="icon">📞</span> Call
                    </button>
                    <button className="action-btn secondary">
                        <span className="icon">🔖</span> Save
                    </button>
                </div>
            )}

            <div className="business-cards">
                {businesses.length === 0 ? (
                    <div className="no-results">
                        <p>No businesses found</p>
                        <span style={{ fontSize: '48px' }}>🔍</span>
                    </div>
                ) : (
                    businesses.map((business) => (
                        <BusinessCard
                            key={business.id}
                            business={business}
                            isSelected={selectedBusiness?.id === business.id}
                            onClick={() => onSelectBusiness(business)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
