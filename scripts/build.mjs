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

async function main() {
  log(`ENV=${ENV}${BASE_URL ? ` BASE_URL=${BASE_URL}` : ''}`);
  await cleanOut();
  await copySrc();
  await processHtmlEnv();
  await processCss();
  await processJs();
  log('Done.');
}

main().catch((err) => { console.error(err); process.exit(1); });
