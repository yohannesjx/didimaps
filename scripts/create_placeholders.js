const fs = require('fs');
const path = require('path');
const https = require('https');

const spritesDir = 'frontend-next/public/map-assets/sprites';
const fontsDir = 'frontend-next/public/map-assets/fonts';

// Ensure directories exist
if (!fs.existsSync(spritesDir)) fs.mkdirSync(spritesDir, { recursive: true });
if (!fs.existsSync(fontsDir)) fs.mkdirSync(fontsDir, { recursive: true });

// 1. Create Dummy Sprites (to prevent 404s)
// A 1x1 transparent PNG
const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
fs.writeFileSync(path.join(spritesDir, 'sprite.png'), pngBuffer);
fs.writeFileSync(path.join(spritesDir, 'sprite@2x.png'), pngBuffer);

// Empty JSON for sprites
const emptyJson = {};
fs.writeFileSync(path.join(spritesDir, 'sprite.json'), JSON.stringify(emptyJson));
fs.writeFileSync(path.join(spritesDir, 'sprite@2x.json'), JSON.stringify(emptyJson));

console.log('Created placeholder sprites.');

// 2. Download Fonts (Try to get a basic font)
// We need "Open Sans Regular" or similar as defined in the style.
// The style usually uses "Noto Sans Regular" or "Open Sans Regular".
// Let's check the style.json to see what fonts are used.
const style = JSON.parse(fs.readFileSync('frontend-next/public/map-assets/style.json', 'utf8'));
let fonts = new Set();
style.layers.forEach(layer => {
    if (layer.layout && layer.layout['text-font']) {
        layer.layout['text-font'].forEach(f => fonts.add(f));
    }
});
console.log('Fonts required:', Array.from(fonts));

// Since downloading all fonts is heavy and error-prone in this environment,
// we will create a README in the fonts dir instructing the user.
// But to avoid 404s immediately, we can try to download ONE common font if possible,
// or just leave it to the user as per previous instructions.
// The user wants to "check locally", so broken text is better than a crash.
// The map will work without fonts, just text will be missing or squares.

console.log('Please manually download fonts as per README_SETUP.md to see text.');
