import React, { useState, useEffect, useRef } from 'react';
import './BusinessDetails.css';

export default function BusinessDetails({ business, onClose, onExpand }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const panelRef = useRef(null);
    const startY = useRef(0);
    const currentY = useRef(0);

    useEffect(() => {
        if (onExpand) {
            onExpand(isExpanded);
        }
    }, [isExpanded, onExpand]);

    if (!business) return null;

    // Helper to format category
    const formatCategory = (cat) => {
        if (!cat) return 'Business';
        if (typeof cat === 'object') return cat.name;
        return cat.charAt(0).toUpperCase() + cat.slice(1);
    };

    // Helper to generate stars
    const renderStars = (rating) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) stars.push('★');
            else if (i - 0.5 <= rating) stars.push('✫'); // Half star approximation
            else stars.push('☆');
        }
        return stars.join('');
    };

    // Placeholder image logic
    const getImage = () => {
        if (business.image_url) return business.image_url;
        // Generate a placeholder based on category
        const cat = (typeof business.category === 'string' ? business.category : business.category?.name || '').toLowerCase();
        if (cat.includes('bank')) return 'https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?w=800&q=80';
        if (cat.includes('hotel')) return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80';
        if (cat.includes('cafe') || cat.includes('coffee')) return 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80';
        if (cat.includes('restaurant') || cat.includes('food')) return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80';
        return 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80'; // Generic building
    };

    // Touch Handlers for Swipe
    const handleTouchStart = (e) => {
        startY.current = e.touches[0].clientY;
        currentY.current = startY.current;
    };

    const handleTouchMove = (e) => {
        currentY.current = e.touches[0].clientY;
        const deltaY = currentY.current - startY.current;

        // If swiping up and not expanded, or swiping down and expanded
        // We could add live transform here for "buttery smooth" feel
    };

    const handleTouchEnd = () => {
        const deltaY = currentY.current - startY.current;
        const threshold = 50; // px to trigger change

        if (deltaY < -threshold && !isExpanded) {
            // Swipe Up -> Expand
            setIsExpanded(true);
        } else if (deltaY > threshold && isExpanded) {
            // Swipe Down -> Collapse
            setIsExpanded(false);
        } else if (deltaY > threshold && !isExpanded) {
            // Swipe Down when collapsed -> Close
            onClose();
        }
    };

    return (
        <div
            className={`business-details-panel ${isExpanded ? 'expanded' : ''}`}
            ref={panelRef}
        >
            {/* Drag Handle */}
            <div
                className="drag-handle-area"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
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
                        <span className="details-category-text">{formatCategory(business.category)}</span>
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

                {/* Tabs */}
                <div className="details-tabs">
                    {['Overview', 'Menu', 'Reviews', 'Photos', 'Updates'].map(tab => (
                        <button
                            key={tab}
                            className={`tab-item ${activeTab === tab.toLowerCase() ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.toLowerCase())}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Photos Horizontal Scroll */}
                <div className="details-photos-scroll">
                    <img src={getImage()} alt="Main" className="detail-photo-large" />
                    <img src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80" alt="Interior" className="detail-photo-small" />
                    <img src="https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400&q=80" alt="Food" className="detail-photo-small" />
                    <div className="detail-photo-more">
                        <span>+12</span>
                    </div>
                </div>

                <div className="details-info-list">
                    <div className="info-row">
                        <div className="info-icon">📍</div>
                        <div className="info-text">{business.address || business.city || 'Addis Ababa, Ethiopia'}</div>
                    </div>

                    <div className="info-row">
                        <div className="info-icon">🕒</div>
                        <div className="info-text">
                            <span style={{ color: '#188038', fontWeight: '500' }}>Open</span> • Closes 2 AM
                        </div>
                    </div>

                    {business.phone && (
                        <div className="info-row">
                            <div className="info-icon">📞</div>
                            <div className="info-text">
                                <a href={`tel:${business.phone}`} className="info-link">{business.phone}</a>
                            </div>
                        </div>
                    )}

                    <div className="info-row">
                        <div className="info-icon">🌐</div>
                        <div className="info-text">
                            <a href="#" className="info-link">Add website</a>
                        </div>
                    </div>
                </div>

                {/* Extra content to allow scrolling when expanded */}
                <div style={{ height: '200px' }}></div>
            </div>
        </div>
    );
}
