#!/usr/bin/env node
import { promises as fsp } from 'fs';
import path from 'path';
import crypto from 'crypto';

const root = process.cwd();
const site = path.join(root, 'curentVersion', 'filezilla-upload');
const indexPath = path.join(site, 'index.html');
const assetsCss = path.join(site, 'assets', 'css');
const assetsJs = path.join(site, 'assets', 'js');

const CRITICAL_BYTES = 1024; // keep ~1KB inline

function hashString(s){ return crypto.createHash('sha1').update(s).digest('hex').slice(0,8); }

function minifyCss(s){
  // remove comments and collapse whitespace
  return s.replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\s{2,}/g, ' ')
          .replace(/\s*([{}:;,])\s*/g, '$1')
          .trim();
}

function minifyJs(s){
  // simple removal of block comments and line comments (naive)
  return s.replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/(^|\n)\s*\/\/.*(?=\n|$)/g, '\n')
          .replace(/\s{2,}/g, ' ')
          .replace(/\s*([{}()=;,:+\-<>])\s*/g, '$1')
          .trim();
}

async function ensureDir(p){ await fsp.mkdir(p, { recursive: true }); }

async function main(){
  const html = await fsp.readFile(indexPath, 'utf8');
  let outHtml = html;

  // extract first <style>...</style>
  const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/i;
  const styleMatch = html.match(styleRe);
  if(styleMatch){
    const fullCss = styleMatch[1];
    const critical = fullCss.slice(0, CRITICAL_BYTES);
    const rest = fullCss.slice(CRITICAL_BYTES).trim();
    if(rest.length>0){
      await ensureDir(assetsCss);
      const min = minifyCss(rest);
      const h = hashString(min+Date.now());
      const fname = `style-${h}.css`;
      const fpath = path.join(assetsCss, fname);
      await fsp.writeFile(fpath, min, 'utf8');
      // replace original style with critical inline + link
      const replacement = `<style>${critical}</style>\n<link rel="stylesheet" href="assets/css/${fname}">`;
      outHtml = outHtml.replace(styleRe, replacement);
      console.log('Extracted CSS ->', `assets/css/${fname}`);
    } else {
      console.log('No non-critical CSS found; leaving inline.');
    }
  } else {
    console.log('No <style> tag found in index.html');
  }

  // extract inline <script>...</script> (non-src)
  const scriptReGlobal = /<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/ig;
  let scriptMatch;
  let scriptsCombined = '';
  const scriptRanges = [];
  while((scriptMatch = scriptReGlobal.exec(html)) !== null){
    const code = scriptMatch[1].trim();
    if(code.length>0){
      scriptsCombined += code + '\n';
      scriptRanges.push({ start: scriptMatch.index, end: scriptReGlobal.lastIndex });
    }
  }
  if(scriptsCombined.length>0){
    await ensureDir(assetsJs);
    const minjs = minifyJs(scriptsCombined);
    const h = hashString(minjs+Date.now());
    const jname = `main-${h}.js`;
    const jpath = path.join(assetsJs, jname);
    await fsp.writeFile(jpath, minjs, 'utf8');
    // remove all those inline scripts from outHtml and put a single defer script tag before </body>
    // naive removal: replace each matched range with empty string
    // operate on outHtml
    outHtml = outHtml.replace(scriptReGlobal, function(m, p1){
      // if this script had src attribute, keep it; handled by regex so this is inline only
      return '';
    });
    // insert defer script before </body>
    outHtml = outHtml.replace(/<\/body>/i, `  <script defer src="assets/js/${jname}"></script>\n</body>`);
    console.log('Extracted JS ->', `assets/js/${jname}`);
  } else {
    console.log('No inline <script> blocks found');
  }

  // write updated index.html backup and new
  const backup = indexPath + '.bak';
  await fsp.copyFile(indexPath, backup);
  await fsp.writeFile(indexPath, outHtml, 'utf8');
  console.log('index.html updated, backup at', backup);
}

main().catch(e => { console.error('Failed:', e && e.message ? e.message : e); process.exit(1); });
