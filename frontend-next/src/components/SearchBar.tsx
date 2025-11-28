'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Navigation, MapPin } from 'lucide-react';
import { useMapStore } from '@/lib/store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface SearchResult {
  place_id: number;
  name: string;
  display_name: string;
  lat: string;
  lng: string;
  type: string;
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { theme, setCenter, setZoom, userLocation } = useMapStore();

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.search(query);
        setResults(res.results || []);
      } catch (err) {
        console.error('Search failed:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (result: SearchResult) => {
    setCenter([parseFloat(result.lng), parseFloat(result.lat)]);
    setZoom(16);
    setQuery(result.name);
    setIsOpen(false);
  };

  const handleMyLocation = () => {
    if (userLocation) {
      setCenter(userLocation);
      setZoom(16);
      setIsOpen(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div ref={containerRef} className="absolute top-4 left-4 right-4 z-50 max-w-md mx-auto">
      <div
        className={cn(
          'relative rounded-2xl shadow-lg transition-all',
          isDark ? 'bg-gray-900' : 'bg-white',
          isOpen && results.length > 0 && 'rounded-b-none'
        )}
      >
        <div className="flex items-center px-4 py-3">
          <Search className={cn('w-5 h-5 mr-3', isDark ? 'text-gray-400' : 'text-gray-500')} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search places, businesses..."
            className={cn(
              'flex-1 bg-transparent outline-none text-base',
              isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
            )}
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                inputRef.current?.focus();
              }}
              className={cn('p-1 rounded-full', isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100')}
            >
              <X className={cn('w-4 h-4', isDark ? 'text-gray-400' : 'text-gray-500')} />
            </button>
          )}
        </div>

        {/* Results dropdown */}
        {isOpen && (
          <div
            className={cn(
              'absolute left-0 right-0 top-full rounded-b-2xl shadow-lg overflow-hidden',
              isDark ? 'bg-gray-900' : 'bg-white'
            )}
          >
            {/* My Location button */}
            {userLocation && (
              <button
                onClick={handleMyLocation}
                className={cn(
                  'w-full flex items-center px-4 py-3 border-t',
                  isDark ? 'border-gray-800 hover:bg-gray-800' : 'border-gray-100 hover:bg-gray-50'
                )}
              >
                <div className={cn('p-2 rounded-full mr-3', isDark ? 'bg-blue-900' : 'bg-blue-100')}>
                  <Navigation className={cn('w-4 h-4', isDark ? 'text-blue-400' : 'text-blue-600')} />
                </div>
                <span className={cn('font-medium', isDark ? 'text-white' : 'text-gray-900')}>
                  My Location
                </span>
              </button>
            )}

            {/* Loading */}
            {loading && (
              <div className={cn('px-4 py-3 text-center', isDark ? 'text-gray-400' : 'text-gray-500')}>
                Searching...
              </div>
            )}

            {/* Results */}
            {!loading && results.map((result) => (
              <button
                key={result.place_id}
                onClick={() => handleSelect(result)}
                className={cn(
                  'w-full flex items-start px-4 py-3 border-t text-left',
                  isDark ? 'border-gray-800 hover:bg-gray-800' : 'border-gray-100 hover:bg-gray-50'
                )}
              >
                <div className={cn('p-2 rounded-full mr-3 mt-0.5', isDark ? 'bg-gray-800' : 'bg-gray-100')}>
                  <MapPin className={cn('w-4 h-4', isDark ? 'text-gray-400' : 'text-gray-500')} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn('font-medium truncate', isDark ? 'text-white' : 'text-gray-900')}>
                    {result.name}
                  </div>
                  <div className={cn('text-sm truncate', isDark ? 'text-gray-500' : 'text-gray-500')}>
                    {result.display_name}
                  </div>
                </div>
              </button>
            ))}

            {/* No results */}
            {!loading && query.length >= 2 && results.length === 0 && (
              <div className={cn('px-4 py-3 text-center', isDark ? 'text-gray-400' : 'text-gray-500')}>
                No results found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
