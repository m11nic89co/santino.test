import fs from 'fs-extra';
import path from 'path';

const root = process.cwd();
const SRC = path.join(root, 'src');
const OUT = path.join(root, 'public');

async function main(){
  if (!await fs.pathExists(SRC)){
    console.error('src folder not found, nothing to build');
    process.exit(1);
  }
  console.log('Cleaning', OUT);
  await fs.remove(OUT);
  console.log('Copying', SRC, '->', OUT);
  await fs.copy(SRC, OUT, { overwrite: true, errorOnExist: false });
  console.log('Build complete: copied src -> public');
}

main().catch(e => { console.error(e); process.exit(1); });
