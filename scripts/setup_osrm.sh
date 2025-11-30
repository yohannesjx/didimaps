#!/bin/bash

# OSRM Setup Script for Ethiopia
# This script downloads and processes Ethiopia map data for OSRM routing

set -e

echo "🗺️  OSRM Setup for Ethiopia"
echo "============================"

# Create data directory if it doesn't exist
mkdir -p data
cd data

# Download Ethiopia OSM data
if [ ! -f "ethiopia-latest.osm.pbf" ]; then
    echo "📥 Downloading Ethiopia map data..."
    wget http://download.geofabrik.de/africa/ethiopia-latest.osm.pbf
else
    echo "✅ Ethiopia map data already downloaded"
fi

# Process data for OSRM
echo "🔧 Processing map data for OSRM (this may take a while)..."

echo "  1/3 Extracting..."
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-extract -p /opt/car.lua /data/ethiopia-latest.osm.pbf

echo "  2/3 Partitioning..."
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-partition /data/ethiopia-latest.osrm

echo "  3/3 Customizing..."
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-customize /data/ethiopia-latest.osrm

echo ""
echo "✅ OSRM data processing complete!"
echo ""
echo "Next steps:"
echo "1. Add OSRM service to docker-compose.yml (see ROUTING_IMPLEMENTATION.md)"
echo "2. Run: docker-compose up -d osrm"
echo "3. Test: curl 'http://localhost:5000/route/v1/driving/38.74,9.03;38.75,9.01?overview=full'"
