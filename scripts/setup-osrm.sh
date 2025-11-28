#!/bin/bash
# OSRM Data Setup Script for Addis Ababa
# Run this on your server to prepare OSRM routing data

set -e

DATA_DIR="./data/osrm"
PBF_URL="https://download.geofabrik.de/africa/ethiopia-latest.osm.pbf"
PBF_FILE="ethiopia-latest.osm.pbf"

echo "=== OSRM Data Setup (Ethiopia/Addis) ==="

# Create data directory
mkdir -p $DATA_DIR
cd $DATA_DIR

# Download OSM data
echo "Downloading Ethiopia OSM data..."
curl -L -o $PBF_FILE $PBF_URL

# Extract
echo "Extracting OSM data..."
docker run -t -v $(pwd):/data ghcr.io/project-osrm/osrm-backend:v5.27.1 \
  osrm-extract -p /opt/car.lua /data/$PBF_FILE

# Partition
echo "Partitioning..."
docker run -t -v $(pwd):/data ghcr.io/project-osrm/osrm-backend:v5.27.1 \
  osrm-partition /data/ethiopia-latest.osrm

# Customize
echo "Customizing..."
docker run -t -v $(pwd):/data ghcr.io/project-osrm/osrm-backend:v5.27.1 \
  osrm-customize /data/ethiopia-latest.osrm

# Rename to match docker-compose expectation
mv ethiopia-latest.osrm monaco.osrm 2>/dev/null || true
for f in ethiopia-latest.osrm.*; do
  mv "$f" "${f/ethiopia-latest/monaco}" 2>/dev/null || true
done

echo "=== OSRM Setup Complete ==="
echo "You can now start the services with: docker-compose up -d"
