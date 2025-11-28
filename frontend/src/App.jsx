import { useState } from 'react';
import Map from './components/Map';
import SearchBox from './components/SearchBox';
import BusinessSidebar from './components/BusinessSidebar';
import AuthModal from './components/AuthModal';
import './App.css';

function App() {
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState(null);

  console.log('App rendering - components should be visible');

  return (
    <div className="app">
      <Map selectedBusiness={selectedBusiness} />

      <SearchBox
        query={searchQuery}
        onSearch={setSearchQuery}
        onAddBusiness={() => setShowAuth(true)}
        user={user}
      />

      <BusinessSidebar
        onSelectBusiness={setSelectedBusiness}
        searchQuery={searchQuery}
      />

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={(userData) => {
            setUser(userData);
            setShowAuth(false);
          }}
        />
      )}
    </div>
  );
}

export default App;
