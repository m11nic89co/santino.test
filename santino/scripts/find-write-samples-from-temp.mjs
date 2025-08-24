import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fromDir = path.join(__dirname, 'screenshots', 'from-temp');
const outDir = path.join(__dirname, 'screenshots', 'extracts');
const outPath = path.join(outDir, 'write-samples-from-temp.json');

function safeReadJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { return null; }
}

if (!fs.existsSync(fromDir)) {
  console.error('from-temp directory not found:', fromDir);
  process.exit(1);
}

const files = fs.readdirSync(fromDir).filter(f => f.endsWith('.json'));
const results = { generatedAt: new Date().toISOString(), sourceDir: fromDir, count: 0, items: [] };

for (const f of files) {
  const p = path.join(fromDir, f);
  const j = safeReadJson(p);
  if (!j) continue;

  // Look for common fields that contain request info
  const candidates = [];

  // If file is an array of network entries
  if (Array.isArray(j)) {
    for (const entry of j) candidates.push(entry);
  } else if (typeof j === 'object') {
    // If object with top-level request/response
    candidates.push(j);
    // If nested frames/entries
    for (const k of Object.keys(j)) {
      const v = j[k];
      if (Array.isArray(v)) v.forEach(it => candidates.push(it));
      else if (typeof v === 'object') candidates.push(v);
    }
  }

  for (const c of candidates) {
    if (!c || typeof c !== 'object') continue;

    // Check for fields commonly used by HAR-like or puppeteer dumps
    const postData = c.postData || c.postDataText || (c.request && (c.request.postData || c.request.postDataText)) || c.requestBody || c.requestBodyRaw;
    const method = (c.method || (c.request && c.request.method) || c.httpMethod || null);
    const url = c.url || (c.request && c.request.url) || c.requestUrl || null;

    const hasBody = postData && String(postData).trim().length > 0;
    const isWriteMethod = method && ['POST','PUT','PATCH','DELETE'].includes(String(method).toUpperCase());

    if (hasBody || isWriteMethod) {
      results.items.push({ file: f, url, method, postData: postData || null, raw: c });
    }
  }
}

results.count = results.items.length;
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
console.log('Wrote', outPath, 'items=', results.count);
