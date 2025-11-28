import { useState, useEffect } from 'react';
import BusinessCard from './BusinessCard';
import './BusinessList.css';

export default function BusinessList({ onSelectBusiness, searchQuery }) {
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(false);

    // Mock data for now - will connect to API later
    const mockBusinesses = [
        {
            id: 1,
            name: 'Nogbon',
            rating: 5.0,
            reviewCount: 1006,
            status: 'Closed until tomorrow',
            category: 'Bakery, fast food',
            address: 'Moscow, 5th Magistralnaya Street, 12, этаж 1',
            hours: '700-1500 ₽',
            image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400',
        },
        {
            id: 2,
            name: 'Domino pizza',
            rating: 4.1,
            reviewCount: 806,
            status: 'Open until 11:00 PM',
            category: 'Pizzeria, fast food',
            address: 'Moscow, Schepkina Street, 28c1',
            hours: '600-600 ₽',
            image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400',
        },
    ];

    useEffect(() => {
        // Simulate API call
        setLoading(true);
        setTimeout(() => {
            setBusinesses(mockBusinesses);
            setLoading(false);
        }, 500);
    }, [searchQuery]);

    return (
        <div className="business-list">
            <div className="business-list-header">
                <h2>Fast food</h2>
                <p>{businesses.length} places</p>
            </div>

            <div className="business-cards">
                {loading ? (
                    <div className="loading">Loading...</div>
                ) : (
                    businesses.map((business) => (
                        <BusinessCard
                            key={business.id}
                            business={business}
                            onClick={() => onSelectBusiness(business)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
