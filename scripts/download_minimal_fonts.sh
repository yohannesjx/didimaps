#!/bin/bash
set -e

echo "Downloading Fonts..."
mkdir -p frontend-next/public/map-assets/fonts

# Download Noto Sans Regular
echo "Downloading Noto Sans Regular..."
mkdir -p "frontend-next/public/map-assets/fonts/Noto Sans Regular"
curl -sL https://github.com/openmaptiles/fonts/raw/master/noto-sans/0-255.pbf -o "frontend-next/public/map-assets/fonts/Noto Sans Regular/0-255.pbf"

# Download Metropolis Regular
echo "Downloading Metropolis Regular..."
mkdir -p "frontend-next/public/map-assets/fonts/Metropolis Regular"
curl -sL https://github.com/openmaptiles/fonts/raw/master/metropolis/0-255.pbf -o "frontend-next/public/map-assets/fonts/Metropolis Regular/0-255.pbf"

echo "Fonts downloaded successfully."
