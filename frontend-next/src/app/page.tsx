import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with MapLibre
const Map = dynamic(() => import('@/components/Map'), { ssr: false });
const SearchBar = dynamic(() => import('@/components/SearchBar'), { ssr: false });
const CategoryBar = dynamic(() => import('@/components/CategoryBar'), { ssr: false });
const BottomSheet = dynamic(() => import('@/components/BottomSheet'), { ssr: false });
const RouteInfo = dynamic(() => import('@/components/RouteInfo'), { ssr: false });
const ThemeToggle = dynamic(() => import('@/components/ThemeToggle'), { ssr: false });

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
