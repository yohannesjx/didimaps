import { useState } from 'react';
import Map from './components/Map';
import SearchBox from './components/SearchBox';
import BusinessSidebar from './components/BusinessSidebar';
import './App.css';

function App() {
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="app">
      <Map selectedBusiness={selectedBusiness} />

      <SearchBox
        query={searchQuery}
        onSearch={setSearchQuery}
      />

      <BusinessSidebar
        onSelectBusiness={setSelectedBusiness}
        searchQuery={searchQuery}
      />
    </div>
  );
}

export default App;
