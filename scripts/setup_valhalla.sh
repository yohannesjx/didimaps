#!/bin/bash

# Valhalla Setup Script for Ethiopia
# This script downloads and processes Ethiopia map data for Valhalla routing

set -e

echo "🗺️  Valhalla Setup for Ethiopia"
echo "=============================="

# Create data directory if it doesn't exist
mkdir -p data/valhalla
cd data/valhalla

# Download Ethiopia OSM data
if [ ! -f "ethiopia-latest.osm.pbf" ]; then
    echo "📥 Downloading Ethiopia map data..."
    wget http://download.geofabrik.de/africa/ethiopia-latest.osm.pbf
else
    echo "✅ Ethiopia map data already downloaded"
fi

# Create Valhalla config
echo "📝 Creating Valhalla configuration..."
cat > valhalla.json <<EOF
{
  "mjolnir": {
    "tile_dir": "/data/valhalla_tiles",
    "admin": "/data/valhalla_tiles/admin.sqlite",
    "timezone": "/data/valhalla_tiles/tz_world.sqlite",
    "transit_dir": "/data/valhalla_tiles/transit"
  },
  "additional_data": {
    "elevation": "/data/valhalla_tiles/elevation"
  },
  "loki": {
    "actions": ["locate", "route", "height", "sources_to_targets", "optimized_route", "isochrone", "trace_route", "trace_attributes", "transit_available"],
    "logging": {
      "long_request": 100.0
    },
    "service_defaults": {
      "minimum_reachability": 50,
      "radius": 0,
      "search_cutoff": 35000,
      "node_snap_tolerance": 5,
      "street_side_tolerance": 5,
      "street_side_max_distance": 1000,
      "heading_tolerance": 60
    }
  },
  "thor": {
    "logging": {
      "long_request": 110.0
    },
    "source_to_target_algorithm": "select_optimal"
  },
  "odin": {
    "logging": {
      "long_request": 110.0
    }
  },
  "meili": {
    "customizable": ["turn_penalty_factor", "max_route_distance_factor", "max_route_time_factor"],
    "mode": "auto",
    "grid": {
      "cache_size": 100240,
      "size": 500
    },
    "default": {
      "beta": 3,
      "breakage_distance": 2000,
      "geometry": false,
      "gps_accuracy": 5.0,
      "interpolation_distance": 10,
      "max_route_distance_factor": 5,
      "max_route_time_factor": 5,
      "max_search_radius": 200,
      "route": true,
      "search_radius": 50,
      "sigma_z": 4.07,
      "turn_penalty_factor": 200
    },
    "logging": {
      "long_request": 110.0
    },
    "verbose": false
  },
  "service_limits": {
    "auto": {
      "max_distance": 5000000.0,
      "max_locations": 20,
      "max_matrix_distance": 400000.0,
      "max_matrix_location_pairs": 2500
    },
    "pedestrian": {
      "max_distance": 250000.0,
      "max_locations": 50,
      "max_matrix_distance": 200000.0,
      "max_matrix_location_pairs": 2500,
      "max_transit_walking_distance": 10000,
      "min_transit_walking_distance": 1
    },
    "bicycle": {
      "max_distance": 500000.0,
      "max_locations": 50,
      "max_matrix_distance": 200000.0,
      "max_matrix_location_pairs": 2500
    },
    "taxi": {
      "max_distance": 5000000.0,
      "max_locations": 20,
      "max_matrix_distance": 400000.0,
      "max_matrix_location_pairs": 2500
    }
  }
}
EOF

echo ""
echo "🔧 Processing map data for Valhalla (this may take 10-15 minutes)..."
echo ""

# Build Valhalla tiles using Docker
docker run -v "${PWD}:/data" ghcr.io/gis-ops/docker-valhalla/valhalla:latest \
  valhalla_build_config \
  --mjolnir-tile-dir /data/valhalla_tiles \
  --mjolnir-tile-extract /data/valhalla_tiles.tar \
  --mjolnir-timezone /data/valhalla_tiles/tz_world.sqlite \
  --mjolnir-admin /data/valhalla_tiles/admin.sqlite \
  > valhalla_build.json

docker run -v "${PWD}:/data" ghcr.io/gis-ops/docker-valhalla/valhalla:latest \
  valhalla_build_tiles \
  -c /data/valhalla_build.json \
  /data/ethiopia-latest.osm.pbf

echo ""
echo "✅ Valhalla data processing complete!"
echo ""
echo "Next steps:"
echo "1. Add Valhalla service to docker-compose.yml"
echo "2. Run: docker-compose up -d valhalla"
echo "3. Test: curl 'http://localhost:8002/route' -d '{\"locations\":[{\"lat\":9.03,\"lon\":38.74},{\"lat\":9.01,\"lon\":38.75}],\"costing\":\"auto\"}'"
echo ""
echo "Valhalla will be available at: http://localhost:8002"
