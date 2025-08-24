#!/usr/bin/env node
import fs from 'fs-extra';
import path from 'path';

const root = process.cwd();
const targets = [
  'public/lusion-inspired-html',
  'santino.ru.com/lusion-inspired-html',
  'public/.github/workflows/pages.yml',
  'santino.ru.com/.github/workflows/pages.yml',
];

(async () => {
  const removed = [];
  for (const rel of targets) {
    const p = path.join(root, rel);
    try {
      if (await fs.pathExists(p)) {
        const stat = await fs.stat(p);
        if (stat.isDirectory()) await fs.remove(p);
        else await fs.remove(p);
        removed.push(rel);
      }
    } catch (e) {
      console.error(`[cleanup-demo] Failed to remove ${rel}:`, e.message);
    }
  }
  if (removed.length) {
    console.log(`[cleanup-demo] Removed: \n - ${removed.join('\n - ')}`);
  } else {
    console.log('[cleanup-demo] Nothing to remove.');
  }
})();
