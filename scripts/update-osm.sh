#!/bin/bash
# Automated OSM Update Script for Ethiopia/Addis Ababa
# Run via cron: 0 3 * * 0 /path/to/update-osm.sh >> /var/log/osm-update.log 2>&1

set -e

# Configuration
PROJECT_DIR="${PROJECT_DIR:-/root/map/didimaps}"
DATA_DIR="$PROJECT_DIR/data"
PBF_URL="https://download.geofabrik.de/africa/ethiopia-latest.osm.pbf"
PBF_FILE="ethiopia-latest.osm.pbf"
ADDIS_BOUNDS="38.6,8.8,39.1,9.2"

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "=== Starting OSM Update ==="

cd "$PROJECT_DIR"

# 1. Download latest Ethiopia PBF
log "Downloading latest Ethiopia OSM data..."
curl -L -o "$DATA_DIR/osrm/$PBF_FILE.new" "$PBF_URL"

# Check if download succeeded (file should be > 10MB)
FILE_SIZE=$(stat -c%s "$DATA_DIR/osrm/$PBF_FILE.new" 2>/dev/null || stat -f%z "$DATA_DIR/osrm/$PBF_FILE.new")
if [ "$FILE_SIZE" -lt 10000000 ]; then
    log "ERROR: Downloaded file too small ($FILE_SIZE bytes). Aborting."
    rm -f "$DATA_DIR/osrm/$PBF_FILE.new"
    exit 1
fi

# Replace old PBF
mv "$DATA_DIR/osrm/$PBF_FILE.new" "$DATA_DIR/osrm/$PBF_FILE"
log "Download complete: $FILE_SIZE bytes"

# 2. Update OSRM
log "Rebuilding OSRM routing data..."
cd "$DATA_DIR/osrm"

# Extract
docker run --rm -t -v $(pwd):/data ghcr.io/project-osrm/osrm-backend:v5.27.1 \
    osrm-extract -p /opt/car.lua /data/$PBF_FILE

# Partition
docker run --rm -t -v $(pwd):/data ghcr.io/project-osrm/osrm-backend:v5.27.1 \
    osrm-partition /data/ethiopia-latest.osrm

# Customize
docker run --rm -t -v $(pwd):/data ghcr.io/project-osrm/osrm-backend:v5.27.1 \
    osrm-customize /data/ethiopia-latest.osrm

# Rename to match docker-compose
rm -f monaco.osrm monaco.osrm.*
mv ethiopia-latest.osrm monaco.osrm 2>/dev/null || true
for f in ethiopia-latest.osrm.*; do
    mv "$f" "${f/ethiopia-latest/monaco}" 2>/dev/null || true
done

log "OSRM rebuild complete"

# 3. Update Tiles with Planetiler
log "Rebuilding vector tiles..."
cd "$PROJECT_DIR/planetiler"

java -Xmx8g -jar planetiler.jar \
    --area=ethiopia \
    --osm-path="$DATA_DIR/osrm/$PBF_FILE" \
    --download \
    --output="$DATA_DIR/tiles/addis.mbtiles.new" \
    --bounds="$ADDIS_BOUNDS" \
    --min-zoom=0 \
    --max-zoom=14

# Replace old tiles
mv "$DATA_DIR/tiles/addis.mbtiles.new" "$DATA_DIR/tiles/addis.mbtiles"
log "Tiles rebuild complete"

# 4. Restart services to pick up new data
log "Restarting services..."
cd "$PROJECT_DIR"
docker-compose restart osrm tileserver

log "=== OSM Update Complete ==="

# Optional: Send notification (uncomment and configure)
# curl -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" \
#     -d "chat_id=<CHAT_ID>&text=OSM Update completed successfully"
