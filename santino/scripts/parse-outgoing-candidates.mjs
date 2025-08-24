#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

function usage() {
  console.log('Usage: node scripts/parse-outgoing-candidates.mjs -i <outgoing_dir> [-o <output_file>]');
}

function scoreText(text) {
  if (!text) return 0;
  const s = String(text).toLowerCase();
  let score = 0;
  const keywords = [
    'domain','hostname','record','records','dns','a_record','a-record','type','ttl','ip','ipv4','value',
    'document_root','document-root','root','path','vhost','cert','certificate','csr','enable_ssl','ssl','https',
    'bind','attach','create','add','update','save'
  ];
  for (const k of keywords) if (s.includes(k)) score += 2;
  // small boost for JSON-like body
  if (s.trim().startsWith('{') && s.trim().endsWith('}')) score += 1;
  // numeric hints
  if (s.match(/\b(\d{1,3}\.){3}\d{1,3}\b/)) score += 3;
  return score;
}

async function parseFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const obj = JSON.parse(raw);
    // expected outgoing capture shape: { url, method, headers, postData }
    const url = obj.url || obj.request?.url || obj.requestUrl || obj.request?.request?.url || null;
    const method = (obj.method || obj.request?.method || obj.request?.request?.method || 'GET').toUpperCase();
    const headers = obj.headers || obj.request?.headers || obj.request?.request?.headers || {};
    const postData = obj.postData || obj.request?.postData || obj.request?.request?.postData || obj.body || obj.data || null;
    const contentType = headers['content-type'] || headers['Content-Type'] || '';

    // Build searchable text
    const searchText = [url, method, contentType, JSON.stringify(postData || '')].filter(Boolean).join(' ');
    const baseScore = scoreText(searchText);

    return {
      file: filePath,
      url,
      method,
      headers,
      contentType,
      postData,
      score: baseScore
    };
  } catch (err) {
    return { file: filePath, error: String(err), score: 0 };
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) return usage();
  let inputDir = null;
  let outFile = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-i' || a === '--input') inputDir = args[++i];
    else if (a === '-o' || a === '--output') outFile = args[++i];
    else { usage(); return; }
  }
  if (!inputDir) { usage(); return; }
  const absInput = path.resolve(inputDir);
  try {
    const names = await fs.readdir(absInput);
    const jsonFiles = names.filter(n => n.endsWith('.json'));
    const parsed = [];
    for (const n of jsonFiles) {
      const p = path.join(absInput, n);
      const r = await parseFile(p);
      parsed.push(r);
    }
    // filter likely write candidates: method POST/PUT or score > 0
    const candidates = parsed
      .filter(p => p && !p.error)
      .map(p => ({ file: p.file, url: p.url, method: p.method, contentType: p.contentType, score: p.score, snippet: (typeof p.postData === 'string' && p.postData.length>0) ? p.postData.slice(0,120) : (p.postData && JSON.stringify(p.postData).slice(0,120)) || '' }))
      .filter(p => ['POST','PUT','PATCH','DELETE'].includes(p.method) || p.score > 0)
      .sort((a,b) => b.score - a.score)
      .map((p, idx) => ({ rank: idx+1, ...p }));

    const out = { generatedAt: new Date().toISOString(), inputDir: absInput, totalFiles: jsonFiles.length, candidates };
    const outputPath = outFile ? path.resolve(outFile) : path.join(absInput, '..', 'outgoing-candidates.json');
    await fs.writeFile(outputPath, JSON.stringify(out, null, 2), 'utf8');
    console.log('Wrote candidates ->', outputPath);
    console.log('Top candidates:');
    for (let i = 0; i < Math.min(10, candidates.length); i++) {
      const c = candidates[i];
      console.log(`${i+1}. [${c.method}] ${c.url} (score=${c.score}) file=${path.basename(c.file)}`);
    }
    if (candidates.length === 0) console.log('No candidates found — try rerunning against a different captures folder or run live probe while performing write actions.');
  } catch (err) {
    console.error('Error reading input dir:', err.message || err);
  }
}

main();
