// Generate OG PNG using resvg-js (pure WASM)
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const siteDir = path.join(root, 'santino.ru.com');
const svgPath = path.join(siteDir, 'santino_magneto_outlined.svg');
const outPath = path.join(siteDir, 'santino_og.png');

const svg = fs.readFileSync(svgPath, 'utf8');
const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1200 },
  background: 'transparent',
});
const pngData = resvg.render();
const pngBuffer = pngData.asPng();
fs.writeFileSync(outPath, pngBuffer);
console.log('Generated', outPath, fs.statSync(outPath).size + ' bytes');
