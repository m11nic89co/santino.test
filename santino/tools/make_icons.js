// Generate favicon set and webmanifest from the outlined SVG logo
const path = require('path');
const fs = require('fs');
const favicons = require('favicons');

(async () => {
  const root = path.resolve(__dirname, '..');
  const siteDir = path.join(root, 'santino.ru.com');
  const svgPath = path.join(siteDir, 'santino_magneto_outlined.svg');
  const outDir = siteDir; // write to site root

  if (!fs.existsSync(svgPath)) {
    console.error('SVG not found:', svgPath);
    process.exit(1);
  }

  const configuration = {
    path: '/',
    appName: 'SANTINO',
    appShortName: 'SANTINO',
    appDescription: 'Завод премиальных пластиковых изделий',
    developerName: 'Santino',
    developerURL: null,
    dir: 'auto',
    lang: 'ru-RU',
    background: '#0b0b0b',
    theme_color: '#0b0b0b',
    display: 'standalone',
    orientation: 'any',
    scope: '/',
    start_url: '/',
    version: '1.0',
    icons: {
      android: true,
      appleIcon: true,
      appleStartup: false,
      favicons: true,
      windows: true,
      yandex: false
    },
    logging: false,
    pixel_art: false,
    loadManifestWithCredentials: false,
    manifestMaskable: true
  };

  try {
    const response = await favicons(svgPath, configuration);
    // Write images
    for (const image of response.images) {
      fs.writeFileSync(path.join(outDir, image.name), image.contents);
    }
    // Write files (manifest, browserconfig)
    for (const file of response.files) {
      fs.writeFileSync(path.join(outDir, file.name), file.contents);
    }

    // Ensure a minimal site.webmanifest exists with our name/colors if favicons didn't create one
    const manifestPath = path.join(outDir, 'site.webmanifest');
    if (!fs.existsSync(manifestPath)) {
      const minimal = {
        name: 'SANTINO',
        short_name: 'SANTINO',
        start_url: '/',
        display: 'standalone',
        background_color: '#0b0b0b',
        theme_color: '#0b0b0b',
        icons: [
          { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      };
      fs.writeFileSync(manifestPath, JSON.stringify(minimal, null, 2));
    }

    console.log('Favicons and manifest generated.');
  } catch (err) {
    console.error('Favicons generation failed:', err.message || err);
    process.exit(1);
  }
})();
