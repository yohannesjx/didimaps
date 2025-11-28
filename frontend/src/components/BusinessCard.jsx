import './BusinessCard.css';

export default function BusinessCard({ business, onClick }) {
    return (
        <div className="business-card" onClick={onClick}>
            <div className="business-card-header">
                <div className="business-info">
                    <div className="business-name-row">
                        <span className="business-badge">🔥</span>
                        <h3 className="business-name">{business.name}</h3>
                    </div>
                    <div className="business-rating">
                        <span className="rating-stars">⭐ {business.rating}</span>
                        <span className="rating-count">({business.reviewCount})</span>
                    </div>
                    <div className="business-status">{business.status}</div>
                    <div className="business-category">{business.category}</div>
                    <div className="business-address">{business.address}</div>
                </div>
            </div>

            <div className="business-images">
                <img src={business.image} alt={business.name} className="business-image" />
                <button className="menu-button">📋 Menu</button>
            </div>

            <div className="business-footer">
                <div className="business-description">
                    Осетинские пироги на любой вкус с доставкой от HotRoad. Большой выбор. Уникальные рецепты. Выгодные цены. Попробуй все Осетин.
                </div>
                <div className="business-hours">
                    Avg. bill {business.hours}
                </div>
            </div>
        </div>
    );
}
