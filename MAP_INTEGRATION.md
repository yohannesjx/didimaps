# Map Service Integration Guide

## Overview

The Map Service is a self-hosted, Google Maps replacement that provides:
- Vector tile serving (MapLibre)
- OSRM routing engine
- PostGIS-based POI storage and search
- Real-time location tracking
- Full integration with all Super App verticals

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SUPER APP (Flutter)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Home   │  │   Map    │  │   Food   │  │  Rides   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                       │                                      │
│                       ▼                                      │
│              MapLibre GL (Client)                           │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  MAP MICROSERVICE (Go)                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Public API                                           │  │
│  │  • /api/tiles/{z}/{x}/{y}.pbf                        │  │
│  │  • /api/business/search                              │  │
│  │  • /api/business/nearby                              │  │
│  │  • /api/categories                                   │  │
│  │  • /api/route                                        │  │
│  │  • /api/distance-matrix                              │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Internal API (Microservices Only)                   │  │
│  │  • POST /internal/publish                            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ PostGIS  │  │  OSRM    │  │ mbtiles  │                 │
│  │   DB     │  │  Engine  │  │  Server  │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

## Features

### 1. Map Tile Service
- **Vector Tiles**: Served via mbtileserver
- **Custom Styling**: MapLibre-compatible styles
- **Offline Support**: Tiles can be cached locally
- **Performance**: Fast tile delivery with caching

### 2. POI Management
- **Search**: Full-text search with PostgreSQL trigram matching
- **Nearby**: Spatial queries using PostGIS
- **Categories**: Hierarchical category system
- **External POIs**: Microservices can publish POIs

### 3. Routing
- **OSRM Integration**: Fast route calculation
- **Distance Matrix**: Multi-point distance calculations
- **Turn-by-turn**: Navigation instructions
- **Alternative Routes**: Multiple route options

### 4. Real-time Tracking
- **Driver Locations**: Live driver tracking for rides
- **Courier Tracking**: Delivery courier positions
- **ETA Updates**: Real-time arrival estimates

## Frontend Integration (Flutter)

### 1. Add Map Tile to Home Screen

The Map service is accessible from the home screen grid:

```dart
ServiceItem(
  icon: Icons.map_outlined,
  label: 'Map',
  onTap: () => context.push('/map'),
)
```

### 2. MapPage Features

**Search**:
- Real-time search with debouncing
- Results from PostGIS database
- Proximity-based sorting

**Categories**:
- Filter by restaurant, grocery, pharmacy, etc.
- Horizontal scrollable chips
- Dynamic POI loading

**POI Details**:
- Bottom sheet with business info
- Navigate, order food, order grocery actions
- Rating and distance display

**Map Controls**:
- Recenter to user location
- Compass and zoom controls
- My location tracking

### 3. Replacing Google Maps in Rides

The Rides feature now uses MapLibre instead of Google Maps:

```dart
MapLibreMap(
  initialCameraPosition: CameraPosition(
    target: LatLng(9.03, 38.74),
    zoom: 14.0,
  ),
  styleString: "https://demotiles.maplibre.org/style.json",
  onMapCreated: _onMapCreated,
  myLocationEnabled: true,
)
```

## Backend Integration (Go)

### 1. Map Service SDK

Use the Map SDK in your microservices:

```go
import "github.com/gashawarega/super/internal/clients/maps"

// Initialize client
mapClient := maps.NewClient("http://localhost:8080")

// Search
results, err := mapClient.Search("restaurant")

// Get route
route, err := mapClient.Route("9.03,38.74", "9.01,38.76")

// Publish POI
poi := maps.POI{
    ID:     "rest_123",
    Source: "food_service",
    Name:   "Yod Abyssinia",
    Lat:    9.0192,
    Lng:    38.7525,
    Type:   "restaurant",
    Metadata: map[string]interface{}{
        "cuisine": "Ethiopian",
        "price_range": "$$",
    },
}
err := mapClient.PublishPOI(poi)
```

### 2. Publishing POIs from Microservices

Each microservice should publish its entities to the map:

**Food Service** → Restaurants
```go
func (s *FoodService) CreateRestaurant(r *Restaurant) error {
    // Create in food database
    err := s.db.Create(r)
    if err != nil {
        return err
    }
    
    // Publish to map
    s.mapClient.PublishPOI(maps.POI{
        ID:     r.ID,
        Source: "food_service",
        Name:   r.Name,
        Lat:    r.Latitude,
        Lng:    r.Longitude,
        Type:   "restaurant",
    })
    
    return nil
}
```

**Grocery Service** → Stores
**Pharmacy Service** → Pharmacies
**Shopping Service** → Shops
**Ride Service** → Driver locations (real-time)
**Delivery Service** → Courier locations (real-time)

### 3. Database Schema

The `businesses` table supports external POIs:

```sql
CREATE TABLE businesses (
    id UUID PRIMARY KEY,
    source VARCHAR(50) DEFAULT 'local',  -- 'food_service', 'grocery_service', etc.
    external_id VARCHAR(255),             -- ID from source service
    name VARCHAR(255) NOT NULL,
    geom GEOMETRY(Point, 4326) NOT NULL,
    metadata JSONB,                       -- Flexible data from source
    ...
);

CREATE UNIQUE INDEX idx_businesses_source_external_id 
ON businesses(source, external_id);
```

## API Endpoints

### Public Endpoints

#### Get Tiles
```
GET /api/tiles/{z}/{x}/{y}.pbf
```

#### Search Businesses
```
GET /api/business/search?q=restaurant&lat=9.03&lng=38.74&limit=50
```

#### Get Nearby Businesses
```
GET /api/business/nearby?lat=9.03&lng=38.74&radius=2000&category=<id>
```

#### Get Categories
```
GET /api/categories
```

#### Get Route
```
GET /api/route?from=9.03,38.74&to=9.01,38.76
```

#### Get Distance Matrix
```
GET /api/distance-matrix?coords=9.03,38.74;9.01,38.76;9.02,38.75
```

### Internal Endpoints (Microservices Only)

#### Publish POI
```
POST /internal/publish
Content-Type: application/json

{
  "id": "rest_123",
  "source": "food_service",
  "name": "Yod Abyssinia",
  "lat": 9.0192,
  "lng": 38.7525,
  "type": "restaurant",
  "metadata": {
    "cuisine": "Ethiopian",
    "price_range": "$$"
  }
}
```

## Deployment

### 1. Map Service (Server A)

```bash
cd /path/to/maps/api
go build -o bin/map-service cmd/api/main.go
./bin/map-service
```

**Environment Variables**:
```env
PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_NAME=maps_db
DB_USER=postgres
DB_PASSWORD=password
OSRM_HOST=http://localhost:5000
TILE_HOST=http://localhost:8081
JWT_SECRET=your-secret-key
```

### 2. PostGIS Database

```bash
docker run -d \
  --name maps-postgres \
  -e POSTGRES_DB=maps_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgis/postgis:15-3.3
```

### 3. OSRM Server

```bash
docker run -d \
  --name osrm-backend \
  -p 5000:5000 \
  osrm/osrm-backend osrm-routed --algorithm mld /data/ethiopia-latest.osrm
```

### 4. MBTiles Server

```bash
docker run -d \
  --name mbtileserver \
  -p 8081:8080 \
  -v /path/to/tiles:/tilesets \
  consbio/mbtileserver
```

## Next Steps

1. **Custom Map Style**: Create a custom MapLibre style for your brand
2. **Offline Maps**: Implement tile caching for offline use
3. **Real-time Updates**: Add WebSocket support for live tracking
4. **Analytics**: Track map usage and popular POIs
5. **Moments**: Implement Instagram-style stories on the map
6. **AR Navigation**: Add augmented reality navigation features

## Testing

### Test Map Service
```bash
# Search
curl "http://localhost:8080/api/business/search?q=restaurant"

# Nearby
curl "http://localhost:8080/api/business/nearby?lat=9.03&lng=38.74&radius=2000"

# Route
curl "http://localhost:8080/api/route?from=9.03,38.74&to=9.01,38.76"

# Publish POI
curl -X POST http://localhost:8080/internal/publish \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test_123",
    "source": "test",
    "name": "Test Restaurant",
    "lat": 9.03,
    "lng": 38.74,
    "type": "restaurant"
  }'
```

### Test Flutter App
```bash
cd /path/to/super_flutter
flutter pub get
flutter run
```

Navigate to the Map tile on the home screen and test:
- Search functionality
- Category filtering
- POI selection
- Navigation to other services

## Troubleshooting

### Map tiles not loading
- Check mbtileserver is running on port 8081
- Verify tile files exist in `/tilesets` directory
- Check CORS headers in map service

### Search returns no results
- Verify PostGIS extension is enabled
- Check database has POI data
- Ensure trigram extension is installed

### Routes not working
- Verify OSRM server is running
- Check OSRM data files are loaded
- Ensure coordinates are in correct format (lat,lng)

## License

Proprietary - Super App Ethiopia
