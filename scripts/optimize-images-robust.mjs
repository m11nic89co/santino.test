import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const root = path.resolve('assets/img');
const excludeDir = path.join(root, 'source');
let totalBefore = 0, totalAfter = 0, processed = 0, skipped = 0, errors = 0;

function safeName(name){
  return name.replace(/[\s\\"'()]/g, '_');
}

async function walk(dir){
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for(const e of entries){
    const full = path.join(dir, e.name);
    if(full === excludeDir) continue;
    if(e.isDirectory()) await walk(full);
    else await handleFile(full);
  }
}

async function handleFile(file){
  const ext = path.extname(file).toLowerCase();
  if(['.jpg','.jpeg','.png'].includes(ext)){
    try{
      const stat = await fs.stat(file);
      const before = stat.size;
      const dir = path.dirname(file);
      const base = path.basename(file, ext);
      const tmp = path.join(dir, base + '.tmp' + ext);

      // Try direct processing first
      try{
        await processFile(file, file, ext);
      }catch(e){
        // fallback: copy to safe tmp name and process
        const safe = path.join(dir, safeName(base) + '.tmp' + ext);
        await fs.copyFile(file, safe);
        await processFile(safe, file, ext);
        await fs.unlink(safe).catch(()=>{});
      }

      const statAfter = await fs.stat(file);
      const after = statAfter.size;
      totalBefore += before;
      totalAfter += after;
      processed++;
      console.log(`OK ${path.relative(root,file)}: ${Math.round(before/1024)}KB -> ${Math.round(after/1024)}KB`);

      // create webp sibling
      try{
        const webpPath = path.join(dir, base + '.webp');
        await sharp(file).webp({quality:82}).toFile(webpPath);
      }catch(e){ console.warn('WEBP_FAILED', file, e.message) }

    }catch(e){
      errors++;
      console.error('ERR process', file, e.message);
    }
  }else{
    skipped++;
  }
}

async function processFile(src, dest, ext){
  if(['.jpg','.jpeg'].includes(ext)){
    await sharp(src).jpeg({mozjpeg:true,quality:82,progressive:true}).toFile(dest + '.opt');
  }else if(ext === '.png'){
    await sharp(src).png({compressionLevel:9}).toFile(dest + '.opt');
  }else{
    throw new Error('unsupported');
  }
  // replace dest with opt file
  await fs.rename(dest + '.opt', dest);
}

(async()=>{
  try{
    await walk(root);
    console.log('\nSummary:');
    console.log('processed', processed, 'skipped', skipped, 'errors', errors);
    console.log('totalBefore KB', Math.round(totalBefore/1024), 'totalAfter KB', Math.round(totalAfter/1024), 'saved KB', Math.round((totalBefore-totalAfter)/1024));
    process.exit(0);
  }catch(e){
    console.error('FATAL', e);
    process.exit(2);
  }
})();
