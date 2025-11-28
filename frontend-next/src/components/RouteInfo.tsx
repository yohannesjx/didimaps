'use client';

import { X, Navigation } from 'lucide-react';
import { useMapStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export default function RouteInfo() {
  const { theme, routeFrom, routeTo, routeInfo, clearRoute } = useMapStore();

  const isDark = theme === 'dark';

  if (!routeFrom || !routeTo || !routeInfo) return null;

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)} sec`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <div
      className={cn(
        'absolute bottom-4 left-4 right-4 z-40 rounded-2xl shadow-lg p-4',
        isDark ? 'bg-gray-900' : 'bg-white'
      )}
    >
      <button
        onClick={clearRoute}
        className={cn(
          'absolute top-3 right-3 p-1.5 rounded-full',
          isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
        )}
      >
        <X className={cn('w-4 h-4', isDark ? 'text-gray-400' : 'text-gray-500')} />
      </button>

      <div className="flex items-center gap-4">
        <div className={cn(
          'p-3 rounded-full',
          isDark ? 'bg-red-500/20' : 'bg-blue-500/20'
        )}>
          <Navigation className={cn('w-6 h-6', isDark ? 'text-red-400' : 'text-blue-500')} />
        </div>

        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className={cn('text-2xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>
              {formatDuration(routeInfo.duration)}
            </span>
            <span className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
              ({formatDistance(routeInfo.distance)})
            </span>
          </div>
          <div className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
            {routeFrom.name || 'Start'} → {routeTo.name || 'Destination'}
          </div>
        </div>
      </div>
    </div>
  );
}
