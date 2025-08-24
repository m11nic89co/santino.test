#!/usr/bin/env node
import fs from 'fs';
import { promises as fsp } from 'fs';
import path from 'path';

const root = process.cwd();
const CURENT = path.join(root, 'curentVersion');

function usage() {
  console.log('Usage: node scripts/deploy-to-curentVersion.mjs [sourceDir]');
  console.log('If sourceDir is omitted the script will use (in order): public, src');
}

async function exists(p) {
  try { await fsp.access(p); return true; } catch (e) { return false; }
}

async function copyRecursive(src, dest) {
  const st = await fsp.stat(src);
  if (st.isDirectory()) {
    await fsp.mkdir(dest, { recursive: true });
    for (const name of await fsp.readdir(src)) {
      await copyRecursive(path.join(src, name), path.join(dest, name));
    }
  } else if (st.isFile()) {
    await fsp.copyFile(src, dest);
  } else if (st.isSymbolicLink()) {
    try {
      const link = await fsp.readlink(src);
      await fsp.symlink(link, dest);
    } catch (e) {
      // ignore
    }
  }
}

async function backupDir(dir) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backupRoot = path.join(root, 'backup_before_deploy');
  const backupPath = path.join(backupRoot, `curentVersion-backup-${ts}`);
  await fsp.mkdir(backupRoot, { recursive: true });
  if (await exists(dir)) {
    await copyRecursive(dir, backupPath);
    return backupPath;
  }
  return null;
}

async function emptyDir(dir) {
  if (!await exists(dir)) return;
  for (const name of await fsp.readdir(dir)) {
    const p = path.join(dir, name);
    await fsp.rm(p, { recursive: true, force: true });
  }
}

async function main() {
  const arg = process.argv[2];
  let sourceCandidates = [];
  if (arg) sourceCandidates.push(arg);
  sourceCandidates.push('public', 'src');

  let source = null;
  for (const s of sourceCandidates) {
    const p = path.join(root, s);
    if (await exists(p)) { source = p; break; }
  }

  if (!source) {
    console.error('No source directory found. Provide a source dir or ensure `public` or `src` exists.');
    usage();
    process.exit(2);
  }

  console.log('Deploy source:', source);
  console.log('Target:', CURENT);

  // backup
  const backup = await backupDir(CURENT);
  if (backup) console.log('Backed up previous curentVersion to', backup);

  // ensure target exists
  await fsp.mkdir(CURENT, { recursive: true });

  // empty target
  await emptyDir(CURENT);

  // copy
  await copyRecursive(source, CURENT);

  console.log('Deploy completed: copied', source, '->', CURENT);
}

main().catch((err) => {
  console.error('Deploy failed:', err && err.message ? err.message : err);
  process.exit(1);
});
