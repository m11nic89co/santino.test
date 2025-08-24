#!/usr/bin/env node
import { promises as fsp } from 'fs';
import path from 'path';

const root = process.cwd();
const CURENT = path.join(root, 'curentVersion');
const OUT_DIR_NAME = 'filezilla-upload';
const OUT = path.join(CURENT, OUT_DIR_NAME);

async function exists(p) { try { await fsp.access(p); return true } catch (e) { return false } }

async function copyFiltered(src, dest) {
  const st = await fsp.stat(src);
  if (st.isDirectory()) {
    await fsp.mkdir(dest, { recursive: true });
    for (const name of await fsp.readdir(src)) {
      if (name === OUT_DIR_NAME) continue; // don't copy the target into itself
      if (name === 'backup_before_deploy' || name === 'backup_before_cleanup_20250822-202543') continue; // skip backups
      const s = path.join(src, name);
      const d = path.join(dest, name);
      await copyFiltered(s, d);
    }
  } else if (st.isFile()) {
    await fsp.copyFile(src, dest);
  }
}

async function emptyDir(dir) {
  if (!await exists(dir)) return;
  for (const name of await fsp.readdir(dir)) {
    const p = path.join(dir, name);
    await fsp.rm(p, { recursive: true, force: true });
  }
}

async function main() {
  if (!await exists(CURENT)) {
    console.error('curentVersion directory not found at', CURENT);
    process.exit(2);
  }

  // create or clear output folder
  if (await exists(OUT)) {
    await emptyDir(OUT);
  } else {
    await fsp.mkdir(OUT, { recursive: true });
  }

  // copy everything from curentVersion into OUT, excluding OUT itself and backup dirs
  const entries = await fsp.readdir(CURENT);
  for (const name of entries) {
    if (name === OUT_DIR_NAME) continue;
    if (name === 'backup_before_deploy' || name === 'backup_before_cleanup_20250822-202543') continue;
    const s = path.join(CURENT, name);
    const d = path.join(OUT, name);
    await copyFiltered(s, d);
  }

  console.log('Prepared FileZilla upload folder:', OUT);
}

main().catch((err) => { console.error('Failed:', err && err.message ? err.message : err); process.exit(1); });
