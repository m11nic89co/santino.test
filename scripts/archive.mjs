import fs from 'fs-extra';
import path from 'path';
import archiver from 'archiver';

const root = process.cwd();
const OUT = path.join(root, 'public');
const ARCH = path.join(root, 'oldVersions');
const date = new Date();
const yyyy = date.getFullYear();
const mm = String(date.getMonth() + 1).padStart(2, '0');
const dd = String(date.getDate()).padStart(2, '0');
const name = `${yyyy}-${mm}-${dd}.zip`;
const destPath = path.join(ARCH, name);

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
  await zipDir(OUT, destPath);
  console.log(`Archived ${OUT} -> ${destPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
