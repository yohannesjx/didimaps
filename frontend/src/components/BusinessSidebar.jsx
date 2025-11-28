import { useState, useEffect } from 'react';
import BusinessCard from './BusinessCard';
import './BusinessSidebar.css';

export default function BusinessSidebar({ businesses, selectedBusiness, onSelectBusiness }) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Auto-expand when a business is selected on mobile
    useEffect(() => {
        if (selectedBusiness && window.innerWidth <= 768) {
            setIsExpanded(true);
        }
    }, [selectedBusiness]);

    return (
        <div className={`business - list ${isExpanded ? 'expanded' : ''} `}>
            {/* Mobile Drag Handle / Toggle */}
            <div className="mobile-handle" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="handle-bar"></div>
            </div>

            <div className="business-list-header">
                <h2>Places in Addis Ababa</h2>
                <p>{businesses.length} {businesses.length === 1 ? 'business' : 'businesses'}</p>
            </div>

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
