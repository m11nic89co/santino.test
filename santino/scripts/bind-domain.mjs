#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
let puppeteer;
try {
  // prefer puppeteer-core when installed (no bundled Chromium)
  // and fall back to puppeteer if available
  // dynamic import keeps compatibility with ESM resolver
  const mod = await import('puppeteer-core');
  puppeteer = mod && (mod.default || mod);
} catch (e) {
  try { const mod2 = await import('puppeteer'); puppeteer = mod2 && (mod2.default || mod2); } catch (e2) { /* will fail later if neither present */ }
}
import { argv } from 'process';

const workspace = path.resolve(new URL(import.meta.url).pathname).replace(/(^[A-Za-z]:)/, '');
const credsPath = path.resolve(process.cwd(), 'scripts', 'creds.local.json');

function loadCreds() {
  if (!fs.existsSync(credsPath)) throw new Error(`Missing ${credsPath}`);
  const raw = fs.readFileSync(credsPath, 'utf8');
  return JSON.parse(raw);
}

function loadEffectiveCreds() {
  // Env vars override local file to enable CI runs without committing secrets
  const env = {
    regru: {
      panel_url: process.env.REGRU_PANEL_URL || undefined,
      login: process.env.REGRU_LOGIN || undefined,
      password: process.env.REGRU_PASSWORD || undefined,
      api_token: process.env.REGRU_API_TOKEN || undefined
    },
    domain: process.env.DOMAIN || undefined,
    document_root: process.env.DOCUMENT_ROOT || undefined
  };

  if (env.regru.login && env.regru.password) {
    return env;
  }

  // fall back to local file
  const fileCreds = loadCreds();
  // merge: file values used when env not set
  return {
    regru: {
      panel_url: env.regru.panel_url || (fileCreds.regru && fileCreds.regru.panel_url),
      login: env.regru.login || (fileCreds.regru && fileCreds.regru.login),
      password: env.regru.password || (fileCreds.regru && fileCreds.regru.password),
      api_token: env.regru.api_token || (fileCreds.regru && fileCreds.regru.api_token)
    },
    domain: env.domain || fileCreds.domain,
    document_root: env.document_root || fileCreds.document_root
  };
}

async function saveScreenshot(page, name) {
  const outDir = path.resolve(process.cwd(), 'scripts', 'screenshots');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${Date.now()}-${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log('screenshot:', file);
}

async function saveDebugDump(page, name) {
  try {
  const meta = { url: page.url ? page.url() : null, title: await page.title().catch(()=>null) };
    const outDir = path.resolve(process.cwd(), 'scripts', 'screenshots');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const dump = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('a,button,div,span,td,input,label,textarea,select'));
      return nodes.map(n => ({
        tag: n.tagName,
        text: (n.textContent||'').trim().replace(/\s+/g,' '),
        href: n.href || null,
        classes: n.className || null
      })).filter(x => x.text || x.href);
    });
    const out = path.join(outDir, `${Date.now()}-${name}.json`);
  fs.writeFileSync(out, JSON.stringify({meta: meta, nodes: dump}, null, 2), 'utf8');
    console.log('debug-dump:', out);
  } catch (e) {
    console.log('saveDebugDump failed', e && e.message);
  }
}

async function saveHtmlDump(page, name){
  try{
    const outDir = path.resolve(process.cwd(), 'scripts', 'screenshots');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const file = path.join(outDir, `${Date.now()}-${name}.html`);
    const html = await page.content();
    fs.writeFileSync(file, html, 'utf8');
    console.log('html-dump:', file);
  }catch(e){ console.log('saveHtmlDump failed', e && e.message); }
}

async function saveFramesDump(page, name){
  try{
    const outDir = path.resolve(process.cwd(), 'scripts', 'screenshots');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const frames = page.frames();
    const framesData = [];
    for (const f of frames) {
      try {
        const url = f.url();
        const title = await f.title().catch(()=>null);
        const nodes = await f.evaluate(() => {
          try {
            const els = Array.from(document.querySelectorAll('a,button,div,span,td,input,label,textarea,select'));
            return els.map(n => ({ tag: n.tagName, text: (n.textContent||'').trim().replace(/\s+/g,' '), href: n.href||null, classes: n.className||null, name: n.name||null, type: n.type||null })).filter(x => x.text || x.href || x.name);
          } catch (e) { return { error: 'frame-eval-failed' }; }
        }).catch(e=>({ error: 'cross-origin-or-eval-failed' }));
        framesData.push({ url, title, nodes });
      } catch (e) {
        framesData.push({ url: f.url(), error: e && e.message });
      }
    }
    const out = path.join(outDir, `${Date.now()}-${name}.json`);
    fs.writeFileSync(out, JSON.stringify({ meta: { url: page.url ? page.url() : null, title: await page.title().catch(()=>null) }, frames: framesData }, null, 2), 'utf8');
    console.log('frames-dump:', out);
  }catch(e){ console.log('saveFramesDump failed', e && e.message); }
}

async function trySelectors(page, selectors) {
  for (const sel of selectors) {
    try {
      if (typeof sel === 'string' && sel.startsWith('xpath:')) {
        const xpath = sel.slice(6);
        await page.waitForXPath(xpath, { timeout: 2000 });
        return sel;
      } else {
        await page.waitForSelector(sel, { timeout: 2000 });
        return sel;
      }
    } catch (e) {
      // ignore and try next
    }
  }
  return null;
}

async function tryLoginInFrames(page, loginValue, passwordValue){
  const frames = page.frames();
  for (const f of frames){
    try{
      const info = await f.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        return inputs.map(i=>({name:i.name||null, id:i.id||null, type:i.type||null, placeholder: i.placeholder||null, outer: i.outerHTML}));
      }).catch(()=>null);
      if(!info) continue;
      // heuristics: find password field and a text/email/login field
      const pwd = info.find(i=>i.type==='password');
      const user = info.find(i=>i.type==='text' || i.type==='email' || /login|user|email|account/i.test((i.name||'')+(i.id||'')+(i.placeholder||'')) );
      if(pwd){
        // focus and type inside frame
        await f.focus(pwd.id || pwd.name).catch(()=>{});
        if(user) await f.focus(user.id || user.name).catch(()=>{});
        // set values
        if(user) await f.evaluate((v,u)=>{ const el = document.querySelector(`#${u}`) || document.querySelector(`[name="${u}"]`); if(el) el.value = v; }, loginValue, user.id || user.name).catch(()=>{});
        await f.evaluate((v,p)=>{ const el = document.querySelector(`#${p}`) || document.querySelector(`[name="${p}"]`); if(el) el.value = v; }, passwordValue, pwd.id || pwd.name).catch(()=>{});
        // try to find submit button
        const clicked = await f.evaluate(()=>{
          const btn = Array.from(document.querySelectorAll('button,input')).find(n=> (n.type==='submit') || /log in|login|войти|submit|sign in/i.test(n.textContent||n.value||'') );
          if(btn){ btn.click(); return true; }
          return false;
        }).catch(()=>false);
        if(clicked) return true;
      }
    }catch(e){ /* ignore frame errors */ }
  }
  return false;
}

async function probeFrameUrls(browser, page){
  try{
    const frames = page.frames();
    const cookies = await page.cookies().catch(()=>[]);
    for (const f of frames){
      const fu = f.url();
      if (!fu || !fu.startsWith('http')) continue;
      try{
        console.log('Probing frame url:', fu);
        const p = await browser.newPage();
        p.setDefaultTimeout(15000);
        // restore cookies into new page
        if (cookies && cookies.length){
          try{ await p.setCookie(...cookies); } catch(e){ /* ignore */ }
        }
        // set referer to main page so reg.ru redirect logic can use document.referrer
        try { await p.setExtraHTTPHeaders({ referer: page.url() }); } catch(e){}
        await p.goto(fu, { waitUntil: 'networkidle2', timeout: 15000, referer: page.url() }).catch(()=>{});
        // give small time for any JS redirection based on referrer
        await p.waitForTimeout(1200).catch(()=>{});
        try { await saveHtmlDump(p, `probe-${fu.replace(/[:\/\.\?&=]/g,'_')}-html`); } catch(e){}
        await saveScreenshot(p, `probe-${fu.replace(/[:\/\.\?&=]/g,'_')}`);
  try { await saveDebugDump(p, `probe-${fu.replace(/[:\/\.\?&=]/g,'_')}`); } catch(e){}
  try { await saveFramesDump(p, `probe-${fu.replace(/[:\/\.\?&=]/g,'_')}`); } catch(e){}
  try { await saveCookiesAndStorage(p, `probe-${fu.replace(/[:\/\.\?&=]/g,'_')}`); } catch(e){ }
        await p.close();
      }catch(e){ console.log('probeFrameUrls inner error', e && e.message); }
    }
  }catch(e){ console.log('probeFrameUrls failed', e && e.message); }
}

function sanitizeFilename(s){ return s.replace(/[:\/\.\?&=\s]/g,'_').slice(0,150); }

async function attachNetworkCapture(page){
  try{
    page._capturedResponses = [];
    page.on('response', async (res) => {
      try{
        const url = res.url();
        const low = (url || '').toLowerCase();
        // capture if from reg.ru domains or typical API hints
        const isReg = low.includes('reg.ru') || low.includes('.hosting.reg.ru') || low.includes('server101.hosting.reg.ru');
        const ct = (res.headers && (res.headers()['content-type'] || res.headers()['Content-Type'])) || '';
        const isJson = ct.includes('application/json');
        const shouldSave = isReg || isJson || /domain|domains|client|api|records|dns|site/.test(low);
        if (!shouldSave) return;
        const text = await res.text().catch(()=>null);
        // try to capture request postData if available
        let requestPostData = null;
        try {
          const req = res.request && res.request();
          if (req && typeof req.postData === 'function') requestPostData = req.postData();
        } catch (e) { /* ignore */ }
        // if no text payload, still save metadata
        const outDir = path.resolve(process.cwd(), 'scripts', 'screenshots');
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        const name = `${Date.now()}-network-${sanitizeFilename(url)}.json`;
        const file = path.join(outDir, name);
        const status = res.status ? res.status() : null;
        const headers = res.headers ? res.headers() : {};
        // truncate large bodies
        let body = null;
        if (text) {
          body = text.length > 200000 ? text.slice(0,200000) + '\n\n--truncated--' : text;
          try { body = JSON.parse(body); } catch(e) { /* keep as string */ }
        }
        fs.writeFileSync(file, JSON.stringify({ url, status, headers, body, requestPostData }, null, 2), 'utf8');
        console.log('network-dump:', file);
      }catch(e){ /* ignore individual response errors */ }
    });
    // capture outgoing requests (method + postData) to help find write payloads
    page.on('request', async (req) => {
      try {
        const url = req.url();
        const low = (url || '').toLowerCase();
        const isReg = low.includes('reg.ru') || low.includes('.hosting.reg.ru') || low.includes('server101.hosting.reg.ru');
        if (!isReg) return;
        const method = req.method ? req.method() : null;
        const postData = typeof req.postData === 'function' ? req.postData() : (req.postData || null);
        const outDir = path.resolve(process.cwd(), 'scripts', 'screenshots', 'outgoing');
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        const file = path.join(outDir, `${Date.now()}-request-${sanitizeFilename(url)}.json`);
        fs.writeFileSync(file, JSON.stringify({ url, method, postData }, null, 2), 'utf8');
        console.log('request-dump:', file);
      } catch (e) { /* ignore */ }
    });
  }catch(e){ console.log('attachNetworkCapture failed', e && e.message); }
}

async function attemptRegRuLogin(page, regru){
  try{
    const tryUrls = ['https://www.reg.ru/login', 'https://www.reg.ru/client/login', 'https://www.reg.ru/auth'];
    for (const u of tryUrls){
      try{
        console.log('Trying reg.ru login at', u);
        await page.goto(u, { waitUntil: 'networkidle2' });
        await saveScreenshot(page, `reg-login-${u.replace(/[:\/\.\?&=]/g,'_')}`);
        // try selectors on reg.ru
        const loginSel = await trySelectors(page, ['input[name=login]', 'input[name=email]', 'input[type=email]', 'input[type=text]', 'input[name=username]']);
        const passSel = await trySelectors(page, ['input[name=password]', 'input[type=password]']);
        if (!loginSel || !passSel) { continue; }
        await page.evaluate((sel,val)=>{ const el = document.querySelector(sel); if(el){ el.focus(); el.value = val; } }, loginSel, regru.login).catch(()=>{});
        await page.evaluate((sel,val)=>{ const el = document.querySelector(sel); if(el){ el.focus(); el.value = val; } }, passSel, regru.password).catch(()=>{});
        const submitSel = await trySelectors(page, ['button[type=submit]', 'input[type=submit]', 'xpath://button[contains(., "Войти")]']);
        if (submitSel) { try{ await page.click(submitSel); }catch(e){} } else { await page.keyboard.press('Enter'); }
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(()=>{});
        await saveScreenshot(page, `after-reg-login-${u.replace(/[:\/\.\?&=]/g,'_')}`);
        const h = await page.content();
        if (h.includes('Мои домены') || h.includes('client/domains') || h.includes('Личный кабинет') || h.includes('Мои сервисы')){
          console.log('Logged in on reg.ru at', u);
          return true;
        }
      } catch(e){ /* try next */ }
    }
  }catch(e){ console.log('attemptRegRuLogin failed', e && e.message); }
  return false;
}

async function saveCookiesAndStorage(page, name){
  try{
    const outDir = path.resolve(process.cwd(), 'scripts', 'screenshots');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const cookies = await page.cookies().catch(()=>[]);
    const ls = await page.evaluate(() => { try { return JSON.stringify(localStorage); } catch (e){ return null; } }).catch(()=>null);
    const ss = await page.evaluate(() => { try { return JSON.stringify(sessionStorage); } catch (e){ return null; } }).catch(()=>null);
    const out = path.join(outDir, `${Date.now()}-${name}-storage.json`);
    fs.writeFileSync(out, JSON.stringify({ url: page.url ? page.url() : null, cookies, localStorage: ls, sessionStorage: ss }, null, 2), 'utf8');
    console.log('storage-dump:', out);
  }catch(e){ console.log('saveCookiesAndStorage failed', e && e.message); }
}

async function run() {
  const creds = loadEffectiveCreds();
  const { regru } = creds;
  const PROBE_ONLY = process.argv.includes('--probe') || process.env.BIND_DOMAIN_PROBE === '1';
  if (PROBE_ONLY) console.log('Running in PROBE_ONLY mode: will collect network dumps but skip write actions');
  if (!regru || !regru.login || !regru.password) throw new Error('Missing login/password in creds or env vars');
  const domain = creds.domain;
  const documentRoot = creds.document_root;

  console.log('domain:', domain);
  console.log('document_root:', documentRoot);

  // Support connecting to a remote Chrome instance to avoid downloading Chromium.
  // Usage: set REMOTE_DEBUGGING_URL=http://127.0.0.1:9222 or pass --remote-debugging-url=http://127.0.0.1:9222
  const argvRemote = argv.find(a => a.startsWith('--remote-debugging-url='));
  const envRemote = process.env.REMOTE_DEBUGGING_URL || process.env.BROWSER_WS_ENDPOINT || process.env.CHROME_REMOTE_URL || null;
  const remoteUrl = argvRemote ? argvRemote.split('=')[1] : (envRemote || null);
  let browser;
  if (remoteUrl) {
    console.log('Connecting to remote Chrome at', remoteUrl);
    try {
      // puppeteer.connect accepts browserWSEndpoint or browserURL
      // prefer browserURL (http://host:port) which Puppeteer will translate
      browser = await puppeteer.connect({ browserURL: remoteUrl, defaultViewport: { width: 1366, height: 768 } });
    } catch (e) {
      console.log('puppeteer.connect failed, falling back to launch:', e && e.message);
    }
  }
  if (!browser) {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-extensions','--disable-features=site-per-process','--disable-blink-features=AutomationControlled'] });
  }
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  // Set a modern user agent to avoid server101 old browser notice
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36');
  // Basic anti-detection tweaks
  await page.evaluateOnNewDocument(() => {
    try{
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'ru-RU'] });
      Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3,4,5] });
      window.chrome = { runtime: {} };
    }catch(e){}
  });
  page.setDefaultTimeout(30000);
  try { await attachNetworkCapture(page); } catch(e){ console.log('attachNetworkCapture call failed', e && e.message); }

  try {
    console.log('Open panel:', regru.panel_url);
    await page.goto(regru.panel_url, { waitUntil: 'networkidle2' });
    await saveScreenshot(page, 'login-page');

    // Try common login field selectors
    const loginSelectors = ['input[name=email]', 'input[name=login]', 'input[type=email]', 'input#login', 'input[name=username]', 'input[type=text]'];
    const passSelectors = ['input[name=password]', 'input[type=password]', 'input#password'];

    const loginSel = await trySelectors(page, loginSelectors);
    const passSel = await trySelectors(page, passSelectors);

    if (!loginSel || !passSel) {
      console.log('Could not find login or password fields automatically. Stopping. See screenshot.');
      await browser.close();
      return;
    }

    await page.type(loginSel, regru.login, { delay: 50 });
    await page.type(passSel, regru.password, { delay: 50 });

  // Try to submit: look for button or press Enter
  const submitSelectors = ['button[type=submit]', 'xpath://button[contains(., "Войти")]', 'xpath://button[contains(., "Login")]', 'input[type=submit]'];
    const submitSel = await trySelectors(page, submitSelectors);
    if (submitSel) {
      await page.click(submitSel);
    } else {
      await page.keyboard.press('Enter');
    }

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    console.log('Logged in (or navigation timed out).');
    await saveScreenshot(page, 'after-login');
  try { await saveFramesDump(page, 'after-login-frames'); } catch(e) { console.log('saveFramesDump after-login failed', e && e.message); }
    try { await saveHtmlDump(page, 'after-login-html'); } catch(e){ console.log('saveHtmlDump after-login failed', e && e.message); }

    // Search page for domain link text
    const pageContent = await page.content();
    if (!pageContent.includes(domain)) {
      console.log('Domain not found on landing page. Searching for domains page...');
        // If the landing page looks like a hosting static page (server101), try clicking header card or footer links
        try {
          const tried = await page.evaluate(() => {
            function clickByText(tag, text){
              const el = Array.from(document.querySelectorAll(tag)).find(n=>n.textContent && n.textContent.includes(text));
              if(el){ el.scrollIntoView(); el.click(); return true; }
              return false;
            }
            // try header card
            const headerCard = document.querySelector('.b-inregru-header__card');
            if (headerCard){ headerCard.scrollIntoView(); headerCard.click(); return 'header-card'; }
            // try footer quick links
            if (clickByText('a', 'Домены')) return 'footer-domain';
            if (clickByText('a', 'Хостинг')) return 'footer-hosting';
            if (clickByText('a', 'На главную')) return 'footer-home';
            return null;
          });
          if (tried) { console.log('Tried clicking element on landing page:', tried); await page.waitForTimeout(1500); await saveScreenshot(page, `after-landing-click-${tried}`); }
        } catch(e){ console.log('landing click attempts failed', e && e.message); }

      // try some known paths
      const candidates = ['/domains', '/domain', '/domains/manage', '/dns', '/hosting/domains'];
      let found = false;
      for (const c of candidates) {
        try {
          const url = new URL(regru.panel_url);
          url.pathname = c;
          await page.goto(url.toString(), { waitUntil: 'networkidle2' });
          const html = await page.content();
          await saveScreenshot(page, `candidate-${c.replace(/\//g,'_')}`);
          if (html.includes(domain)) { found = true; break; }
          // try to click any element that mentions the domain on this candidate page
          try {
            const clicked = await page.evaluate((domain) => {
              const el = Array.from(document.querySelectorAll('a,button,div,span,td')).find(n => (n.textContent && n.textContent.includes(domain)) || (n.href && n.href.includes(domain)));
              if (el) { el.scrollIntoView(); el.click(); return true; }
              return false;
            }, domain);
            if (clicked) { found = true; break; }
          } catch (e) {}
        } catch (e) {}
      }
  if (!found) {
  console.log('Could not find domain list automatically. Trying common reg.ru account pages...');
  try { await attemptRegRuLogin(page, regru); } catch(e){ console.log('attemptRegRuLogin call failed', e && e.message); }
        const regPaths = [
          'https://www.reg.ru/manager',
          'https://www.reg.ru/profile',
          'https://www.reg.ru/domains',
          'https://www.reg.ru/domain/manage',
          'https://www.reg.ru/account/domains',
          'https://www.reg.ru/my/domains',
          'https://www.reg.ru/client/domains'
        ];
        for (const rp of regPaths) {
          try {
            await page.goto(rp, { waitUntil: 'networkidle2' });
            await saveScreenshot(page, `reg-path-${rp.replace(/[:\/\.?&=]/g,'_')}`);
            const h = await page.content();
            if (h.includes(domain)) { found = true; break; }
            // try to click links that look like 'Мои домены' or 'Домены'
            try {
              const clicked = await page.evaluate(() => {
                const el = Array.from(document.querySelectorAll('a,button')).find(n => n.textContent && /мои домен|мои домены|домены/i.test(n.textContent));
                if (el) { el.scrollIntoView(); el.click(); return true; }
                return false;
              });
              if (clicked) { await page.waitForTimeout(1500); const h2 = await page.content(); if (h2.includes(domain)) { found = true; break; } }
            } catch (e) {}
          } catch (e) {}
        }
        if (!found) {
          console.log('Fallback reg.ru paths did not reveal domain. Trying aggressive href clicks...');
          try {
            const hrefClicked = await page.evaluate(() => {
              const keywords = ['domain','domains','hosting','dns','site','sites','domains_manage','domains_list'];
              const links = Array.from(document.querySelectorAll('a')).filter(a=>a.href && keywords.some(k=>a.href.toLowerCase().includes(k)));
              if (links.length){ links[0].scrollIntoView(); links[0].click(); return links[0].href; }
              return null;
            });
            if (hrefClicked) { console.log('Clicked href candidate:', hrefClicked); await page.waitForTimeout(1500); const h3 = await page.content(); if (h3.includes(domain)) { found = true; } }
          } catch(e){ console.log('aggressive href clicks failed', e && e.message); }
          if (!found) {
            console.log('Aggressive attempts failed. Saving debug dump and stopping for manual follow-up.');
            try { await saveFramesDump(page, 'post-candidates-frames'); } catch(e){ console.log('saveFramesDump failed', e && e.message); }
            try { await probeFrameUrls(browser, page); } catch(e){ console.log('probeFrameUrls failed', e && e.message); }
            await saveDebugDump(page, 'post-candidates-dump');
            await browser.close();
            return;
          }
        }
      }
    }

    console.log('Attempting to click domain entry...');
    // Try to click element that contains domain text
    try {
      await page.evaluate((domain) => {
        const el = Array.from(document.querySelectorAll('a,button,div,span')).find(n => n.textContent && n.textContent.includes(domain));
        if (el) el.click();
      }, domain);
    } catch (e) { console.log('click domain failed', e.message); }

    await page.waitForTimeout(2000);
    await saveScreenshot(page, 'after-click-domain');

    // Attempt to find DNS or records management link
  const dnsLinkSelectors = ['xpath://a[contains(., "DNS")]', 'xpath://a[contains(., "DNS-записи")]', 'xpath://a[contains(., "Управление DNS")]', 'a[href*="dns"]', 'a[href*="records"]'];
    const dnsSel = await trySelectors(page, dnsLinkSelectors);
    if (dnsSel) {
      try { await page.click(dnsSel); await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}); } catch(e){}
      await saveScreenshot(page, 'dns-page');
      console.log('On DNS page, attempting to add A records...');
      // Try to find "Add record" buttons and fill form
  const addSel = await trySelectors(page, ['xpath://button[contains(., "Добавить запись")]', 'xpath://button[contains(., "Add record")]', 'button.add-record', 'xpath://a[contains(., "Добавить запись")]']);
      if (addSel) {
        try {
          // open add record UI to capture any network traffic, but avoid performing writes in probe mode
          await page.click(addSel).catch(()=>{});
          await page.waitForTimeout(1000);
          await saveScreenshot(page, 'after-click-add-record');
        } catch(e){}
        // try to find form fields (we will only inspect them in probe mode)
  const nameSel = await trySelectors(page, ['input[name="host"]', 'input[name="name"]', 'input[name="subdomain"]', 'input[placeholder*="Имя"]', 'input[placeholder*="Name"]']);
  const typeSel = await trySelectors(page, ['select[name="type"]', 'select[aria-label*="Тип"]']);
  const valueSel = await trySelectors(page, ['input[name="value"]', 'input[name="data"]', 'input[placeholder*="IP"]']);
        if (nameSel && valueSel) {
          if (PROBE_ONLY) {
            console.log('PROBE_ONLY: found record form fields, skipping typing/saving to avoid changes');
          } else {
            // add @ record
            await page.type(nameSel, '@', { delay: 50 }).catch(()=>{});
            await page.type(valueSel, '37.140.192.190', { delay: 50 }).catch(()=>{});
            // save
            const saveBtn = await trySelectors(page, ['xpath://button[contains(., "Сохранить")]', 'xpath://button[contains(., "Save")]', 'button.save']);
            if (saveBtn) { await page.click(saveBtn).catch(()=>{}); await page.waitForTimeout(1000); await saveScreenshot(page, 'after-save-record-1'); }

            // add www
            if (addSel) { await page.click(addSel).catch(()=>{}); await page.waitForTimeout(800); }
            const name2 = await trySelectors(page, ['input[name="host"]', 'input[name="name"]']);
            const value2 = await trySelectors(page, ['input[name="value"]', 'input[name="data"]']);
            if (name2 && value2) {
              await page.type(name2, 'www', { delay: 50 }).catch(()=>{});
              await page.type(value2, '37.140.192.190', { delay: 50 }).catch(()=>{});
              const saveBtn2 = await trySelectors(page, ['xpath://button[contains(., "Сохранить")]', 'button.save']);
              if (saveBtn2) { await page.click(saveBtn2).catch(()=>{}); await page.waitForTimeout(1000); await saveScreenshot(page, 'after-save-record-2'); }
            }
          }
        } else {
          console.log('Could not find record form fields automatically.');
        }
      } else {
        console.log('Could not find Add record button automatically.');
      }
    } else {
      console.log('DNS link not found automatically.');
    }

    // Try to find binding / document root settings
  const bindSelectors = ['xpath://a[contains(., "Привязать домен")]', 'xpath://a[contains(., "Настройки сайта")]', 'xpath://a[contains(., "Document root")]', 'a[href*="hosting"]', 'xpath://a[contains(., "Доступ к директории")]'];
    const bindSel = await trySelectors(page, bindSelectors);
    if (bindSel) {
      try { await page.click(bindSel); await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(()=>{}); } catch(e){}
      await saveScreenshot(page, 'bind-page');
      const docRootSel = await trySelectors(page, ['input[name="document_root"]', 'input[name="dir"]', 'input[placeholder*="документ"]', 'input[placeholder*="Document"]']);
      if (docRootSel) {
        if (PROBE_ONLY) {
          console.log('PROBE_ONLY: found document root input, skipping writing the value');
        } else {
          await page.click(docRootSel, { clickCount: 3 }).catch(()=>{});
          await page.type(docRootSel, documentRoot, { delay: 20 }).catch(()=>{});
    const saveBtn = await trySelectors(page, ['xpath://button[contains(., "Сохранить")]', 'button.save']);
          if (saveBtn) { await page.click(saveBtn).catch(()=>{}); await page.waitForTimeout(1000); await saveScreenshot(page, 'after-save-docroot'); }
        }
      } else {
        console.log('Could not find document root input automatically.');
      }
    } else {
      console.log('Bind/settings link not found automatically.');
    }

    // Try to enable SSL
    const sslSel = await trySelectors(page, ['xpath://a[contains(., "SSL")]', 'xpath://a[contains(., "Let\'s Encrypt")]', 'xpath://button[contains(., "Включить SSL")]']);
    if (sslSel) {
      try { 
        if (sslSel.startsWith('xpath:')) {
          const nodes = await page.$x(sslSel.slice(6));
          if (nodes[0]) await nodes[0].click();
        } else {
          await page.click(sslSel);
        }
        await page.waitForTimeout(1000); await saveScreenshot(page, 'ssl-page'); } catch(e){}
      if (PROBE_ONLY) {
        console.log('PROBE_ONLY: skipping SSL enable actions');
      } else {
      const enableBtn = await trySelectors(page, ['xpath://button[contains(., "Enable")]', 'xpath://button[contains(., "Включить")]', 'xpath://button[contains(., "Получить сертификат")]']);
      if (enableBtn) { await page.click(enableBtn).catch(()=>{}); await page.waitForTimeout(2000); await saveScreenshot(page, 'after-enable-ssl'); }
      }
    } else {
      console.log('Could not find SSL controls automatically.');
    }

    console.log('Finished attempts. Please inspect screenshots in scripts/screenshots/ and the console logs.');
    await browser.close();
  } catch (err) {
    console.error('Error during automation:', err);
    try { await saveScreenshot(page, 'error'); } catch(e){}
    await browser.close();
    process.exitCode = 2;
  }
}

run().catch(err => { console.error(err); process.exit(1); });
