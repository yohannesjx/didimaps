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
  const [mapZoom, setMapZoom] = useState(15);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false); // Hidden by default
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAddBusinessOpen, setIsAddBusinessOpen] = useState(false);
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [pickedLocation, setPickedLocation] = useState(null);

  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(false);

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Get User Location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories', err);
    }
  };

  // Fetch businesses from API
  const fetchBusinesses = async (lat, lng, zoom = 15, categoryId = null) => {
    setLoading(true);
    try {
      let url;
      if (categoryId) {
        // Fetch by Category
        url = `/api/business/search?category_id=${categoryId}&lat=${lat}&lng=${lng}`;
      } else if (searchQuery) {
        // Hybrid Search (Local + Nominatim)
        url = `/api/business/search?q=${encodeURIComponent(searchQuery)}&lat=${lat}&lng=${lng}`;
      } else {
        // ... existing logic ...
        let radius = 5000;
        let limit = 50;

        if (zoom >= 16) {
          radius = 1000;
          limit = 100;
        } else if (zoom >= 14) {
          radius = 5000;
          limit = 50;
        } else {
          radius = 20000;
          limit = 20;
        }
        url = `/api/business/nearby?lat=${lat}&lng=${lng}&radius=${radius}&limit=${limit}`;
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

  // Initial fetch and search listener
  useEffect(() => {
    const debounce = setTimeout(() => {
      // If a category is selected, don't auto-fetch based on query unless query changes significantly?
      // Actually, if selectedCategory is set, we probably want to stick to it until search query changes.
      if (!selectedCategory) {
        fetchBusinesses(userLocation.lat, userLocation.lng, mapZoom);
      }
    }, 500);
    return () => clearTimeout(debounce);
  }, [searchQuery, userLocation, selectedCategory]); // Added selectedCategory dependency

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

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setSearchQuery(category.name); // Optional: fill search bar
    fetchBusinesses(mapCenter.lat, mapCenter.lng, mapZoom, category.id);
    setIsSidebarVisible(true); // Show sidebar to show map results
  };

  // Show sidebar when business is selected
  useEffect(() => {
    if (selectedBusiness) {
      setIsSidebarVisible(true);
    }
  }, [selectedBusiness]);

  const handleMarkerClick = (business) => {
    if (isPickingLocation) return;
    setSelectedBusiness(business);
    setIsSidebarVisible(true);
    setIsProfileOpen(false);
  };

  const handleSuggestionSelect = (business) => {
    setSelectedBusiness(business);
    setMapCenter({ lat: business.lat, lng: business.lng });
    setMapZoom(16);
    setIsSidebarVisible(true);
  };

  const handleMapMove = ({ lat, lng, zoom }) => {
    setMapCenter({ lat, lng });
    setMapZoom(zoom);
    fetchBusinesses(lat, lng, zoom);
  };

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

      <SearchBox
        query={searchQuery}
        suggestions={businesses}
        categories={categories}
        loading={loading}
        onSearch={(q) => {
          setSearchQuery(q);
          setSelectedCategory(null);
        }}
        onSelectSuggestion={handleSuggestionSelect}
        onSelectCategory={handleCategorySelect}
        onAddBusiness={() => setIsAddBusinessOpen(true)}
        onProfileClick={() => {
          if (isAuthenticated) {
            setIsProfileOpen(true);
            setIsSidebarVisible(false);
          } else {
            setIsLoginOpen(true);
          }
        }}
      />

      <div className="sidebar-container" style={{ display: isPickingLocation ? 'none' : 'block' }}>
        <div className="search-container">
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
        key="map-clean-v1"
        businesses={businesses}
        selectedBusiness={selectedBusiness}
        onMarkerClick={handleMarkerClick}
        directionsDestination={directionsDestination}
        userLocation={userLocation}
        isSidebarVisible={isSidebarVisible}
        isCategoryView={!!selectedCategory}
        onMapMove={handleMapMove}
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
