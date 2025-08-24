import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parsedPath = path.join(__dirname, 'screenshots', 'parsed-network-results-from-temp.json');
const outDir = path.join(__dirname, 'screenshots', 'extracts');
const outPath = path.join(outDir, 'write-samples.json');

function safeReadJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.error('Failed to read/parse', p, e.message);
    process.exit(1);
  }
}

if (!fs.existsSync(parsedPath)) {
  console.error('Parsed input not found:', parsedPath);
  process.exit(1);
}

const parsed = safeReadJson(parsedPath);

const results = {
  generatedAt: new Date().toISOString(),
  source: parsedPath,
  count: 0,
  items: []
};

const keys = parsed.files ? Object.keys(parsed.files) : [];

for (const k of keys) {
  const entry = parsed.files[k];
  // Heuristics: include if any of these true:
  // - entry.method exists and is POST/PUT
  // - entry.jsonBodies has any items
  // - entry.formBodies has any items
  // - entry.requestBody (raw) exists and non-empty

  const method = entry.method || (entry.request && entry.request.method) || null;
  const jsonBodies = Array.isArray(entry.jsonBodies) ? entry.jsonBodies : [];
  const formBodies = Array.isArray(entry.formBodies) ? entry.formBodies : [];
  const raw = entry.requestBody || entry.requestBodyRaw || entry.request && entry.request.postData || null;

  const hasBody = jsonBodies.length > 0 || formBodies.length > 0 || (raw && String(raw).trim().length > 0);
  const isWriteMethod = method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(method).toUpperCase());

  if (isWriteMethod || hasBody) {
    const item = {
      key: k,
      url: entry.url || null,
      method: method || (entry.request && entry.request.method) || null,
      jsonBodies: jsonBodies,
      formBodies: formBodies,
      rawRequestBody: raw ? (typeof raw === 'string' ? raw : JSON.stringify(raw)) : null,
      headers: entry.headers || {},
      csrf: entry.csrf || null,
      setCookies: entry.setCookies || []
    };
    results.items.push(item);
  }
}

results.count = results.items.length;

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
console.log('Wrote', outPath, 'items=', results.count);
