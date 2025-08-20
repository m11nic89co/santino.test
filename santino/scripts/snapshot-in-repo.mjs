import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const root = process.cwd();
const OUT = path.join(root, 'public');
const SNAP_ROOT = path.join(root, 'oldVersions');

function ts() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function main() {
  if (!(await fs.pathExists(OUT))) {
    throw new Error('public/ not found. Build or export first.');
  }
  await fs.ensureDir(SNAP_ROOT);
  const device = (os.hostname() || 'device').replace(/[^A-Za-z0-9_.-]+/g, '-');
  const stamp = ts();
  const target = path.join(SNAP_ROOT, `${stamp}-${device}`);
  await fs.ensureDir(target);
  await fs.copy(OUT, target, { overwrite: true });

  // Metadata
  let commit = '';
  try { commit = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim(); } catch { commit = 'unknown'; }
  const meta = [
    `Snapshot: ${stamp}`,
    `Device: ${device}`,
    `Commit: ${commit}`,
    `Source: public/`,
    `Note: Repository snapshot (not zipped).`,
    ''
  ].join('\n');
  await fs.writeFile(path.join(target, 'SNAPSHOT.txt'), meta, 'utf8');

  console.log('[snapshot] Created:', path.relative(root, target));
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
