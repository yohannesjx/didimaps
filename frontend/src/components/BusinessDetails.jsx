import React from 'react';
import './BusinessDetails.css';

export default function BusinessDetails({ business, onClose }) {
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

    return (
        <div className="business-details-panel">
            <button className="details-close-btn" onClick={onClose}>✕</button>

            <img src={getImage()} alt={business.name} className="details-header-image" />

            <div className="details-content">
                <h1 className="details-title">{business.name}</h1>

                <div className="details-rating-row">
                    <span className="details-rating">{business.avg_rating || '0.0'}</span>
                    <span className="details-stars">{renderStars(business.avg_rating || 0)}</span>
                    <span className="details-review-count">({business.review_count || 0})</span>
                </div>

                <div className="details-category">
                    {formatCategory(business.category)} • {business.city || 'Addis Ababa'}
                </div>

                <div className="details-actions">
                    <button className="action-item" onClick={() => {
                        const event = new CustomEvent('requestDirections', { detail: business });
                        window.dispatchEvent(event);
                    }}>
                        <div className="action-circle primary">
                            <span style={{ transform: 'rotate(45deg)', display: 'inline-block' }}>➤</span>
                        </div>
                        <span className="action-label">Directions</span>
                    </button>

                    <button className="action-item">
                        <div className="action-circle">
                            <span>🔖</span>
                        </div>
                        <span className="action-label">Save</span>
                    </button>

                    <button className="action-item">
                        <div className="action-circle">
                            <span>📍</span>
                        </div>
                        <span className="action-label">Nearby</span>
                    </button>

                    <button className="action-item">
                        <div className="action-circle">
                            <span>📱</span>
                        </div>
                        <span className="action-label">Send to phone</span>
                    </button>

                    <button className="action-item">
                        <div className="action-circle">
                            <span>🔗</span>
                        </div>
                        <span className="action-label">Share</span>
                    </button>
                </div>

                <div className="details-info-list">
                    <div className="info-row">
                        <div className="info-icon">📍</div>
                        <div className="info-text">{business.address || business.city || 'Addis Ababa, Ethiopia'}</div>
                    </div>

                    <div className="info-row">
                        <div className="info-icon">🕒</div>
                        <div className="info-text">
                            <span style={{ color: '#188038', fontWeight: '500' }}>Open</span> • Closes 10 PM
                        </div>
                    </div>

                    {business.website && (
                        <div className="info-row">
                            <div className="info-icon">🌐</div>
                            <div className="info-text">
                                <a href={business.website} target="_blank" rel="noopener noreferrer" className="info-link">
                                    {business.website.replace(/^https?:\/\//, '')}
                                </a>
                            </div>
                        </div>
                    )}

                    {business.phone && (
                        <div className="info-row">
                            <div className="info-icon">📞</div>
                            <div className="info-text">
                                <a href={`tel:${business.phone}`} className="info-link">{business.phone}</a>
                            </div>
                        </div>
                    )}

                    <div className="info-row">
                        <div className="info-icon">🛡️</div>
                        <div className="info-text">
                            <a href="#" className="info-link">Claim this business</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
