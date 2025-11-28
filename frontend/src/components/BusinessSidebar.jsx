import BusinessCard from './BusinessCard';
import './BusinessSidebar.css';

export default function BusinessList({ businesses, selectedBusiness, onSelectBusiness }) {
    return (
        <div className="business-list">
            <div className="business-list-header">
                <h2>Places in Addis Ababa</h2>
                <p>{businesses.length} {businesses.length === 1 ? 'business' : 'businesses'}</p>
            </div>

            <div className="business-cards">
                {businesses.length === 0 ? (
                    <div className="no-results">
                        <p>No businesses found</p>
                        <span style={{ fontSize: '48px' }}>🔍</span>
                    </div>
                ) : (
                    businesses.map((business) => (
                        <BusinessCard
                            key={business.id}
                            business={business}
                            isSelected={selectedBusiness?.id === business.id}
                            onClick={() => onSelectBusiness(business)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
