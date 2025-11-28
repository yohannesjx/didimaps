import { useState, useEffect } from 'react';
import BusinessCard from './BusinessCard';
import './BusinessSidebar.css';

export default function BusinessList({ onSelectBusiness, searchQuery }) {
    const [businesses] = useState([
        {
            id: '1',
            name: 'Yod Abyssinia',
            rating: 4.8,
            review_count: 342,
            category: 'Ethiopian Restaurant',
            address: 'Bole, Addis Ababa',
            status: 'Open until 11:00 PM',
            description: 'Traditional Ethiopian cuisine with live cultural shows',
            verified: true,
        },
        {
            id: '2',
            name: 'Tomoca Coffee',
            rating: 4.9,
            review_count: 521,
            category: 'Coffee Shop',
            address: 'Wawel Street, Addis Ababa',
            status: 'Open until 8:00 PM',
            description: 'Authentic Ethiopian coffee since 1953',
            verified: true,
        },
        {
            id: '3',
            name: 'Castelli Restaurant',
            rating: 4.6,
            review_count: 198,
            category: 'Italian Restaurant',
            address: 'Piazza, Addis Ababa',
            status: 'Open until 10:00 PM',
            description: 'Historic Italian restaurant with great ambiance',
        },
    ]);

    return (
        <div className="business-list">
            <div className="business-list-header">
                <h2>Places in Addis Ababa</h2>
                <p>{businesses.length} businesses</p>
            </div>

            <div className="business-cards">
                {businesses.map((business) => (
                    <BusinessCard
                        key={business.id}
                        business={business}
                        onClick={() => onSelectBusiness(business)}
                    />
                ))}
            </div>
        </div>
    );
}
