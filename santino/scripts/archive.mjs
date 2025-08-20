import fs from 'fs-extra';
import path from 'path';
import archiver from 'archiver';
import os from 'os';

const root = process.cwd();
const OUT = path.join(root, 'public');
const ARCH = path.join(root, 'oldVersions');
const date = new Date();
const yyyy = date.getFullYear();
const mm = String(date.getMonth() + 1).padStart(2, '0');
const dd = String(date.getDate()).padStart(2, '0');
const hh = String(date.getHours()).padStart(2, '0');
const min = String(date.getMinutes()).padStart(2, '0');
const ss = String(date.getSeconds()).padStart(2, '0');

function getCliArg(name) {
  const pref = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(pref));
  if (hit) return hit.slice(pref.length);
  const idx = process.argv.findIndex(a => a === `--${name}` || a === `-${name[0]}`);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return undefined;
}

const rawDevice = getCliArg('device') || process.env.ARCH_DEVICE || `${os.platform()}-${os.hostname()}`;
const device = String(rawDevice)
  .toLowerCase()
  .replace(/[^a-z0-9._-]+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^[-.]+|[-.]+$/g, '')
  || 'device';

let baseName = `${yyyy}-${mm}-${dd}-${hh}${min}${ss}-${device}.zip`;
let destPath = path.join(ARCH, baseName);

async function zipDir(src, dest) {
  await fs.ensureDir(path.dirname(dest));
  const output = fs.createWriteStream(dest);
  const archive = archiver('zip', { zlib: { level: 9 } });
  return new Promise((resolve, reject) => {
    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));
    archive.pipe(output);
    archive.directory(src, false);
    archive.finalize();
  });
}

async function main() {
  if (!await fs.pathExists(OUT)) {
    console.error('public/ does not exist. Run build first.');
    process.exit(2);
  }
  // если файл с таким именем уже есть (двойной запуск в одну минуту), добавим суффикс -1, -2, ...
  let attempt = 0;
  while (await fs.pathExists(destPath)) {
    attempt += 1;
    const name = baseName.replace(/\.zip$/, `-${attempt}.zip`);
    destPath = path.join(ARCH, name);
  }
  await zipDir(OUT, destPath);
  console.log(`Archived ${OUT} -> ${destPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
