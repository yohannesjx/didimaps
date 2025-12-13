#!/bin/bash
# Script to add UAE map data to the existing map (Ethiopia/Addis)
# Run this on your map server (VPS)

set -e

# Configuration
PROJECT_DIR="${PROJECT_DIR:-/root/map/didimaps}"
DATA_DIR="$PROJECT_DIR/data"
# Using OpenStreetMap France mirror
UAE_PBF_URL="https://download.openstreetmap.fr/extracts/asia/united_arab_emirates-latest.osm.pbf"
UAE_PBF_FILE="uae-latest.osm.pbf"
ETH_PBF_FILE="ethiopia-latest.osm.pbf" # Existing file
OUTPUT_FILE="addis.mbtiles" # Final output
TEMP_OUTPUT_FILE="addis_temp.mbtiles" # Temporary output file (must end in .mbtiles)

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "=== Starting Combined Map Data Setup ==="

# Ensure directories exist
mkdir -p "$DATA_DIR/osrm" "$DATA_DIR/tiles"

# 1. Download UAE PBF
log "Downloading UAE OSM data from OpenStreetMap France mirror..."
# -L allows following redirects
# -f fails on HTTP errors
curl -L -f -o "$DATA_DIR/osrm/$UAE_PBF_FILE.new" "$UAE_PBF_URL"

# Check if download succeeded
FILE_SIZE=$(stat -c%s "$DATA_DIR/osrm/$UAE_PBF_FILE.new" 2>/dev/null || stat -f%z "$DATA_DIR/osrm/$UAE_PBF_FILE.new")

# Validate file size (should be >10MB)
if [ "$FILE_SIZE" -lt 10000000 ]; then
    log "ERROR: Downloaded file too small ($FILE_SIZE bytes). Aborting."
    log "Content of small file (first 100 bytes):"
    head -c 100 "$DATA_DIR/osrm/$UAE_PBF_FILE.new"
    rm -f "$DATA_DIR/osrm/$UAE_PBF_FILE.new"
    exit 1
fi
mv "$DATA_DIR/osrm/$UAE_PBF_FILE.new" "$DATA_DIR/osrm/$UAE_PBF_FILE"
log "Download complete: $FILE_SIZE bytes"

# 2. Check for existing Ethiopia data
ARGS=""
if [ -f "$DATA_DIR/osrm/$ETH_PBF_FILE" ]; then
    log "Found existing Ethiopia data. Merging with UAE..."
    ARGS="--osm-path=$DATA_DIR/osrm/$ETH_PBF_FILE --osm-path=$DATA_DIR/osrm/$UAE_PBF_FILE"
else
    log "Ethiopia data not found. Using only UAE data..."
    ARGS="--osm-path=$DATA_DIR/osrm/$UAE_PBF_FILE"
fi

# 3. Generate Combined Vector Tiles
log "Generating combined vector tiles..."

if [ -f "$PROJECT_DIR/planetiler/planetiler.jar" ]; then
    cd "$PROJECT_DIR/planetiler"
    
    # Planetiler requires .mbtiles extension to infer format
    java -Xmx8g -jar planetiler.jar \
        $ARGS \
        --download \
        --output="$DATA_DIR/tiles/$TEMP_OUTPUT_FILE" \
        --force \
        --min-zoom=0 \
        --max-zoom=14
        
    log "Tiles generated at $DATA_DIR/tiles/$TEMP_OUTPUT_FILE"
    
    # Backup old file
    if [ -f "$DATA_DIR/tiles/$OUTPUT_FILE" ]; then
        mv "$DATA_DIR/tiles/$OUTPUT_FILE" "$DATA_DIR/tiles/$OUTPUT_FILE.bak"
    fi
    mv "$DATA_DIR/tiles/$TEMP_OUTPUT_FILE" "$DATA_DIR/tiles/$OUTPUT_FILE"
    
    log "Restarting tileserver..."
    cd "$PROJECT_DIR"
    docker-compose restart tileserver
    
    log "Map update complete. The map now serves combined data."
else
    log "ERROR: planetiler.jar not found at $PROJECT_DIR/planetiler/planetiler.jar"
    exit 1
fi
