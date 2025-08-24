(async ()=>{
  try{
    const modCore = await import('puppeteer-core').catch(e=>({__err:e && e.stack || e && e.message || String(e)}));
    console.log('puppeteer-core import:', Object.keys(modCore||{}), 'hasDefault=', !!(modCore && modCore.default), 'err=', modCore && modCore.__err);
    const mod = await import('puppeteer').catch(e=>({__err:e && e.stack || e && e.message || String(e)}));
    console.log('puppeteer import:', Object.keys(mod||{}), 'hasDefault=', !!(mod && mod.default), 'err=', mod && mod.__err);
  }catch(e){
    console.error('test import error', e && e.stack || e && e.message || String(e));
  }
})();
