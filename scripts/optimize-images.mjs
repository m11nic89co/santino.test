#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const root = path.join(process.cwd(), 'assets', 'img');

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'source') continue; // skip sources
      files.push(...await walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

function human(n){
  if (n < 1024) return n + ' B';
  if (n < 1024*1024) return (n/1024).toFixed(1)+' KB';
  return (n/(1024*1024)).toFixed(2)+' MB';
}

async function optimizeFile(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.svg' || ext === '.gif' || ext === '.webp' || ext === '.ico') return null;
  try {
    const stat = await fs.stat(file);
    const before = stat.size;
    const img = sharp(file);
    if (ext === '.jpg' || ext === '.jpeg') {
      const buf = await img.jpeg({ quality: 82, chromaSubsampling: '4:4:4', mozjpeg: true, progressive: true }).toBuffer();
      await fs.writeFile(file, buf);
      // write webp
      const webpPath = file.replace(/\.(jpe?g)$/i, '.webp');
      await sharp(buf).webp({ quality: 82 }).toFile(webpPath);
      const afterStat = await fs.stat(file);
      return { file, before, after: afterStat.size };
    }
    if (ext === '.png') {
      // re-encode PNG with high compression, then write webp
      const buf = await img.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
      await fs.writeFile(file, buf);
      const webpPath = file.replace(/\.png$/i, '.webp');
      await sharp(buf).webp({ quality: 82 }).toFile(webpPath);
      const afterStat = await fs.stat(file);
      return { file, before, after: afterStat.size };
    }
    return null;
  } catch (err) {
    return { file, error: err.message };
  }
}

async function main(){
  console.log('Scanning', root);
  const files = await walk(root);
  const images = files.filter(f => !f.includes(path.join('assets','img','source')) ).filter(f => /\.(jpe?g|png)$/i.test(f));
  console.log('Found', images.length, 'images to process');
  const results = [];
  for (const f of images) {
    process.stdout.write('Optimizing: ' + path.relative(process.cwd(), f) + ' ... ');
    const r = await optimizeFile(f);
    if (r && r.error) {
      console.log('ERROR:', r.error);
    } else if (r) {
      console.log('done (', human(r.before), '→', human(r.after), ')');
      results.push(r);
    } else {
      console.log('skipped');
    }
  }
  const totalBefore = results.reduce((s,r)=>s+(r.before||0),0);
  const totalAfter = results.reduce((s,r)=>s+(r.after||0),0);
  console.log('\nSummary:');
  console.log('Files optimized:', results.length);
  console.log('Total size:', human(totalBefore), '→', human(totalAfter), ' (saved', human(totalBefore - totalAfter), ')');
}

main().catch(err=>{ console.error(err); process.exit(1) });
