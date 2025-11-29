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

    // Touch Handlers for Fluid Swipe
    const handleTouchStart = (e) => {
        startY.current = e.touches[0].clientY;
        currentY.current = startY.current;
        startTime.current = Date.now();
        setIsDragging(true);
    };

    const handleTouchMove = (e) => {
        if (!isDragging) return;
        currentY.current = e.touches[0].clientY;
        const deltaY = currentY.current - startY.current;

        // Only allow dragging down if expanded, or up/down if collapsed
        // For simplicity, we just track delta. 
        // If expanded (at top), deltaY > 0 means dragging down.
        // If collapsed (at bottom), deltaY < 0 means dragging up.

        setDragOffset(deltaY);
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        const deltaY = currentY.current - startY.current;
        const timeElapsed = Date.now() - startTime.current;
        const velocity = Math.abs(deltaY) / timeElapsed;

        const threshold = 100; // px
        const velocityThreshold = 0.5; // px/ms

        if (isExpanded) {
            // If expanded, dragging down significantly closes or collapses it
            if (deltaY > threshold || (deltaY > 50 && velocity > velocityThreshold)) {
                setIsExpanded(false);
                setDragOffset(0);
            } else {
                // Snap back to expanded
                setDragOffset(0);
            }
        } else {
            // If collapsed
            if (deltaY < -threshold || (deltaY < -50 && velocity > velocityThreshold)) {
                // Dragged up -> Expand
                setIsExpanded(true);
                setDragOffset(0);
            } else if (deltaY > threshold || (deltaY > 50 && velocity > velocityThreshold)) {
                // Dragged down -> Close
                onClose();
            } else {
                // Snap back to peek
                setDragOffset(0);
            }
        }
    };

    // Calculate transform style
    const getPanelStyle = () => {
        if (window.innerWidth > 768) return {}; // Desktop: no swipe transform

        let transform = `translateY(${dragOffset}px)`;
        // If not dragging, we want smooth transition. If dragging, instant follow.
        const transition = isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), height 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';

        return { transform, transition };
    };

    return (
        <div
            className={`business - details - panel ${isExpanded ? 'expanded' : ''} `}
            ref={panelRef}
            style={getPanelStyle()}
        >
            {/* Drag Handle Area */}
            <div
                className="drag-handle-area"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
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

