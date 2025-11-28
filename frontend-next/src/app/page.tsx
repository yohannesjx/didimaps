'use client';

import Map from '@/components/Map';
import SearchBar from '@/components/SearchBar';
import CategoryBar from '@/components/CategoryBar';
import BottomSheet from '@/components/BottomSheet';
import RouteInfo from '@/components/RouteInfo';
import ThemeToggle from '@/components/ThemeToggle';

export default function Home() {
  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <Map />
      <SearchBar />
      <CategoryBar />
      <ThemeToggle />
      <BottomSheet />
      <RouteInfo />
    </main>
  );
}
