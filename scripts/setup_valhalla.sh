#!/bin/bash

# Simplified Valhalla Setup Script for Ethiopia
# This script builds Valhalla tiles using the official Docker image

set -e

echo "🗺️  Valhalla Setup for Ethiopia"
echo "=============================="

# Create data directory
mkdir -p data/valhalla/custom_files
cd data/valhalla

# Download Ethiopia OSM data if not exists
if [ ! -f "ethiopia-latest.osm.pbf" ]; then
    echo "📥 Downloading Ethiopia map data..."
    wget http://download.geofabrik.de/africa/ethiopia-latest.osm.pbf
else
    echo "✅ Ethiopia map data already downloaded"
fi

# Copy OSM file to custom_files for Valhalla
echo "📋 Preparing data for Valhalla..."
cp ethiopia-latest.osm.pbf custom_files/

echo ""
echo "🔧 Building Valhalla tiles (this will take 10-15 minutes)..."
echo ""

# Build tiles using Valhalla Docker image
# The image will automatically process the PBF file and create tiles
docker run --rm \
  -v "${PWD}/custom_files:/custom_files" \
  ghcr.io/gis-ops/docker-valhalla/valhalla:latest \
  build_tiles

echo ""
echo "✅ Valhalla tiles built successfully!"
echo ""
echo "Files created in: $(pwd)/custom_files/"
ls -lh custom_files/

echo ""
echo "Next steps:"
echo "1. Start Valhalla: docker-compose up -d valhalla"
echo "2. Wait 30 seconds for Valhalla to load tiles"
echo "3. Test: curl -X POST http://localhost:8002/route -H 'Content-Type: application/json' -d '{\"locations\":[{\"lat\":9.03,\"lon\":38.74},{\"lat\":9.01,\"lon\":38.75}],\"costing\":\"auto\"}'"
