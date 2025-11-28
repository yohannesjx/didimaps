'use client';

import { useEffect } from 'react';
import { useMapStore } from '@/lib/store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const categoryIcons: Record<string, string> = {
  utensils: '🍽️',
  coffee: '☕',
  bed: '🏨',
  'shopping-bag': '🛍️',
  landmark: '🏦',
  hospital: '🏥',
  pill: '💊',
  fuel: '⛽',
  dumbbell: '💪',
  scissors: '✂️',
  'graduation-cap': '🎓',
  church: '⛪',
  moon: '🕌',
  store: '🏪',
  music: '🎵',
};

export default function CategoryBar() {
  const { theme, categories, setCategories, selectedCategory, setSelectedCategory } = useMapStore();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const cats = await api.getCategories();
        setCategories(cats);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
  }, [setCategories]);

  const isDark = theme === 'dark';

  return (
    <div className="absolute top-20 left-0 right-0 z-40 px-4">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {/* All button */}
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all',
            'text-sm font-medium shadow-md',
            selectedCategory === null
              ? isDark
                ? 'bg-red-500 text-white'
                : 'bg-blue-500 text-white'
              : isDark
              ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          )}
        >
          <span>📍</span>
          <span>All</span>
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all',
              'text-sm font-medium shadow-md',
              selectedCategory === cat.id
                ? isDark
                  ? 'bg-red-500 text-white'
                  : 'bg-blue-500 text-white'
                : isDark
                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            )}
          >
            <span>{categoryIcons[cat.icon || ''] || '📍'}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
