'use client';

import { Sun, Moon } from 'lucide-react';
import { useMapStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export default function ThemeToggle() {
  const { theme, setTheme } = useMapStore();

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'absolute top-4 right-4 z-50 p-3 rounded-full shadow-lg transition-colors',
        isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
      )}
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-yellow-400" />
      ) : (
        <Moon className="w-5 h-5 text-gray-600" />
      )}
    </button>
  );
}
