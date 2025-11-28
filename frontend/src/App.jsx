import { useState, useEffect, useRef } from 'react';
import Map from './components/Map';
import BusinessSidebar from './components/BusinessSidebar';
import SearchBox from './components/SearchBox';
import LoginModal from './components/LoginModal';
import ProfileSidebar from './components/ProfileSidebar';
import { useAuth } from './contexts/AuthContext';
import './App.css?v=2';

function App() {
  const { isAuthenticated } = useAuth();
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('search'); // search, directions
  const [directionsDestination, setDirectionsDestination] = useState(null);
  const [userLocation, setUserLocation] = useState({ lat: 9.0000, lng: 38.7500 }); // Default center
  const [isSidebarVisible, setIsSidebarVisible] = useState(false); // Hidden by default
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch businesses from API
  useEffect(() => {
    const fetchBusinesses = async () => {
      setLoading(true);
      try {
        // Use mock data if search is empty to show something initially
        if (!searchQuery) {
          setBusinesses([
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
              photos: [{ url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400' }]
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
              photos: [{ url: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400' }]
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
              photos: [{ url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400' }]
            },
          ]);
          return;
        }

        const response = await fetch(`/api/businesses/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=5000&query=${encodeURIComponent(searchQuery)}`);
        if (!response.ok) throw new Error('Failed to fetch');

        const data = await response.json();
        // Map API data to component structure if needed, or use directly
        setBusinesses(data || []);
      } catch (error) {
        console.error('Error fetching businesses:', error);
        // Keep existing businesses or show error
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchBusinesses, 500);
    return () => clearTimeout(debounce);
  }, [searchQuery, userLocation]);

  useEffect(() => {
    // Listen for directions requests from cards
    const handleDirectionsRequest = (e) => {
      setDirectionsDestination(e.detail);
      setViewMode('directions');
      setIsSidebarVisible(true);
    };
    window.addEventListener('requestDirections', handleDirectionsRequest);
    return () => window.removeEventListener('requestDirections', handleDirectionsRequest);
  }, []);

  // Show sidebar when search query exists
  useEffect(() => {
    if (searchQuery) {
      setIsSidebarVisible(true);
    } else if (!selectedBusiness) {
      setIsSidebarVisible(false);
    }
  }, [searchQuery, selectedBusiness]);

  // Show sidebar when business is selected
  useEffect(() => {
    if (selectedBusiness) {
      setIsSidebarVisible(true);
    }
  }, [selectedBusiness]);

  return (
    <div className="app-container">
      <div className="sidebar-container">
        <div className="search-container">
          <SearchBox
            query={searchQuery}
            onSearch={(q) => {
              setSearchQuery(q);
              if (q) setIsSidebarVisible(true);
            }}
            onProfileClick={() => {
              if (isAuthenticated) {
                setIsProfileOpen(true);
                setIsSidebarVisible(false);
              } else {
                setIsLoginOpen(true);
              }
            }}
          />

          <BusinessSidebar
            businesses={businesses}
            selectedBusiness={selectedBusiness}
            onSelectBusiness={(business) => {
              setSelectedBusiness(business);
              setIsSidebarVisible(true);
            }}
            isVisible={isSidebarVisible && !isProfileOpen}
            onClose={() => setIsSidebarVisible(false)}
          />

          <ProfileSidebar
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
            onAddBusiness={() => alert('Add Business Flow')}
          />
        </div>
      </div>

      <Map
        selectedBusiness={selectedBusiness}
        businesses={businesses}
        onMarkerClick={(business) => {
          setSelectedBusiness(business);
          setIsSidebarVisible(true);
          setIsProfileOpen(false);
        }}
        directionsDestination={directionsDestination}
        userLocation={userLocation}
        isSidebarVisible={isSidebarVisible || isProfileOpen}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
      />
    </div>
  );
}

export default App;
