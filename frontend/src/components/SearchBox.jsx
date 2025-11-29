import { useState } from 'react';
import './SearchBox.css?v=2';

export default function SearchBox({ query, onSearch, onProfileClick, suggestions = [], onSelectSuggestion, onAddBusiness, loading, categories = [], onSelectCategory }) {
    const [activeCategory, setActiveCategory] = useState('all');
    const [isFocused, setIsFocused] = useState(false);

    const pillCategories = [
        { id: 'food', label: 'Good place', icon: '🏆' },
        { id: 'lunch', label: 'Business lunch', icon: '' },
        { id: 'chains', label: 'Chains', icon: '' },
        { id: 'prices', label: 'Prices', icon: '' },
        { id: 'open', label: 'Open', icon: '' },
    ];

    const recentSearches = [
        { id: 'r1', name: 'Bole International Airport', address: 'Addis Ababa', type: 'recent' },
        { id: 'r2', name: 'Unity Park', address: 'Arat Kilo', type: 'recent' },
    ];

    const displayItems = query ? suggestions : recentSearches;

    // Find matching category
    const matchedCategory = query && categories.find(c => c.name.toLowerCase().includes(query.toLowerCase()));

    return (
        <>
            {/* Floating Search Box */}
            <div className={`search-box-floating ${isFocused ? 'focused' : ''}`}>
                <div className="search-input-container">
                    {loading ? (
                        <span className="search-icon spinner">↻</span>
                    ) : (
                        <span className="search-icon">📍</span>
                    )}
                    <input
                        type="text"
                        className="search-input-main"
                        placeholder="Search here"
                        value={query}
                        onChange={(e) => onSearch(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                    />
                    {query ? (
                        <button className="clear-search" onClick={() => onSearch('')}>✕</button>
                    ) : (
                        <button className="voice-search">🎤</button>
                    )}
                    <div className="user-profile-circle" onClick={onProfileClick}>
                        <span>G</span>
                    </div>
                </div>

                {/* Dropdown Content */}
                {isFocused && (
                    <div className="search-dropdown-content">
                        {loading && <div style={{ padding: '12px 20px', color: '#666', fontSize: '14px' }}>Searching...</div>}

                        {/* List Items */}
                        {!loading && (
                            <div className="search-list">
                                {/* Matched Category - Top Result */}
                                {matchedCategory && (
                                    <div
                                        className="suggestion-item category-match"
                                        onClick={() => {
                                            onSelectCategory(matchedCategory);
                                            setIsFocused(false);
                                        }}
                                        style={{ borderLeft: '4px solid #1a73e8', background: '#f8f9fa' }}
                                    >
                                        <span className="suggestion-icon" style={{ fontSize: '20px' }}>{matchedCategory.icon || '🔍'}</span>
                                        <div className="suggestion-text">
                                            <div className="suggestion-name" style={{ color: '#1a73e8', fontWeight: 'bold' }}>
                                                {matchedCategory.name}
                                            </div>
                                            <div className="suggestion-address">Category • See all places</div>
                                        </div>
                                    </div>
                                )}

                                {displayItems.slice(0, 6).map((item) => (
                                    <div
                                        key={item.id}
                                        className="suggestion-item"
                                        onClick={() => {
                                            onSelectSuggestion(item);
                                            setIsFocused(false);
                                        }}
                                    >
                                        <span className="suggestion-icon">{item.type === 'recent' ? '🕒' : '📍'}</span>
                                        <div className="suggestion-text">
                                            <div className="suggestion-name">{item.name}</div>
                                            <div className="suggestion-address">{item.address || item.city}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add Business Card (Always Visible) */}
                        <div className="add-business-card">
                            <div className="add-business-content">
                                <div className="add-business-text">
                                    <h3>Add your business to DiDi Maps</h3>
                                    <p>Reply to reviews, manage your business info, post offers and more!</p>
                                </div>
                                <div className="add-business-visual">
                                    🏪
                                </div>
                            </div>
                            <div className="add-business-actions">
                                <button className="pill-btn primary" onClick={onAddBusiness}>Add your business</button>
                                <button className="pill-btn secondary">Learn more</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Category Pills */}
            <div className="category-pills-floating">
                {pillCategories.map((cat) => (
                    <button
                        key={cat.id}
                        className={`category-pill ${activeCategory === cat.id ? 'active' : ''}`}
                        onClick={() => setActiveCategory(cat.id)}
                    >
                        {cat.icon && <span className="pill-icon">{cat.icon}</span>}
                        {cat.label}
                    </button>
                ))}
            </div>
        </>
    );
}
