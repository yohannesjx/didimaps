import './BusinessSidebar.css';

export default function BusinessCard({ business, isSelected, onClick }) {
    const defaultImage = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400';

    return (
        <div
            className={`business-card ${isSelected ? 'selected' : ''}`}
            onClick={onClick}
        >
            {/* Header: Name & Rating */}
            <div className="business-name-row">
                <h3 className="business-name">{business.name}</h3>
                {business.verified && <span className="verified-badge">✓</span>}
            </div>

            <div className="business-rating">
                <span className="rating-stars">{business.rating}</span>
                <span className="rating-count">({business.review_count})</span>
                {business.rating >= 4.5 && (
                    <span className="good-place-badge">
                        <span className="good-place-icon">🏆</span> Good place 2025
                    </span>
                )}
            </div>

            {/* Meta: Status, Category, Address */}
            <div className="business-meta">
                <span className={business.status?.includes('Open') ? 'status-open' : 'status-closed'}>
                    {business.status}
                </span>
                <span className="business-category"> • {business.category?.name || business.category}</span>
            </div>

            <div className="business-address">{business.address}</div>

            {/* Price Tag */}
            <div className="price-tag">
                Avg. bill {business.hours || '500-1000 ETB'}
            </div>

            {/* Photos */}
            <div className="business-photos">
                <div style={{ position: 'relative', display: 'flex', gap: '4px' }}>
                    <img
                        src={business.photos?.[0]?.url || defaultImage}
                        alt={business.name}
                        className="photo-item"
                    />
                    <img
                        src="https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400"
                        alt="Food"
                        className="photo-item"
                    />
                    <img
                        src="https://images.unsplash.com/photo-1544025162-d76694265947?w=400"
                        alt="Interior"
                        className="photo-item"
                    />

                    <button className="menu-btn-overlay">
                        📄 Menu
                    </button>
                </div>
            </div>

            {/* Description / Footer */}
            {business.description && (
                <div className="business-footer">
                    <span className="ad-badge">Ad</span>
                    {business.description}
                </div>
            )}
        </div>
    );
}
