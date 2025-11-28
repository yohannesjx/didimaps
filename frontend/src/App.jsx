import { useState } from 'react';
import Map from './components/Map';
import SearchBox from './components/SearchBox';
import BusinessSidebar from './components/BusinessSidebar';
import DirectionsSidebar from './components/DirectionsSidebar';
import './App.css';

function App() {
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
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
      lat: 8.9806,
      lng: 38.7578,
      phone: '+251 11 661 2985',
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
      lat: 9.0320,
      lng: 38.7469,
      phone: '+251 11 551 4935',
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
      lat: 9.0330,
      lng: 38.7400,
      phone: '+251 11 157 1846',
    },
  ]);

  const [viewMode, setViewMode] = useState('search'); // search, directions
  const [directionsDestination, setDirectionsDestination] = useState(null);
  const [userLocation, setUserLocation] = useState({ lat: 9.0000, lng: 38.7500 }); // Default center

  useEffect(() => {
    // Listen for directions requests from cards
    const handleDirectionsRequest = (e) => {
      setDirectionsDestination(e.detail);
      setViewMode('directions');
    };
    window.addEventListener('requestDirections', handleDirectionsRequest);
    return () => window.removeEventListener('requestDirections', handleDirectionsRequest);
  }, []);

  const filteredBusinesses = businesses.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="app">
      <Map
        selectedBusiness={selectedBusiness}
        businesses={businesses}
        onMarkerClick={setSelectedBusiness}
        directionsDestination={viewMode === 'directions' ? directionsDestination : null}
        userLocation={userLocation}
      />

      {viewMode === 'search' ? (
        <>
          <SearchBox
            query={searchQuery}
            onSearch={setSearchQuery}
          />

          <BusinessSidebar
            businesses={filteredBusinesses}
            selectedBusiness={selectedBusiness}
            onSelectBusiness={setSelectedBusiness}
          />
        </>
      ) : (
        <DirectionsSidebar
          origin={userLocation}
          destination={directionsDestination}
          onBack={() => setViewMode('search')}
          onStartNavigation={() => alert('Navigation started!')}
        />
      )}
    </div>
  );
}

export default App;
