'use client';

import { useEffect, useState } from 'react';
import { X, Star, Clock, Phone, Globe, Navigation, Bookmark, BookmarkCheck, Share2 } from 'lucide-react';
import { useMapStore } from '@/lib/store';
import { api, type Business } from '@/lib/api';
import { cn } from '@/lib/utils';

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface BusinessDetails extends Business {
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  hours?: Array<{
    day_of_week: number;
    open_time?: string;
    close_time?: string;
    is_closed: boolean;
  }>;
  media?: Array<{
    id: string;
    media_type: string;
    url: string;
    thumbnail_url?: string;
  }>;
  is_saved: boolean;
}

export default function BottomSheet() {
  const { theme, selectedBusiness, setSelectedBusiness, bottomSheetOpen, setBottomSheetOpen, userLocation, setRouteFrom, setRouteTo, setRouteGeometry, setRouteInfo } = useMapStore();
  const [details, setDetails] = useState<BusinessDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const isDark = theme === 'dark';

  // Fetch full business details
  useEffect(() => {
    if (!selectedBusiness) {
      setDetails(null);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const data = await api.getBusiness(selectedBusiness.id);
        setDetails(data);
        setIsSaved(data.is_saved);
      } catch (err) {
        console.error('Failed to fetch business details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [selectedBusiness]);

  const handleClose = () => {
    setSelectedBusiness(null);
    setBottomSheetOpen(false);
  };

  const handleDirections = async () => {
    if (!selectedBusiness || !userLocation) return;

    try {
      const res = await api.getRoute(
        { lat: userLocation[1], lng: userLocation[0] },
        { lat: selectedBusiness.lat, lng: selectedBusiness.lng }
      );

      if (res.routes && res.routes.length > 0) {
        setRouteFrom({ lat: userLocation[1], lng: userLocation[0], name: 'My Location' });
        setRouteTo({ lat: selectedBusiness.lat, lng: selectedBusiness.lng, name: selectedBusiness.name });
        setRouteGeometry(res.routes[0].geometry);
        setRouteInfo({ distance: res.routes[0].distance, duration: res.routes[0].duration });
      }
    } catch (err) {
      console.error('Failed to get route:', err);
    }
  };

  const handleSave = async () => {
    if (!selectedBusiness) return;
    try {
      if (isSaved) {
        await api.unsaveBusiness(selectedBusiness.id);
        setIsSaved(false);
      } else {
        await api.saveBusiness(selectedBusiness.id);
        setIsSaved(true);
      }
    } catch (err) {
      console.error('Failed to save business:', err);
    }
  };

  const handleShare = () => {
    if (!selectedBusiness) return;
    if (navigator.share) {
      navigator.share({
        title: selectedBusiness.name,
        text: `Check out ${selectedBusiness.name} on Didi Maps`,
        url: window.location.href,
      });
    }
  };

  const formatDistance = (meters?: number) => {
    if (!meters) return '';
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  if (!bottomSheetOpen || !selectedBusiness) return null;

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl shadow-2xl transition-transform duration-300',
        'max-h-[70vh] overflow-y-auto',
        isDark ? 'bg-gray-900' : 'bg-white'
      )}
    >
      {/* Handle */}
      <div className="sticky top-0 pt-3 pb-2 flex justify-center">
        <div className={cn('w-10 h-1 rounded-full', isDark ? 'bg-gray-700' : 'bg-gray-300')} />
      </div>

      {/* Close button */}
      <button
        onClick={handleClose}
        className={cn(
          'absolute top-4 right-4 p-2 rounded-full',
          isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'
        )}
      >
        <X className={cn('w-5 h-5', isDark ? 'text-gray-400' : 'text-gray-600')} />
      </button>

      <div className="px-5 pb-6">
        {/* Header */}
        <div className="mb-4">
          <h2 className={cn('text-xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>
            {selectedBusiness.name}
          </h2>
          {selectedBusiness.name_am && (
            <p className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
              {selectedBusiness.name_am}
            </p>
          )}

          {/* Rating & Distance */}
          <div className="flex items-center gap-3 mt-2">
            {selectedBusiness.avg_rating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className={cn('font-medium', isDark ? 'text-white' : 'text-gray-900')}>
                  {selectedBusiness.avg_rating.toFixed(1)}
                </span>
                <span className={cn('text-sm', isDark ? 'text-gray-500' : 'text-gray-500')}>
                  ({selectedBusiness.review_count})
                </span>
              </div>
            )}
            {selectedBusiness.distance_m && (
              <span className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
                {formatDistance(selectedBusiness.distance_m)} away
              </span>
            )}
            {selectedBusiness.category && (
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full',
                isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'
              )}>
                {selectedBusiness.category.name}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mb-5">
          <button
            onClick={handleDirections}
            disabled={!userLocation}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors',
              isDark
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-blue-500 text-white hover:bg-blue-600',
              !userLocation && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Navigation className="w-5 h-5" />
            Directions
          </button>
          <button
            onClick={handleSave}
            className={cn(
              'p-3 rounded-xl transition-colors',
              isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'
            )}
          >
            {isSaved ? (
              <BookmarkCheck className={cn('w-5 h-5', isDark ? 'text-red-400' : 'text-blue-500')} />
            ) : (
              <Bookmark className={cn('w-5 h-5', isDark ? 'text-gray-400' : 'text-gray-600')} />
            )}
          </button>
          <button
            onClick={handleShare}
            className={cn(
              'p-3 rounded-xl transition-colors',
              isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'
            )}
          >
            <Share2 className={cn('w-5 h-5', isDark ? 'text-gray-400' : 'text-gray-600')} />
          </button>
        </div>

        {loading ? (
          <div className={cn('py-8 text-center', isDark ? 'text-gray-400' : 'text-gray-500')}>
            Loading...
          </div>
        ) : details && (
          <>
            {/* Description */}
            {details.description && (
              <p className={cn('mb-4 text-sm', isDark ? 'text-gray-300' : 'text-gray-600')}>
                {details.description}
              </p>
            )}

            {/* Info */}
            <div className="space-y-3 mb-5">
              {details.phone && (
                <a
                  href={`tel:${details.phone}`}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl',
                    isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'
                  )}
                >
                  <Phone className={cn('w-5 h-5', isDark ? 'text-gray-400' : 'text-gray-500')} />
                  <span className={cn(isDark ? 'text-white' : 'text-gray-900')}>{details.phone}</span>
                </a>
              )}
              {details.website && (
                <a
                  href={details.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl',
                    isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'
                  )}
                >
                  <Globe className={cn('w-5 h-5', isDark ? 'text-gray-400' : 'text-gray-500')} />
                  <span className={cn('truncate', isDark ? 'text-white' : 'text-gray-900')}>
                    {details.website.replace(/^https?:\/\//, '')}
                  </span>
                </a>
              )}
            </div>

            {/* Hours */}
            {details.hours && details.hours.length > 0 && (
              <div className="mb-5">
                <h3 className={cn('font-semibold mb-2 flex items-center gap-2', isDark ? 'text-white' : 'text-gray-900')}>
                  <Clock className="w-4 h-4" />
                  Hours
                </h3>
                <div className="space-y-1">
                  {details.hours.map((h) => (
                    <div key={h.day_of_week} className="flex justify-between text-sm">
                      <span className={cn(isDark ? 'text-gray-400' : 'text-gray-500')}>
                        {dayNames[h.day_of_week]}
                      </span>
                      <span className={cn(isDark ? 'text-gray-300' : 'text-gray-700')}>
                        {h.is_closed ? 'Closed' : `${h.open_time} - ${h.close_time}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Media gallery */}
            {details.media && details.media.length > 0 && (
              <div>
                <h3 className={cn('font-semibold mb-2', isDark ? 'text-white' : 'text-gray-900')}>
                  Photos
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {details.media.map((m) => (
                    <div
                      key={m.id}
                      className="flex-shrink-0 w-32 h-24 rounded-lg overflow-hidden bg-gray-200"
                    >
                      <img
                        src={m.thumbnail_url || m.url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
