// Generate santino_og.png from the vector logo using Sharp (libvips)
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

(async () => {
  const root = path.resolve(__dirname, '..');
  const siteDir = path.join(root, 'santino.ru.com');
  const svgPath = path.join(siteDir, 'santino_magneto_outlined.svg');
  const outPath = path.join(siteDir, 'santino_og.png');

  if (!fs.existsSync(svgPath)) {
    console.error('SVG not found:', svgPath);
    process.exit(1);
  }

  try {
    const svgBuffer = fs.readFileSync(svgPath);
    // Render to 1200x630 as required by Open Graph best practices
    const png = await sharp(svgBuffer, { density: 300 })
      .resize(1200, 630, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();

    fs.writeFileSync(outPath, png);
    const bytes = fs.statSync(outPath).size;
    console.log('Generated', outPath, bytes + ' bytes');
  } catch (err) {
    console.error('Failed to generate OG image:', err);
    process.exit(1);
  }
})();
