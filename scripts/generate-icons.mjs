/**
 * Generates placeholder PWA icons for The Nazirah App.
 * Creates solid #0F4C3A (deep green) PNGs in client/public/.
 * Run automatically via `npm install` (postinstall script).
 */
import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '../client/public');

// Check if icons already exist
const icon192 = join(publicDir, 'pwa-192x192.png');
const icon512 = join(publicDir, 'pwa-512x512.png');
const iconApple = join(publicDir, 'apple-touch-icon.png');

if (existsSync(icon192) && existsSync(icon512) && existsSync(iconApple)) {
  console.log('PWA icons already exist, skipping generation.');
  process.exit(0);
}

try {
  const { PNG } = require('pngjs');
  mkdirSync(publicDir, { recursive: true });

  // Brand green: #0F4C3A = rgb(15, 76, 58)
  const [R, G, B] = [0x0F, 0x4C, 0x3A];

  function createSolidPNG(width, height) {
    const png = new PNG({ width, height, filterType: -1 });
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (width * y + x) * 4;
        png.data[idx]     = R;
        png.data[idx + 1] = G;
        png.data[idx + 2] = B;
        png.data[idx + 3] = 255;
      }
    }
    return PNG.sync.write(png);
  }

  const sizes = [
    [icon192, 192, 192],
    [icon512, 512, 512],
    [iconApple, 180, 180],
  ];

  for (const [path, w, h] of sizes) {
    const buf = createSolidPNG(w, h);
    const { writeFileSync } = await import('fs');
    writeFileSync(path, buf);
  }

  console.log('✓ PWA icons generated in client/public/');
} catch (err) {
  console.warn('Could not generate PWA icons (pngjs may not be installed yet):', err.message);
}
