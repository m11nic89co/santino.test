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

  await uploadDirectory(sftp, OUT, DEST);
  conn.end();
  console.log('[deploy] Uploaded public to', DEST);
}

main().catch((e) => { console.error(e); process.exit(1); });
