import { useState } from 'react';
import Map from './components/Map';
import SearchBar from './components/SearchBar';
import BusinessList from './components/BusinessList';
import './App.css';

function App() {
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="app">
      <SearchBar
        query={searchQuery}
        onSearch={setSearchQuery}
      />
      <div className="main-content">
        <BusinessList
          onSelectBusiness={setSelectedBusiness}
          searchQuery={searchQuery}
        />
        <Map selectedBusiness={selectedBusiness} />
      </div>
    </div>
  );
}

export default App;
