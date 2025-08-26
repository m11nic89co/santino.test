import fs from 'fs-extra';
import path from 'path';

const root = process.cwd();
const CURRENT = path.join(root, 'curentVersion');
const SRC = path.join(root, 'src');

async function main() {
  const exists = await fs.pathExists(CURRENT);
  if (!exists) throw new Error('curentVersion not found');
  await fs.emptyDir(SRC);
  await fs.copy(CURRENT, SRC);
  console.log('[sync] curentVersion -> src complete');
}

main().catch((e) => { console.error(e); process.exit(1); });
