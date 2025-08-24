#!/usr/bin/env node
/*
  parse-network-dumps.mjs
  - scans scripts/screenshots for files matching *network*.json
  - for each file extracts:
    - any response bodies that look like JSON (safely parsed)
    - any _csrf meta tokens found inside HTML bodies
    - set-cookie headers and url
  - writes aggregated JSON to scripts/screenshots/parsed-network-results.json

  Usage: node scripts/parse-network-dumps.mjs
*/
import fs from 'fs';
import path from 'path';

const screenshotsDir = path.resolve(process.cwd(), 'scripts', 'screenshots');
const outFile = path.join(screenshotsDir, 'parsed-network-results.json');

function isProbablyJsonString(s) {
  if (!s || typeof s !== 'string') return false;
  const trimmed = s.trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
}

function tryParseJsonSafe(s) {
  try {
    return JSON.parse(s);
  } catch (e) {
    return null;
  }
}

function extractCsrfFromHtml(html) {
  if (!html || typeof html !== 'string') return null;
  const m = html.match(/<meta[^>]+name=["']?_csrf["']?[^>]*content=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

async function main() {
  if (!fs.existsSync(screenshotsDir)) {
    console.error('screenshots folder not found:', screenshotsDir);
    process.exit(2);
  }

  const files = fs.readdirSync(screenshotsDir).filter(f => /network.*\.json$/i.test(f));
  if (!files.length) {
    console.log('No network-*.json files found in', screenshotsDir);
    process.exit(0);
  }

  const results = { files: {}, summary: { totalFiles: files.length, totalJsonBodies: 0, csrfTokens: [] } };

  for (const file of files) {
    const fp = path.join(screenshotsDir, file);
    let raw;
    try {
      raw = fs.readFileSync(fp, 'utf8');
    } catch (e) {
      console.error('failed to read', fp, e.message);
      continue;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.warn('not valid JSON, skipping parse for', file);
      continue;
    }

    const entry = { url: parsed.url || null, headers: parsed.headers || {}, jsonBodies: [], csrf: null, setCookies: [] };

    // collect cookies
    const sc = parsed.headers && parsed.headers['set-cookie'];
    if (sc) {
      entry.setCookies = Array.isArray(sc) ? sc : [sc];
    }

    // try to extract CSRF if HTML body
    if (typeof parsed.body === 'string') {
      const csrf = extractCsrfFromHtml(parsed.body);
      if (csrf) {
        entry.csrf = csrf;
        if (!results.summary.csrfTokens.includes(csrf)) results.summary.csrfTokens.push(csrf);
      }

      // if body looks like JSON, try to parse
      if (isProbablyJsonString(parsed.body)) {
        const j = tryParseJsonSafe(parsed.body);
        if (j !== null) {
          entry.jsonBodies.push(j);
          results.summary.totalJsonBodies += 1;
        }
      }
    }

    // sometimes the saved network dump contains array of responses -> handle generically
    if (Array.isArray(parsed.responses)) {
      for (const r of parsed.responses) {
        if (r && typeof r.body === 'string' && isProbablyJsonString(r.body)) {
          const j = tryParseJsonSafe(r.body);
          if (j !== null) {
            entry.jsonBodies.push(j);
            results.summary.totalJsonBodies += 1;
          }
        }
      }
    }

    results.files[file] = entry;
  }

  fs.writeFileSync(outFile, JSON.stringify(results, null, 2), 'utf8');
  console.log('parsed', files.length, 'files. json bodies:', results.summary.totalJsonBodies);
  if (results.summary.csrfTokens.length) {
    console.log('found CSRF tokens:', results.summary.csrfTokens.join(', '));
  }
  console.log('wrote', outFile);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
