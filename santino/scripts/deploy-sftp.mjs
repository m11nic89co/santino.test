import fs from 'fs-extra';
import path from 'path';
import fg from 'fast-glob';
import ssh2 from 'ssh2';
const { Client } = ssh2;

const root = process.cwd();
const OUT = path.join(root, 'public');

const HOST = process.env.DEPLOY_HOST;
const PORT = Number(process.env.DEPLOY_PORT || 22);
const USER = process.env.DEPLOY_USER;
const PASS = process.env.DEPLOY_PASS; // or use key
const KEY = process.env.DEPLOY_KEY_PATH ? await fs.readFile(process.env.DEPLOY_KEY_PATH) : undefined;
const DEST = process.env.DEPLOY_REMOTE_DIR; // e.g. /var/www/santino
const PURGE = String(process.env.DEPLOY_PURGE || '').toLowerCase() === 'true';

function req(name, v) { if (!v) throw new Error(`Missing ${name}. Set it in environment or .env file.`); return v; }

async function uploadDirectory(sftp, localDir, remoteDir) {
  // ensure remoteDir exists (mkdir -p)
  const segments = remoteDir.split('/').filter(Boolean);
  let cur = '';
  for (const seg of segments) {
    cur += '/' + seg;
    try { await sftp.mkdir(cur); } catch (_) { /* ignore */ }
  }

  const files = await fg(['**/*'], { cwd: localDir, dot: false, onlyFiles: true });
  for (const rel of files) {
    const local = path.join(localDir, rel);
    const remote = `${remoteDir}/${rel.replace(/\\/g, '/')}`;
    // ensure remote subdir exists
    const rdir = remote.substring(0, remote.lastIndexOf('/'));
    const parts = rdir.split('/').filter(Boolean);
    let acc = '';
    for (const p of parts) { acc += '/' + p; try { await sftp.mkdir(acc); } catch (_) { /* ignore */ } }
    await new Promise((resolve, reject) => {
      sftp.fastPut(local, remote, (err) => err ? reject(err) : resolve());
    });
  }
}

async function listRemoteFiles(sftp, remoteDir) {
  // Return array of relative file paths under remoteDir
  const results = [];
  async function walk(dir, prefix = '') {
    const entries = await new Promise((resolve, reject) => {
      sftp.readdir(dir, (err, list) => err ? reject(err) : resolve(list || []));
    }).catch(() => []);
    for (const e of entries) {
      const name = e.filename;
      if (name === '.' || name === '..') continue;
      const full = `${dir}/${name}`;
      const rel = prefix ? `${prefix}/${name}` : name;
      const isDir = (e.attrs && e.attrs.isDirectory && e.attrs.isDirectory()) || (e.longname || '').startsWith('d');
      if (isDir) {
        await walk(full, rel);
      } else {
        results.push(rel);
      }
    }
  }
  await walk(remoteDir, '');
  return results;
}

async function purgeRemoteExtras(sftp, localDir, remoteDir) {
  const localFiles = await fg(['**/*'], { cwd: localDir, dot: false, onlyFiles: true });
  const remoteFiles = await listRemoteFiles(sftp, remoteDir);
  const localSet = new Set(localFiles.map(f => f.replace(/\\/g, '/')));
  const toDelete = remoteFiles.filter(r => !localSet.has(r));
  if (!toDelete.length) return { deleted: 0 };
  let deleted = 0;
  for (const rel of toDelete) {
    const remote = `${remoteDir}/${rel}`;
    await new Promise((resolve) => {
      sftp.unlink(remote, (err) => resolve());
    });
    deleted++;
  }
  // Attempt to remove now-empty directories (best-effort)
  const dirs = [...new Set(toDelete.map(p => p.split('/').slice(0, -1).join('/')).filter(Boolean))]
    .sort((a,b) => b.length - a.length);
  for (const d of dirs) {
    const full = `${remoteDir}/${d}`;
    await new Promise((resolve) => { sftp.rmdir(full, () => resolve()); });
  }
  return { deleted };
}

async function main() {
  req('DEPLOY_HOST', HOST);
  req('DEPLOY_USER', USER);
  req('DEPLOY_REMOTE_DIR', DEST);
  if (!PASS && !KEY) throw new Error('Provide DEPLOY_PASS or DEPLOY_KEY_PATH');

  const exists = await fs.pathExists(OUT);
  if (!exists) throw new Error('public folder not found. Run build first.');

  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on('ready', resolve)
        .on('error', reject)
        .connect({ host: HOST, port: PORT, username: USER, password: PASS, privateKey: KEY });
  });
  const sftp = await new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => err ? reject(err) : resolve(sftp));
  });

  if (PURGE) {
    const { deleted } = await purgeRemoteExtras(sftp, OUT, DEST);
    console.log(`[deploy] Purge remote extras: ${deleted} files removed`);
  } else {
    console.log('[deploy] Purge disabled (set DEPLOY_PURGE=true to enable)');
  }

  await uploadDirectory(sftp, OUT, DEST);
  conn.end();
  console.log('[deploy] Uploaded public to', DEST);
}

main().catch((e) => { console.error(e); process.exit(1); });
