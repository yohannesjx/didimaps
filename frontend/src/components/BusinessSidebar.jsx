import { useState, useEffect } from 'react';
import BusinessCard from './BusinessCard';
import './BusinessSidebar.css';

export default function BusinessList({ onSelectBusiness, searchQuery }) {
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchBusinesses = async () => {
            setLoading(true);
            try {
                // Fetch from API - using nearby search for Addis Ababa center
                const lat = 8.9806;
                const lng = 38.7578;
                const radius = 5000; // 5km radius

                const url = `/api/businesses/nearby?lat=${lat}&lng=${lng}&radius=${radius}${searchQuery ? `&query=${encodeURIComponent(searchQuery)}` : ''}`;

                const response = await fetch(url);
                if (!response.ok) throw new Error('Failed to fetch businesses');

                const data = await response.json();
                setBusinesses(data.businesses || []);
            } catch (error) {
                console.error('Error fetching businesses:', error);
                // Fallback to mock data if API fails
                setBusinesses([
                    {
                        id: '1',
                        name: 'Sample Restaurant',
                        rating: 4.5,
                        category: 'Restaurant',
                        address: 'Addis Ababa, Ethiopia',
                        status: 'Open',
                        hours: '500-1000 Birr',
                    },
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchBusinesses();
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
