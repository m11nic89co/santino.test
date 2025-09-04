// Image build script: generate desktop/mobile JPG/WEBP/AVIF from a source image with a name prefix
// Usage (Windows PowerShell):
//   node ./scripts/build-images.mjs assets/img/source/collection-source.jpg collection
// Requires: npm i sharp

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [, , srcPath, prefixArg] = process.argv;
if (!srcPath) {
  console.error('Usage: node scripts/build-images.mjs <source-image> [prefix]');
  process.exit(1);
}

const outDir = path.resolve('assets/img');
await fs.promises.mkdir(outDir, { recursive: true });

const src = sharp(srcPath, { failOn: 'none', unlimited: true, sequentialRead: true });
const meta = await src.metadata();

// Decide prefix for output files
const inferred = path.basename(srcPath).toLowerCase().includes('collection') ? 'collection' :
                 path.basename(srcPath).toLowerCase().includes('about') ? 'about' :
                 path.basename(srcPath).toLowerCase().includes('nk2_2198') ? 'about' :
                 'bg';
const prefix = (prefixArg || inferred).replace(/[^a-z0-9_-]/g, '') || 'bg';

// Target sizes
const desktop1x = { w: 2560, h: 1440 };
const desktop2x = { w: 3840, h: 2160 };
const mobile    = { w: 1080, h: 1920 };

// Helper to produce jpg/webp/avif variants
async function emit(baseName, { w, h }) {
  // Use attention-based crop for better subject focus (hands/flowers)
  const pipeline = sharp(srcPath, { sequentialRead: true })
    .resize({ width: w, height: h, fit: 'cover', position: sharp.strategy.attention, fastShrinkOnLoad: true });
  await pipeline.jpeg({ quality: 82, chromaSubsampling: '4:4:4', mozjpeg: true, progressive: true }).toFile(path.join(outDir, `${baseName}.jpg`));
  await pipeline.webp({ quality: 82 }).toFile(path.join(outDir, `${baseName}.webp`));
  await pipeline.avif({ quality: 55 }).toFile(path.join(outDir, `${baseName}.avif`));
}
// Emit using prefix
await emit(`${prefix}-bg-desktop`, desktop1x);
await emit(`${prefix}-bg-desktop@2x`, desktop2x);
await emit(`${prefix}-bg-mobile`, mobile);

console.log(`Images generated for '${prefix}' in`, outDir);
