import { useState } from 'react';
import './SearchBox.css';

export default function SearchBox({ query, onSearch }) {
    const [activeCategory, setActiveCategory] = useState('all');

    const categories = [
        { id: 'all', label: 'All' },
        { id: 'food', label: 'Restaurants' },
        { id: 'cafe', label: 'Cafes' },
        { id: 'shopping', label: 'Shopping' },
        { id: 'services', label: 'Services' },
    ];

    return (
        <>
            {/* Floating Search Box */}
            <div className="search-box-floating">
                <div className="search-input-container">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        className="search-input-main"
                        placeholder="Search places in Addis Ababa..."
                        value={query}
                        onChange={(e) => onSearch(e.target.value)}
                    />
                    {query && (
                        <button className="clear-search" onClick={() => onSearch('')}>✕</button>
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
                        {cat.label}
                    </button>
                ))}
            </div>
        </>
    );
}
