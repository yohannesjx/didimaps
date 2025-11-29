import React, { useState, useEffect, useRef } from 'react';
import './BusinessDetails.css';

// Icons
const Icons = {
    Directions: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21.71 11.29l-9-9c-.39-.39-1.02-.39-1.41 0l-9 9c-.39.39-.39 1.02 0 1.41l9 9c.39.39 1.02.39 1.41 0l9-9c.39-.38.39-1.01 0-1.41zM14 14.5V12h-4v3H8v-4c0-.55.45-1 1-1h5V7.5l3.5 3.5-3.5 3.5z" fill="currentColor" />
        </svg>
    ),
    Start: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z" fill="currentColor" />
        </svg>
    ),
    Call: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.44-5.15-3.75-6.59-6.59l1.97-1.57c.26-.27.35-.66.24-1.01-.37-1.11-.56-2.3-.56-3.53 0-.55-.45-1-1-1H4.39c-.55 0-1 .45-1 1 0 8.73 7.19 15.92 15.92 15.92.55 0 1-.45 1-1v-4.62c0-.55-.45-1-1-1z" fill="currentColor" />
        </svg>
    ),
    Save: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z" fill="currentColor" />
        </svg>
    ),
    Share: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" fill="currentColor" />
        </svg>
    ),
    Location: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
    ),
    Time: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" /></svg>
    ),
    Web: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" /></svg>
    ),
    Edit: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
    )
};

export default function BusinessDetails({ business, onClose, onExpand }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    const panelRef = useRef(null);
    const startY = useRef(0);
    const currentY = useRef(0);
    const isDragging = useRef(false);

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
            else if (i - 0.5 <= rating) stars.push('✫');
            else stars.push('☆');
        }
        return stars.join('');
    };

    // Placeholder image logic
    const getImage = (index = 0) => {
        const images = [
            business.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
            'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400&q=80',
            'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&q=80'
        ];
        return images[index % images.length];
    };

    // Direct DOM Drag Logic
    const handleTouchStart = (e) => {
        startY.current = e.touches[0].clientY;
        currentY.current = startY.current;
        isDragging.current = true;

        // Disable transition during drag
        if (panelRef.current) {
            panelRef.current.style.transition = 'none';
        }
    };

    const handleTouchMove = (e) => {
        if (!isDragging.current || !panelRef.current) return;

        currentY.current = e.touches[0].clientY;
        const deltaY = currentY.current - startY.current;

        // Calculate new height or transform
        // If expanded (top), dragging down (positive delta) reduces height/transforms down
        // If collapsed (bottom), dragging up (negative delta) increases height/transforms up

        // For simplicity, we'll use transform translateY
        // If expanded, initial transform is 0.
        // If collapsed, initial transform is 0 (relative to its CSS height).

        // We need to know if we are expanded or not to apply logic
        // But state is async. We can check classList?

        if (isExpanded) {
            if (deltaY > 0) {
                panelRef.current.style.transform = `translateY(${deltaY}px)`;
            }
        } else {
            if (deltaY < 0) {
                panelRef.current.style.transform = `translateY(${deltaY}px)`;
            }
        }
    };

    const handleTouchEnd = (e) => {
        if (!isDragging.current || !panelRef.current) return;
        isDragging.current = false;

        // Re-enable transition
        panelRef.current.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), height 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
        panelRef.current.style.transform = ''; // Clear inline transform

        const deltaY = currentY.current - startY.current;
        const threshold = 80;

        if (isExpanded) {
            if (deltaY > threshold) {
                setIsExpanded(false);
            }
        } else {
            if (deltaY < -threshold) {
                setIsExpanded(true);
            } else if (deltaY > threshold) {
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
                        onClose(); // Close card on directions
                    }}>
                        <div className="action-circle primary">
                            <Icons.Directions />
                        </div>
                        <span className="action-label">Directions</span>
                    </button>

                    <button className="action-item">
                        <div className="action-circle">
                            <Icons.Start />
                        </div>
                        <span className="action-label">Start</span>
                    </button>

                    <button className="action-item">
                        <div className="action-circle">
                            <Icons.Call />
                        </div>
                        <span className="action-label">Call</span>
                    </button>

                    <button className="action-item">
                        <div className="action-circle">
                            <Icons.Save />
                        </div>
                        <span className="action-label">Save</span>
                    </button>

                    <button className="action-item">
                        <div className="action-circle">
                            <Icons.Share />
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
                            className={`tab-item ${activeTab === tab.toLowerCase() ? 'active' : ''}`}
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
                        <div className="info-icon"><Icons.Location /></div>
                        <div className="info-text">{business.address || business.city || '342 Cape Verde St, Addis Ababa, Ethiopia'}</div>
                    </div>

                    <div className="info-row">
                        <div className="info-icon"><Icons.Time /></div>
                        <div className="info-text">
                            <span style={{ color: '#188038', fontWeight: '500' }}>Open</span> • Closes 2 AM
                            <span className="dropdown-arrow">▼</span>
                        </div>
                    </div>

                    <div className="info-row">
                        <div className="info-icon"><Icons.Edit /></div>
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

