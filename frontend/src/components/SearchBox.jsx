import { useState } from 'react';
import './SearchBox.css?v=2';

export default function SearchBox({ query, onSearch }) {
    const [activeCategory, setActiveCategory] = useState('all');

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
                        placeholder="Search places..."
                        value={query}
                        onChange={(e) => onSearch(e.target.value)}
                    />
                    {query ? (
                        <button className="clear-search" onClick={() => onSearch('')}>✕</button>
                    ) : (
                        <button className="clear-search">🔍</button>
                    )}
                </div>
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
