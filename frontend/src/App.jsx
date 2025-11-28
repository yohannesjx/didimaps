import { useState, useEffect, useRef } from 'react';
import Map from './components/Map';
import BusinessSidebar from './components/BusinessSidebar';
import SearchBox from './components/SearchBox';
import LoginModal from './components/LoginModal';
import ProfileSidebar from './components/ProfileSidebar';
import AddBusinessModal from './components/AddBusinessModal';
import { useAuth } from './contexts/AuthContext';
import './App.css?v=2';

function App() {
  const { isAuthenticated } = useAuth();
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('search'); // search, directions
  const [directionsDestination, setDirectionsDestination] = useState(null);
  const [userLocation, setUserLocation] = useState({ lat: 9.0000, lng: 38.7500 }); // Default center
  const [mapCenter, setMapCenter] = useState({ lat: 9.0000, lng: 38.7500 });
  const [isSidebarVisible, setIsSidebarVisible] = useState(false); // Hidden by default
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAddBusinessOpen, setIsAddBusinessOpen] = useState(false);
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [pickedLocation, setPickedLocation] = useState(null);

  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch businesses from API
  useEffect(() => {
    const fetchBusinesses = async () => {
      setLoading(true);
      try {
        let url;
        if (searchQuery) {
          // Hybrid Search (Local + Nominatim)
          url = `/api/business/search?q=${encodeURIComponent(searchQuery)}&lat=${userLocation.lat}&lng=${userLocation.lng}`;
        } else {
          // Nearby Search (Local only)
          url = `/api/business/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=5000`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch');

        const data = await response.json();
        setBusinesses(data.businesses || []);
      } catch (error) {
        console.error('Error fetching businesses:', error);
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
      {/* Location Picker Overlay */}
      {isPickingLocation && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          pointerEvents: 'none', zIndex: 2000,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ fontSize: '40px', marginBottom: '20px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))', transform: 'translateY(-20px)' }}>📍</div>
          <div style={{
            background: 'white', padding: '16px', borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)', pointerEvents: 'auto',
            display: 'flex', gap: '12px'
          }}>
            <button
              className="primary-btn"
              style={{ width: 'auto', padding: '8px 16px', margin: 0 }}
              onClick={() => {
                setPickedLocation(mapCenter);
                setIsPickingLocation(false);
                setIsAddBusinessOpen(true);
              }}
            >
              Confirm Location
            </button>
            <button
              className="link-btn"
              style={{ width: 'auto', margin: 0, color: '#666', textDecoration: 'none' }}
              onClick={() => {
                setIsPickingLocation(false);
                setIsAddBusinessOpen(true);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="sidebar-container" style={{ display: isPickingLocation ? 'none' : 'block' }}>
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
            onAddBusiness={() => {
              setIsProfileOpen(false);
              setIsAddBusinessOpen(true);
            }}
          />
        </div>
      </div>

      <Map
        selectedBusiness={selectedBusiness}
        businesses={businesses}
        onMarkerClick={(business) => {
          if (isPickingLocation) return;
          setSelectedBusiness(business);
          setIsSidebarVisible(true);
          setIsProfileOpen(false);
        }}
        directionsDestination={directionsDestination}
        userLocation={userLocation}
        isSidebarVisible={isSidebarVisible || isProfileOpen}
        onMapMove={setMapCenter}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
      />

      <AddBusinessModal
        isOpen={isAddBusinessOpen}
        onClose={() => setIsAddBusinessOpen(false)}
        onPickLocation={() => {
          setIsAddBusinessOpen(false);
          setIsPickingLocation(true);
        }}
        pickedLocation={pickedLocation}
      />
    </div>
  );
}

export default App;
