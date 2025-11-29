# Map Service Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SUPER APP (Flutter)                              │
│                                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │  Home    │  │   Map    │  │   Food   │  │  Rides   │  │  More... │ │
│  │  Screen  │  │   Page   │  │  Service │  │  Service │  │          │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────────┘ │
│       │             │               │             │                      │
│       └─────────────┴───────────────┴─────────────┘                      │
│                             │                                            │
└─────────────────────────────┼────────────────────────────────────────────┘
                              │
                              │ HTTP/REST
                              │
┌─────────────────────────────┼────────────────────────────────────────────┐
│                             ▼                                            │
│                    MAP MICROSERVICE (Go)                                 │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                      PUBLIC API ENDPOINTS                          │ │
│  │                                                                    │ │
│  │  GET  /api/tiles/{z}/{x}/{y}.pbf      → Vector tiles             │ │
│  │  GET  /api/business/search             → Search POIs              │ │
│  │  GET  /api/business/nearby             → Nearby POIs              │ │
│  │  GET  /api/categories                  → Get categories           │ │
│  │  GET  /api/route                       → Calculate route          │ │
│  │  GET  /api/distance-matrix             → Distance matrix          │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    INTERNAL API ENDPOINTS                          │ │
│  │                   (Microservices Only)                             │ │
│  │                                                                    │ │
│  │  POST /internal/publish                → Publish POI from service │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                             ▲                                            │
└─────────────────────────────┼────────────────────────────────────────────┘
                              │
                              │ Publish POIs
                              │
┌─────────────────────────────┼────────────────────────────────────────────┐
│                             │                                            │
│                  SUPER APP BACKEND (Go)                                  │
│                                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │   Food   │  │ Grocery  │  │ Pharmacy │  │   Ride   │  │ Delivery │ │
│  │ Service  │  │ Service  │  │ Service  │  │ Service  │  │ Service  │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
│       │             │              │             │              │        │
│       └─────────────┴──────────────┴─────────────┴──────────────┘        │
│                             │                                            │
│                             │ Uses Map SDK Client                        │
│                             │ - PublishPOI()                             │
│                             │ - Search()                                 │
│                             │ - Route()                                  │
│                             │                                            │
└─────────────────────────────┼────────────────────────────────────────────┘
                              │
                              │
┌─────────────────────────────┼────────────────────────────────────────────┐
│                             ▼                                            │
│                       INFRASTRUCTURE                                     │
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐     │
│  │                  │  │                  │  │                  │     │
│  │  PostGIS DB      │  │  OSRM Routing    │  │  MBTiles Server  │     │
│  │                  │  │                  │  │                  │     │
│  │  • POI storage   │  │  • Route calc    │  │  • Vector tiles  │     │
│  │  • Spatial index │  │  • Distance      │  │  • Map styles    │     │
│  │  • Full-text     │  │  • ETA           │  │  • Caching       │     │
│  │    search        │  │                  │  │                  │     │
│  │                  │  │                  │  │                  │     │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘     │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘


DATA FLOW EXAMPLES:
═══════════════════

1. USER SEARCHES FOR RESTAURANT
   ┌─────────┐
   │ Flutter │ → Search "restaurant"
   └────┬────┘
        │
        ▼
   ┌─────────────┐
   │ Map Service │ → Query PostGIS
   └────┬────────┘
        │
        ▼
   ┌─────────┐
   │ PostGIS │ → Full-text search + spatial sort
   └────┬────┘
        │
        ▼
   ┌─────────┐
   │ Flutter │ ← Display results on map
   └─────────┘


2. FOOD SERVICE PUBLISHES RESTAURANT
   ┌──────────────┐
   │ Food Service │ → Create restaurant in DB
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │ Map SDK      │ → PublishPOI()
   └──────┬───────┘
          │
          ▼
   ┌─────────────┐
   │ Map Service │ → POST /internal/publish
   └──────┬──────┘
          │
          ▼
   ┌─────────┐
   │ PostGIS │ → UPSERT business (source='food_service')
   └─────────┘


3. USER REQUESTS ROUTE
   ┌─────────┐
   │ Flutter │ → Get route from A to B
   └────┬────┘
        │
        ▼
   ┌─────────────┐
   │ Map Service │ → GET /api/route?from=A&to=B
   └────┬────────┘
        │
        ▼
   ┌──────┐
   │ OSRM │ → Calculate optimal route
   └──┬───┘
      │
      ▼
   ┌─────────┐
   │ Flutter │ ← Draw polyline on map
   └─────────┘


KEY FEATURES:
═════════════

✓ Self-hosted (no external dependencies)
✓ Real-time search with PostGIS
✓ Category filtering
✓ Microservice POI publishing
✓ OSRM routing integration
✓ MapLibre GL rendering
✓ Offline-capable (with tile caching)
✓ Scalable architecture
