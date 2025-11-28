#!/bin/bash
set -e

echo "Downloading Dark Matter Style..."
curl -sL https://raw.githubusercontent.com/openmaptiles/dark-matter-gl-style/master/style.json -o frontend-next/public/map-assets/style.json

echo "Updating Style Configuration..."
# We need to replace the sources, sprite, and glyphs.
# Using a temporary python script for reliable JSON manipulation would be better, but sed is faster for simple replacements if we are careful.
# However, the structure might be different. Let's use nodejs since we have it.

cat <<EOF > update_style.js
const fs = require('fs');
const style = JSON.parse(fs.readFileSync('frontend-next/public/map-assets/style.json', 'utf8'));

// Update Sources
style.sources = {
  "openmaptiles": {
    "type": "vector",
    "tiles": ["https://maps.didi.et/tiles/{z}/{x}/{y}.pbf"],
    "minzoom": 0,
    "maxzoom": 14
  }
};

// Update Sprite and Glyphs
style.sprite = "https://maps.didi.et/map-assets/sprites/sprite";
style.glyphs = "https://maps.didi.et/map-assets/fonts/{fontstack}/{range}.pbf";

fs.writeFileSync('frontend-next/public/map-assets/style.json', JSON.stringify(style, null, 2));
console.log('Style updated successfully.');
EOF

node update_style.js
rm update_style.js
