// Simple script to create placeholder icon files
// In production, you would use a proper icon generation tool

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');

// Create a simple base64 encoded 1x1 red pixel PNG for placeholder
const redPixelBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

sizes.forEach(size => {
    const filename = `icon-${size}x${size}.png`;
    const filepath = path.join(iconsDir, filename);

    // Create a simple placeholder file
    // In production, you would generate actual PNG files from SVG
    const buffer = Buffer.from(redPixelBase64, 'base64');
    fs.writeFileSync(filepath, buffer);

    console.log(`Created ${filename}`);
});

console.log('Icon generation complete!');