# Routing System Deployment Guide

## 📦 What Was Pushed

The following files are now on GitHub (main branch):
- `api/internal/routing/engine.go` - Routing engine abstraction
- `api/internal/routing/handler.go` - HTTP handler
- `scripts/setup_osrm.sh` - OSRM setup automation
- `ROUTING_IMPLEMENTATION.md` - Technical documentation
- `ROUTING_SUMMARY.md` - Quick start guide
- `FLUTTER_ROUTING_INTEGRATION.dart` - Flutter examples

## 🚀 Deployment Steps on Map Server

### Step 1: Pull Latest Code

SSH into your map server and pull the changes:

```bash
ssh user@your-map-server
cd /path/to/maps  # Your maps project directory
git pull origin main
```

### Step 2: Run OSRM Setup Script

This will download Ethiopia map data (~50MB) and process it for OSRM (~5-10 minutes):

```bash
cd /path/to/maps
chmod +x scripts/setup_osrm.sh
./scripts/setup_osrm.sh
```

**What this does:**
- Downloads `ethiopia-latest.osm.pbf` to `data/` directory
- Processes it with OSRM (extract, partition, customize)
- Creates `.osrm` files needed by OSRM server

### Step 3: Update docker-compose.yml

Add OSRM service to your `docker-compose.yml`:

```yaml
services:
  # ... your existing services (postgres, api, etc.) ...

  osrm:
    image: ghcr.io/project-osrm/osrm-backend
    container_name: osrm
    volumes:
      - ./data:/data
    command: osrm-routed --algorithm mld /data/ethiopia-latest.osrm
    ports:
      - "5000:5000"
    restart: unless-stopped
    networks:
      - map-network  # Use your existing network
```

### Step 4: Update Map API Code

In your `api/cmd/server/main.go` (or wherever you initialize routes), add:

```go
import (
    // ... your existing imports ...
    "github.com/yohannesjx/didimaps/api/internal/routing"
)

func main() {
    // ... your existing setup ...

    // Initialize routing
    osrmEngine := routing.NewOSRMEngine("http://osrm:5000")
    routingHandler := routing.NewHandler(osrmEngine)

    // Register route endpoint
    router.HandleFunc("/route", routingHandler.GetRoute).Methods("GET")

    // ... rest of your server code ...
}
```

### Step 5: Rebuild and Restart Services

```bash
# Stop services
docker-compose down

# Rebuild API (to include new routing code)
docker-compose build api

# Start all services including OSRM
docker-compose up -d
```

### Step 6: Verify OSRM is Running

```bash
# Check OSRM logs
docker logs osrm

# Test OSRM directly
curl "http://localhost:5000/route/v1/driving/38.74,9.03;38.75,9.01?overview=full"
```

You should see a JSON response with route data.

### Step 7: Test Map API Endpoint

```bash
curl "http://localhost:PORT/route?from_lat=9.03&from_lon=38.74&to_lat=9.01&to_lon=38.75"
```

Expected response:
```json
{
  "distance_meters": 2800,
  "duration_seconds": 420,
  "geometry": "encoded_polyline...",
  "steps": [...]
}
```

## 🔧 Configuration Notes

### OSRM Memory Usage

OSRM for Ethiopia uses approximately:
- **Disk**: ~200MB (processed .osrm files)
- **RAM**: ~500MB-1GB (when running)

Make sure your server has enough resources.

### Port Configuration

- OSRM runs on port `5000` by default
- Map API exposes `/route` endpoint on your API port
- Adjust ports in docker-compose if needed

### Network Configuration

If using Docker networks, ensure OSRM is on the same network as your API:

```yaml
networks:
  map-network:
    driver: bridge

services:
  api:
    networks:
      - map-network
  
  osrm:
    networks:
      - map-network
```

## 🐛 Troubleshooting

### OSRM won't start

```bash
# Check if .osrm files exist
ls -lh data/*.osrm*

# If missing, re-run setup script
./scripts/setup_osrm.sh
```

### API can't reach OSRM

```bash
# Check if OSRM container is running
docker ps | grep osrm

# Check OSRM logs
docker logs osrm

# Test from API container
docker exec -it your-api-container curl http://osrm:5000/route/v1/driving/38.74,9.03;38.75,9.01
```

### Route endpoint returns 404

Make sure you:
1. Imported the routing package
2. Registered the handler
3. Rebuilt the API container
4. Restarted services

## 📊 Monitoring

Add logging to track routing requests:

```bash
# Watch API logs
docker logs -f your-api-container

# Look for:
# [ROUTING] Request: from=(9.03,38.74) to=(9.01,38.75)
# [ROUTING] Success: 2800m, 420s, 3 steps
```

## 🔄 Next Steps After Deployment

1. **Test from Flutter app** - Update backend URL and test
2. **Monitor performance** - Check response times
3. **Set up alerts** - Monitor OSRM health
4. **Plan for updates** - Schedule map data updates (monthly recommended)

## 📝 Map Data Updates

To update Ethiopia map data (recommended monthly):

```bash
cd /path/to/maps/data
rm ethiopia-latest.osm.pbf
rm ethiopia-latest.osrm*
cd ..
./scripts/setup_osrm.sh
docker-compose restart osrm
```

## 🆘 Need Help?

Check these files:
- `ROUTING_IMPLEMENTATION.md` - Detailed technical guide
- `ROUTING_SUMMARY.md` - Quick reference
- OSRM docs: https://github.com/Project-OSRM/osrm-backend

---

**After deployment, your map server will:**
✅ Serve real road-following routes
✅ Support price estimation
✅ Provide turn-by-turn navigation data
✅ Run completely self-hosted (no external APIs)
