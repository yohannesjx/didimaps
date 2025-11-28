const fs = require('fs');

const stylePath = 'frontend-next/public/map-assets/style.json';
const style = JSON.parse(fs.readFileSync(stylePath, 'utf8'));

// Iterate over all layers and simplify font stacks
style.layers.forEach(layer => {
    if (layer.layout && layer.layout['text-font']) {
        // Force all text to use "Metropolis Regular" since that's what we have
        layer.layout['text-font'] = ["Metropolis Regular"];
    }
});

fs.writeFileSync(stylePath, JSON.stringify(style, null, 2));
console.log('Updated style.json to use only available fonts.');
