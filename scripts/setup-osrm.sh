#!/bin/bash
# OSRM Data Setup Script for Addis Ababa
# Run this on your server to prepare OSRM routing data

set -e

DATA_DIR="./data/osrm"
PBF_URL="https://download.geofabrik.de/africa/ethiopia/addis-ababa-latest.osm.pbf"
PBF_FILE="addis-ababa-latest.osm.pbf"

echo "=== OSRM Data Setup (Addis Ababa) ==="

# Create data directory
mkdir -p $DATA_DIR
cd $DATA_DIR

# Download OSM data
echo "Downloading Addis Ababa OSM data..."
curl -L -o $PBF_FILE $PBF_URL

# Extract
echo "Extracting OSM data..."
docker run -t -v $(pwd):/data ghcr.io/project-osrm/osrm-backend:v5.27.1 \
  osrm-extract -p /opt/car.lua /data/$PBF_FILE

# Partition
echo "Partitioning..."
docker run -t -v $(pwd):/data ghcr.io/project-osrm/osrm-backend:v5.27.1 \
  osrm-partition /data/addis-ababa-latest.osrm

# Customize
echo "Customizing..."
docker run -t -v $(pwd):/data ghcr.io/project-osrm/osrm-backend:v5.27.1 \
  osrm-customize /data/addis-ababa-latest.osrm

# Rename to match docker-compose expectation
mv addis-ababa-latest.osrm monaco.osrm 2>/dev/null || true
for f in addis-ababa-latest.osrm.*; do
  mv "$f" "${f/addis-ababa-latest/monaco}" 2>/dev/null || true
done

echo "=== OSRM Setup Complete (Addis Ababa) ==="
echo "You can now start the services with: docker-compose up -d"
