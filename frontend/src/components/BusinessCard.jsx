import './BusinessCard.css';

export default function BusinessCard({ business, isSelected, onClick }) {
    const defaultImage = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400';

    return (
        <div
            className={`business-card ${isSelected ? 'selected' : ''}`}
            onClick={onClick}
        >
            <div className="business-card-header">
                <div className="business-info">
                    <div className="business-name-row">
                        {business.verified && <span className="business-badge">✓</span>}
                        <h3 className="business-name">{business.name}</h3>
                    </div>
                    {business.rating && (
                        <div className="business-rating">
                            <span className="rating-stars">⭐ {business.rating.toFixed(1)}</span>
                            {business.review_count && (
                                <span className="rating-count">({business.review_count})</span>
                            )}
                        </div>
                    )}
                    <div className="business-status">{business.status || 'Hours not available'}</div>
                    <div className="business-category">{business.category || 'Business'}</div>
                    <div className="business-address">{business.address || 'Addis Ababa'}</div>
                    {business.phone && (
                        <div className="business-phone">
                            <a href={`tel:${business.phone}`}>📞 {business.phone}</a>
                        </div>
                    )}
                </div>
            </div>

            {business.photos && business.photos.length > 0 && (
                <div className="business-images">
                    <img
                        src={business.photos[0].url || defaultImage}
                        alt={business.name}
                        className="business-image"
                    />
                </div>
            )}

            <div className="business-footer">
                {business.description && (
                    <div className="business-description">
                        {business.description}
                    </div>
                )}
                <button
                    className="directions-btn-card"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClick(); // Select card first
                        // Trigger directions event (handled by parent)
                        const event = new CustomEvent('requestDirections', { detail: business });
                        window.dispatchEvent(event);
                    }}
                >
                    🔷 Directions
                </button>
            </div>
        </div>
    );
}
