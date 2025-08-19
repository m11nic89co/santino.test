import fs from 'fs-extra';
import path from 'path';
import fg from 'fast-glob';
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import esbuild from 'esbuild';

const root = process.cwd();
const SRC = path.join(root, 'src');
const OUT = path.join(root, 'public');
const ENV = (process.env.BUILD_ENV || 'test').toLowerCase(); // 'test' | 'prod'
const BASE_URL = process.env.BASE_URL || '';

function log(msg) { console.log(`[build] ${msg}`); }

async function cleanOut() {
  await fs.emptyDir(OUT);
}

async function copySrc() {
  await fs.copy(SRC, OUT, { filter: (src) => {
    const rel = path.relative(SRC, src).replace(/\\/g, '/');
    // Exclude any leftover demos/archives in src just in case
    if (/^lusion-inspired-html\//.test(rel)) return false;
    if (/^oldVersions\//.test(rel)) return false;
    if (/^\.git\//.test(rel)) return false;
    if (/^\.github\//.test(rel)) return false;
    return true;
  }});
}

async function processHtmlEnv() {
  const files = await fg(['**/*.html'], { cwd: OUT, dot: false });
  for (const rel of files) {
    const p = path.join(OUT, rel);
    let html = await fs.readFile(p, 'utf8');
    // robots meta: ensure present and set per env
    const robotsMeta = ENV === 'prod' ? 'index, follow' : 'noindex, nofollow';
    if (/<meta[^>]+name=["']robots["'][^>]*>/i.test(html)) {
      html = html.replace(/<meta[^>]+name=["']robots["'][^>]*>/i, (m) => m.replace(/content=["'][^"']*["']/, `content="${robotsMeta}"`));
    } else {
      html = html.replace(/<head[^>]*>/i, (m) => `${m}\n    <meta name="robots" content="${robotsMeta}">`);
    }
    // og:url if BASE_URL set
    if (BASE_URL) {
      if (/<meta[^>]+property=["']og:url["'][^>]*>/i.test(html)) {
        html = html.replace(/<meta[^>]+property=["']og:url["'][^>]*>/i, `<meta property="og:url" content="${BASE_URL}/">`);
      } else {
        html = html.replace(/<head[^>]*>/i, (m) => `${m}\n    <meta property="og:url" content="${BASE_URL}/">`);
      }
    }
    await fs.writeFile(p, html);
  }
  // robots.txt
  const robotsPath = path.join(OUT, 'robots.txt');
  if (ENV === 'prod') {
    let robots = `User-agent: *\nAllow: /\n`;
    if (BASE_URL) robots += `Sitemap: ${BASE_URL}/sitemap.xml\n`;
    await fs.outputFile(robotsPath, robots);
  } else {
    await fs.outputFile(robotsPath, 'User-agent: *\nDisallow: /\n');
  }
}

async function processCss() {
  const files = await fg(['**/*.css'], { cwd: OUT, dot: false });
  if (!files.length) return;
  const processor = postcss([
    autoprefixer(),
    cssnano({ preset: 'default' }),
  ]);
  for (const rel of files) {
    const p = path.join(OUT, rel);
    const css = await fs.readFile(p, 'utf8');
    const res = await processor.process(css, { from: p, to: p, map: ENV === 'test' ? { inline: false } : false });
    await fs.writeFile(p, res.css);
    if (res.map) await fs.writeFile(p + '.map', res.map.toString());
  }
}

async function processJs() {
  const files = await fg(['**/*.js'], { cwd: OUT, dot: false });
  if (!files.length) return;
  await Promise.all(files.map(async (rel) => {
    const p = path.join(OUT, rel);
    await esbuild.build({
      entryPoints: [p],
      outfile: p,
      minify: true,
      bundle: false, // keep as separate files; adjust to true if you adopt modules
      sourcemap: ENV === 'test',
      target: ['es2019'],
      format: 'esm',
      logLevel: 'error',
    });
  }));
}

async function generateSitemap() {
  const sitemapPath = path.join(OUT, 'sitemap.xml');
  // Only generate meaningful sitemap when BASE_URL is set (required for absolute URLs)
  if (!BASE_URL) {
    await fs.outputFile(
      sitemapPath,
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      `  <!-- Provide BASE_URL to generate absolute URLs. Current build uses placeholders. -->\n` +
      `  <url><loc>/</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>\n` +
      `</urlset>\n`
    );
    log('Sitemap generated without BASE_URL (placeholders).');
    return;
  }

  const htmlFiles = await fg(['**/*.html'], { cwd: OUT, dot: false });
  const now = new Date();
  const items = [];
  for (const rel of htmlFiles) {
    const p = path.join(OUT, rel);
    const stat = await fs.stat(p);
    // map index.html to '/'; others to '/path'
    let urlPath = '/' + rel.replace(/\\/g, '/');
    if (urlPath.endsWith('/index.html')) urlPath = urlPath.slice(0, -'/index.html'.length) || '/';
    else if (urlPath.endsWith('.html')) urlPath = urlPath.slice(0, -'.html'.length);
    const loc = `${BASE_URL}${urlPath}`.replace(/\/*$/, urlPath === '/' ? '/' : '');
    items.push({ loc, lastmod: stat.mtime.toISOString() });
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...items
      .sort((a, b) => a.loc.localeCompare(b.loc))
      .map(it => `  <url><loc>${it.loc}</loc><lastmod>${it.lastmod}</lastmod><changefreq>monthly</changefreq><priority>${it.loc.endsWith('/') ? '0.8' : '0.6'}</priority></url>`),
    '</urlset>',
    ''
  ].join('\n');
  await fs.outputFile(sitemapPath, xml);
  log(`Sitemap generated with ${items.length} entries.`);
}

async function main() {
  log(`ENV=${ENV}${BASE_URL ? ` BASE_URL=${BASE_URL}` : ''}`);
  await cleanOut();
  await copySrc();
  await processHtmlEnv();
  await processCss();
  await processJs();
  await generateSitemap();
  log('Done.');
}

main().catch((err) => { console.error(err); process.exit(1); });
