import { useState } from 'react';
import './SearchBox.css?v=2';

export default function SearchBox({ query, onSearch, onProfileClick, suggestions = [], onSelectSuggestion }) {
    const [activeCategory, setActiveCategory] = useState('all');
    const [isFocused, setIsFocused] = useState(false);

    const categories = [
        { id: 'food', label: 'Good place', icon: '🏆' },
        { id: 'lunch', label: 'Business lunch', icon: '' },
        { id: 'chains', label: 'Chains', icon: '' },
        { id: 'prices', label: 'Prices', icon: '' },
        { id: 'open', label: 'Open', icon: '' },
    ];

    return (
        <>
            {/* Floating Search Box */}
            <div className="search-box-floating">
                <div className="search-input-container">
                    <span className="search-icon">📍</span>
                    <input
                        type="text"
                        className="search-input-main"
                        placeholder="Search here"
                        value={query}
                        onChange={(e) => onSearch(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setTimeout(() => setIsFocused(false), 200)} // Delay to allow click
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

                {/* Suggestions Dropdown */}
                {isFocused && query && suggestions.length > 0 && (
                    <div className="search-suggestions">
                        {suggestions.slice(0, 5).map((biz) => (
                            <div
                                key={biz.id}
                                className="suggestion-item"
                                onClick={() => {
                                    onSelectSuggestion(biz);
                                    setIsFocused(false);
                                }}
                            >
                                <span className="suggestion-icon">📍</span>
                                <div className="suggestion-text">
                                    <div className="suggestion-name">{biz.name}</div>
                                    <div className="suggestion-address">{biz.address || biz.city}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Floating Category Pills */}
            <div className="category-pills-floating">
                {categories.map((cat) => (
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
