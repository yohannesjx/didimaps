# Routing System Implementation

## Architecture Overview

```
Flutter App
    ↓ (HTTP)
Server A (Super App Backend)
    ↓ (HTTP /route)
Server B (Map Backend)
    ↓ (HTTP localhost:5000)
OSRM (Docker Container)
```

## Server B (Map Backend) - Routing Service

### Files Created
- `internal/routing/engine.go` - Routing engine abstraction
- `internal/routing/handler.go` - HTTP handler for /route endpoint

### Integration

Add to your main router (e.g., `cmd/server/main.go` or wherever you register routes):

```go
import "your-module/internal/routing"

// Initialize OSRM engine
osrmEngine := routing.NewOSRMEngine("http://localhost:5000")
routingHandler := routing.NewHandler(osrmEngine)

// Register route
http.HandleFunc("/route", routingHandler.GetRoute)
```

### API Endpoint

**GET /route**

Query Parameters:
- `from_lat` (float): Starting latitude
- `from_lon` (float): Starting longitude  
- `to_lat` (float): Destination latitude
- `to_lon` (float): Destination longitude

Success Response (200):
```json
{
  "distance_meters": 3500,
  "duration_seconds": 720,
  "geometry": "encoded_polyline_string",
  "steps": [
    {
      "instruction": "Head on Bole Road",
      "distance_meters": 500,
      "duration_seconds": 60,
      "name": "Bole Road"
    }
  ]
}
```

Error Responses:
- 400: Invalid parameters
- 422: No route found
- 503: Routing engine unavailable

## Server A (Super App Backend) - Routing Client

### Files Created
- `internal/routing/service.go` - Client for map backend routing API

### Usage Example

```go
import "your-module/internal/routing"

// Initialize service (do this once at startup)
routingService := routing.NewService("http://map-backend-url")

// Get route for price estimation
route, err := routingService.GetRoute(
    9.03, 38.74,  // from (Addis Ababa)
    9.01, 38.75,  // to
)
if err != nil {
    // Handle error
}

// Use in price estimator
price := routingService.EstimatePrice(route, 50.0, 10.0, 2.0)
// baseFare=50, perKm=10, perMin=2

// Use in ETA service
eta := routingService.EstimateETA(route) // seconds

// Driver to pickup
driverRoute, _ := routingService.GetDriverToPickupRoute(
    driverLat, driverLon,
    pickupLat, pickupLon,
)

// Pickup to dropoff
tripRoute, _ := routingService.GetPickupToDropoffRoute(
    pickupLat, pickupLon,
    dropoffLat, dropoffLon,
)
```

## OSRM Setup (Docker)

### 1. Download Ethiopia OSM Data

```bash
cd /Users/gashawarega/Documents/Projects/maps/data
wget http://download.geofabrik.de/africa/ethiopia-latest.osm.pbf
```

### 2. Process Data for OSRM

```bash
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-extract -p /opt/car.lua /data/ethiopia-latest.osm.pbf
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-partition /data/ethiopia-latest.osrm
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-customize /data/ethiopia-latest.osrm
```

### 3. Add to docker-compose.yml

```yaml
services:
  osrm:
    image: ghcr.io/project-osrm/osrm-backend
    container_name: osrm
    volumes:
      - ./data:/data
    command: osrm-routed --algorithm mld /data/ethiopia-latest.osrm
    ports:
      - "5000:5000"
    restart: unless-stopped
```

### 4. Start OSRM

```bash
docker-compose up -d osrm
```

### 5. Test OSRM Directly

```bash
curl "http://localhost:5000/route/v1/driving/38.74,9.03;38.75,9.01?overview=full&geometries=polyline&steps=true"
```

## Example Requests & Responses

### Driver → Pickup Route

**Request:**
```bash
curl "http://map-backend/route?from_lat=9.03&from_lon=38.74&to_lat=9.01&to_lon=38.75"
```

**Response:**
```json
{
  "distance_meters": 2800,
  "duration_seconds": 420,
  "geometry": "encoded_polyline...",
  "steps": [
    {
      "instruction": "Head on Bole Road",
      "distance_meters": 800,
      "duration_seconds": 120,
      "name": "Bole Road"
    },
    {
      "instruction": "Turn on Meskel Square",
      "distance_meters": 1200,
      "duration_seconds": 180,
      "name": "Meskel Square"
    },
    {
      "instruction": "Arrive at destination",
      "distance_meters": 800,
      "duration_seconds": 120,
      "name": ""
    }
  ]
}
```

### Pickup → Dropoff Route

**Request:**
```bash
curl "http://map-backend/route?from_lat=9.01&from_lon=38.75&to_lat=9.05&to_lon=38.72"
```

**Response:**
```json
{
  "distance_meters": 5200,
  "duration_seconds": 780,
  "geometry": "encoded_polyline...",
  "steps": [...]
}
```

## Switching from OSRM to Valhalla

To switch routing engines in the future:

### 1. Create Valhalla Engine Implementation

```go
// internal/routing/valhalla_engine.go
type ValhallaEngine struct {
    BaseURL string
    Client  *http.Client
}

func (e *ValhallaEngine) GetRoute(fromLat, fromLon, toLat, toLon float64) (*RouteResponse, error) {
    // Call Valhalla API
    // Parse Valhalla response
    // Convert to RouteResponse (same format as OSRM)
    return &RouteResponse{...}, nil
}
```

### 2. Update Server B Initialization

```go
// Change this line:
osrmEngine := routing.NewOSRMEngine("http://localhost:5000")

// To this:
valhallaEngine := routing.NewValhallaEngine("http://localhost:8002")

routingHandler := routing.NewHandler(valhallaEngine)
```

### 3. What DOESN'T Change

- ✅ Server A code (no changes needed)
- ✅ Flutter app (no changes needed)
- ✅ API contract (/route endpoint JSON format)
- ✅ RouteResponse struct
- ✅ Database schemas
- ✅ Price estimation logic

Only the internal implementation in Server B changes!

## Performance Benchmarks

Expected performance for typical urban trips (<20km):

- OSRM response time: 10-50ms
- Network overhead: 5-20ms
- Total Server B response: 15-70ms ✅ (well under 100ms target)

## Monitoring & Logging

All routing requests are logged with:
- Request coordinates
- Response time
- Distance/duration
- Error details (if any)

Example log:
```
[ROUTING] Request: from=(9.030000,38.740000) to=(9.010000,38.750000)
[ROUTING] Success: 2800m, 420s, 3 steps
```

## Error Handling

| Error | HTTP Code | When |
|-------|-----------|------|
| Invalid coordinates | 400 | Bad input |
| No route found | 422 | Points not reachable |
| OSRM down | 503 | Service unavailable |

## Production Checklist

- [ ] OSRM container running and healthy
- [ ] Ethiopia map data processed
- [ ] /route endpoint registered in Server B
- [ ] Routing service initialized in Server A
- [ ] Environment variable for map backend URL
- [ ] Monitoring/alerting for OSRM health
- [ ] Log rotation configured
- [ ] Rate limiting on /route endpoint (optional)
