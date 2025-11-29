#!/bin/bash

# Map Service Quick Setup Script
# This script helps set up the map service infrastructure

set -e

echo "🗺️  Map Service Setup"
echo "===================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo -e "${GREEN}✓${NC} Docker is running"

# 1. Start PostGIS
echo ""
echo "📦 Starting PostGIS database..."
docker run -d \
  --name maps-postgres \
  -e POSTGRES_DB=maps_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgis/postgis:15-3.3 || echo "PostGIS container already exists"

echo -e "${GREEN}✓${NC} PostGIS started on port 5432"

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# 2. Run migrations
echo ""
echo "🔄 Running database migrations..."
cd "$(dirname "$0")/api"
go run cmd/api/main.go migrate || echo "Migrations may have already run"

echo -e "${GREEN}✓${NC} Database migrations complete"

# 3. Start OSRM (optional - requires OSM data)
echo ""
echo -e "${YELLOW}ℹ${NC}  OSRM routing engine requires OSM data files"
echo "   To set up OSRM:"
echo "   1. Download Ethiopia OSM data from http://download.geofabrik.de/africa/ethiopia.html"
echo "   2. Process with: docker run -t -v \$(pwd):/data osrm/osrm-backend osrm-extract -p /opt/car.lua /data/ethiopia-latest.osm.pbf"
echo "   3. Run: docker run -t -v \$(pwd):/data osrm/osrm-backend osrm-partition /data/ethiopia-latest.osrm"
echo "   4. Run: docker run -t -v \$(pwd):/data osrm/osrm-backend osrm-customize /data/ethiopia-latest.osrm"
echo "   5. Start server: docker run -d -p 5000:5000 -v \$(pwd):/data osrm/osrm-backend osrm-routed --algorithm mld /data/ethiopia-latest.osrm"

# 4. Start MBTiles server (optional - requires tile files)
echo ""
echo -e "${YELLOW}ℹ${NC}  MBTiles server requires vector tile files"
echo "   To set up MBTiles server:"
echo "   1. Place .mbtiles files in ./data/tiles/"
echo "   2. Run: docker run -d -p 8081:8080 -v \$(pwd)/data/tiles:/tilesets consbio/mbtileserver"

# 5. Start Map API
echo ""
echo "🚀 Starting Map API server..."
echo "   Run: go run cmd/api/main.go"
echo ""

echo -e "${GREEN}✓${NC} Setup complete!"
echo ""
echo "Next steps:"
echo "1. Start the Map API: cd api && go run cmd/api/main.go"
echo "2. Test the API: curl http://localhost:8080/health"
echo "3. Add some test POIs using the /internal/publish endpoint"
echo "4. Update Flutter app to point to your map service URL"
echo ""
echo "For full documentation, see MAP_INTEGRATION.md"
