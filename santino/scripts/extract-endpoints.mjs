import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..'); // repo root (parent of scripts)
const parsedPath = path.join(workspaceRoot, 'scripts', 'screenshots', 'parsed-network-results-from-temp.json');
const outDir = path.join(workspaceRoot, 'scripts', 'screenshots', 'extracts');

function anyStringMatch(obj, re) {
  if (!obj) return false;
  const s = JSON.stringify(obj);
  return re.test(s);
}

function firstMatchString(obj, re) {
  if (!obj) return null;
  const s = JSON.stringify(obj);
  const m = s.match(re);
  return m ? m[0] : null;
}

const urlRe = /https?:\/\/[^"'\s,}]+/i;

async function main() {
  const raw = await fs.readFile(parsedPath, 'utf8');
  const parsed = JSON.parse(raw);
  const files = parsed.files || {};

  const items = [];
  for (const [fileName, entry] of Object.entries(files)) {
    const url = entry.url || null;
    const headers = entry.headers || {};
    const jsonBodies = Array.isArray(entry.jsonBodies) ? entry.jsonBodies : (entry.jsonBodies ? [entry.jsonBodies] : []);
    const csrf = entry.csrf || null;
    const setCookies = entry.setCookies || [];

    // attempt to discover any URL in headers, bodies or fileName
  const foundUrl = url || firstMatchString(headers, urlRe) || firstMatchString(jsonBodies, urlRe) || (fileName && (fileName.includes('server101') || fileName.includes('reg_ru')) ? fileName : null);

    items.push({
      fileKey: fileName,
      url: foundUrl,
      urlRaw: url,
      headers: Object.keys(headers).length ? headers : undefined,
      jsonBodies: jsonBodies.length ? jsonBodies.slice(0,5) : undefined,
      csrf,
      setCookies: setCookies.length ? setCookies : undefined,
    });
  }

  // filters
  const server101Re = /server101\.hosting\.reg\.ru/i;
  const regRuRe = /(^|[^a-z0-9])reg\.ru/i;

  const server101Matches = items.filter(it => (it.url && server101Re.test(it.url)) || anyStringMatch(it, server101Re) );
  const regruMatches = items.filter(it => (it.url && regRuRe.test(it.url) && !server101Re.test(it.url)) || (anyStringMatch(it, regRuRe) && !anyStringMatch(it, server101Re)) );

  await fs.mkdir(outDir, { recursive: true });
  const sPath = path.join(outDir, 'server101-extract.json');
  const rPath = path.join(outDir, 'regru-extract.json');

  await fs.writeFile(sPath, JSON.stringify({ generatedAt: new Date().toISOString(), count: server101Matches.length, items: server101Matches }, null, 2));
  await fs.writeFile(rPath, JSON.stringify({ generatedAt: new Date().toISOString(), count: regruMatches.length, items: regruMatches }, null, 2));

  console.log('Wrote extracts:');
  console.log('  server101:', sPath, 'items=', server101Matches.length);
  console.log('  regru:   ', rPath, 'items=', regruMatches.length);
}

main().catch(err => { console.error(err); process.exit(1); });
