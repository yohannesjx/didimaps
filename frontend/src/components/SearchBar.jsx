import { useState } from 'react';
import './SearchBar.css';

export default function SearchBar({ query, onSearch }) {
    const [activeCategory, setActiveCategory] = useState('all');

    const categories = [
        { id: 'all', label: 'All', icon: '🔍' },
        { id: 'food', label: 'Fast food', icon: '🍔' },
        { id: 'restaurant', label: 'Good place', icon: '⭐' },
        { id: 'lunch', label: 'Business lunch', icon: '🍽️' },
        { id: 'chains', label: 'Chains', icon: '🏪' },
        { id: 'prices', label: 'Prices', icon: '💰' },
    ];

    return (
        <div className="search-bar-container">
            <div className="search-input-wrapper">
                <button className="menu-btn">☰</button>
                <input
                    type="text"
                    className="search-input"
                    placeholder="Search for places..."
                    value={query}
                    onChange={(e) => onSearch(e.target.value)}
                />
                <button className="search-btn">🔍</button>
                <button className="clear-btn" onClick={() => onSearch('')}>✕</button>
            </div>

            <div className="category-filters">
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        className={`category-btn ${activeCategory === cat.id ? 'active' : ''}`}
                        onClick={() => setActiveCategory(cat.id)}
                    >
                        <span className="category-icon">{cat.icon}</span>
                        <span className="category-label">{cat.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
