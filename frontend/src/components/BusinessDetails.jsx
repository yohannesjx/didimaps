import React, { useState, useEffect, useRef } from 'react';
import './BusinessDetails.css';

export default function BusinessDetails({ business, onClose, onExpand }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [dragOffset, setDragOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    const panelRef = useRef(null);
    const startY = useRef(0);
    const currentY = useRef(0);
    const startTime = useRef(0);

    useEffect(() => {
        if (onExpand) {
            onExpand(isExpanded);
        }
    }, [isExpanded, onExpand]);

    if (!business) return null;

    // Helper to generate stars
    const renderStars = (rating) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) stars.push('★');
            else if (i - 0.5 <= rating) stars.push('✫');
            else stars.push('☆');
        }
        return stars.join('');
    };

    // Placeholder image logic
    const getImage = (index = 0) => {
        // Use unsplash for demo if no business images
        const images = [
            business.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
            'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400&q=80',
            'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&q=80'
        ];
        return images[index % images.length];
    };

    // Touch Handlers for Simple Swipe Detection
    const handleTouchStart = (e) => {
        startY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
        const endY = e.changedTouches[0].clientY;
        const deltaY = endY - startY.current;
        const threshold = 50; // px to trigger change

        if (Math.abs(deltaY) < threshold) return; // Ignore small taps/jitters

        if (deltaY < 0) {
            // Swipe Up
            if (!isExpanded) setIsExpanded(true);
        } else {
            // Swipe Down
            if (isExpanded) {
                setIsExpanded(false);
            } else {
                onClose();
            }
        }
    };

    return (
        <div
            className={`business-details-panel ${isExpanded ? 'expanded' : ''}`}
            ref={panelRef}
        >
            {/* Drag Handle Area */}
            <div
                className="drag-handle-area"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="drag-handle-bar"></div>
            </div>

            <button className="details-close-btn" onClick={onClose}>✕</button>

            <div className="details-scroll-content">
                <div className="details-header-section">
                    <h1 className="details-title">{business.name}</h1>

                    <div className="details-rating-row">
                        <span className="details-rating">{business.avg_rating || '4.2'}</span>
                        <span className="details-stars">{renderStars(business.avg_rating || 4.2)}</span>
                        <span className="details-review-count">({business.review_count || 94})</span>
                        <span className="details-dot">•</span>
                    </div>

                    <div className="details-status-row">
                        <span className="status-open">Open</span>
                        <span className="status-dot">•</span>
                        <span className="status-time">Closes 2 AM</span>
                    </div>
                </div>

                <div className="details-actions">
                    <button className="action-item primary" onClick={() => {
                        const event = new CustomEvent('requestDirections', { detail: business });
                        window.dispatchEvent(event);
                    }}>
                        <div className="action-circle primary">
                            <span className="action-icon-font">➤</span>
                        </div>
                        <span className="action-label">Directions</span>
                    </button>

                    <button className="action-item">
                        <div className="action-circle">
                            <span className="action-icon-font">🚀</span>
                        </div>
                        <span className="action-label">Start</span>
                    </button>

                    <button className="action-item">
                        <div className="action-circle">
                            <span className="action-icon-font">📞</span>
                        </div>
                        <span className="action-label">Call</span>
                    </button>

                    <button className="action-item">
                        <div className="action-circle">
                            <span className="action-icon-font">🔖</span>
                        </div>
                        <span className="action-label">Save</span>
                    </button>

                    <button className="action-item">
                        <div className="action-circle">
                            <span className="action-icon-font">🔗</span>
                        </div>
                        <span className="action-label">Share</span>
                    </button>
                </div>

                {/* Photo Grid */}
                <div className="details-photo-grid">
                    <div className="photo-main">
                        <img src={getImage(0)} alt="Main" />
                    </div>
                    <div className="photo-side-col">
                        <div className="photo-side-item">
                            <img src={getImage(1)} alt="Side 1" />
                        </div>
                        <div className="photo-side-item">
                            <img src={getImage(2)} alt="Side 2" />
                            <div className="photo-more-overlay">+12</div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="details-tabs">
                    {['Overview', 'Menu', 'Reviews', 'Photos', 'Updates'].map(tab => (
                        <button
                            key={tab}
                            className={`tab - item ${activeTab === tab.toLowerCase() ? 'active' : ''} `}
                            onClick={() => setActiveTab(tab.toLowerCase())}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Related Section */}
                <div className="related-section">
                    <h3 className="section-title">Related to your search</h3>
                    <div className="related-item">
                        <div className="related-icon-circle">E</div>
                        <div className="related-text">
                            <div className="related-main-text">This is my go to place, great food amazing service and ambiance.</div>
                        </div>
                        <div className="related-arrow">›</div>
                    </div>
                </div>

                <div className="details-info-list">
                    <div className="info-row">
                        <div className="info-icon">📍</div>
                        <div className="info-text">{business.address || business.city || '342 Cape Verde St, Addis Ababa, Ethiopia'}</div>
                    </div>

                    <div className="info-row">
                        <div className="info-icon">🕒</div>
                        <div className="info-text">
                            <span style={{ color: '#188038', fontWeight: '500' }}>Open</span> • Closes 2 AM
                            <span className="dropdown-arrow">▼</span>
                        </div>
                    </div>

                    <div className="info-row">
                        <div className="info-icon">✏️</div>
                        <div className="info-text">
                            <a href="#" className="info-link">Suggest an edit</a>
                        </div>
                    </div>
                </div>

                {/* Extra content to allow scrolling when expanded */}
                <div style={{ height: '100px' }}></div>
            </div>
        </div>
    );
}

