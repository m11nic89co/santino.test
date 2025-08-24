#!/usr/bin/env node
import fs from 'fs-extra';
import path from 'path';

const root = process.cwd();
const srcDemo = path.join(root, 'src', 'lusion-inspired-html');
const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
const dest = path.join(root, 'oldVersions', `${stamp}-lusion-inspired-html`);

(async () => {
  if (!(await fs.pathExists(srcDemo))) {
    console.log('[archive-demo] Nothing to archive: src/lusion-inspired-html not found');
    return;
  }
  await fs.ensureDir(dest);
  await fs.move(srcDemo, path.join(dest, 'lusion-inspired-html'), { overwrite: false });
  console.log(`[archive-demo] Moved src/lusion-inspired-html -> ${path.relative(root, dest)}/lusion-inspired-html`);
})();
