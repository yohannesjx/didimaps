#!/bin/bash
set -e

DATA_DIR="./data/osrm"
PBF_URL="https://download.geofabrik.de/africa/ethiopia-latest.osm.pbf"
FULL_PBF="$DATA_DIR/ethiopia-latest.osm.pbf"
ADDIS_PBF="$DATA_DIR/addis-ababa.osm.pbf"
OSRM_FILE="$DATA_DIR/addis-ababa.osrm"

# Bounding box for Addis Ababa (min_lon,min_lat,max_lon,max_lat)
BBOX="38.60,8.80,38.95,9.10"

echo "🚀 Starting OSRM setup for Addis Ababa..."

# 1. Create directory
mkdir -p "$DATA_DIR"

# 2. Clean up old Monaco files
echo "🧹 Cleaning up old Monaco data..."
rm -f "$DATA_DIR"/monaco*
rm -f "$DATA_DIR"/addis-ababa*

# 3. Download Ethiopia PBF
if [ ! -f "$FULL_PBF" ]; then
    echo "📥 Downloading Ethiopia PBF..."
    curl -L "$PBF_URL" -o "$FULL_PBF"
else
    echo "✅ Ethiopia PBF already exists."
fi

# 4. Clip to Addis Ababa using Osmium (Docker)
echo "✂️ Clipping map data to Addis Ababa ($BBOX)..."
docker run --rm -v "$(pwd)/$DATA_DIR":/data stefda/osmium-tool \
    osmium extract -b $BBOX /data/ethiopia-latest.osm.pbf -o /data/addis-ababa.osm.pbf --overwrite

# 5. Preprocess with OSRM (MLD Algorithm)
echo "⚙️ Running OSRM Extract..."
docker run --rm -v "$(pwd)/$DATA_DIR":/data ghcr.io/project-osrm/osrm-backend:v5.27.1 \
    osrm-extract -p /opt/car.lua /data/addis-ababa.osm.pbf

echo "⚙️ Running OSRM Partition..."
docker run --rm -v "$(pwd)/$DATA_DIR":/data ghcr.io/project-osrm/osrm-backend:v5.27.1 \
    osrm-partition /data/addis-ababa.osrm

echo "⚙️ Running OSRM Customize..."
docker run --rm -v "$(pwd)/$DATA_DIR":/data ghcr.io/project-osrm/osrm-backend:v5.27.1 \
    osrm-customize /data/addis-ababa.osrm

# 6. Cleanup large PBF
echo "🧹 Removing full Ethiopia PBF to save space..."
rm -f "$FULL_PBF"

echo "✅ OSRM Setup Complete! Ready to start service."
