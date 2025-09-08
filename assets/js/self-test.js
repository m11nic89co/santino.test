// Runtime self-test / diagnostics (non-fatal). Attach after main & swiper-init.
(function(){
  function log(level, msg, extra){
    const tag = '[SELFTEST]';
    if(level==='error') console.error(tag, msg, extra||'');
    else if(level==='warn') console.warn(tag, msg, extra||'');
    else console.log(tag, msg, extra||'');
  }
  function safe(sel){ return Array.from(document.querySelectorAll(sel)); }
  function delay(ms){ return new Promise(r=>setTimeout(r,ms)); }

  async function run(){
    try {
      log('info','Starting diagnostics');
      // 1. Slides
      const slides = safe('.swiper-slide');
      if(!slides.length) return log('error','No .swiper-slide elements found');
      log('info',`Slide count: ${slides.length}`);
      // Detect duplicates by id index pattern
      const ids = slides.map(s=>s.id||'');
      const dupIds = ids.filter((v,i,a)=>v && a.indexOf(v)!==i);
      if(dupIds.length) log('warn','Duplicate slide ids', dupIds);

      // 2. Swiper instance
      if(!window.swiper){ log('warn','window.swiper missing at self-test start; will retry'); await delay(400); }
      if(!window.swiper){ return log('error','Swiper still not initialized'); }
      if(window.swiper.params.loop) log('warn','Swiper loop enabled unexpectedly');

      // 3. Mobile menu structure
      const mob = document.querySelector('.mobile-nav');
      if(!mob) log('error','Mobile nav element missing');
      else {
        const links = mob.querySelectorAll('a[data-index]');
        if(!links.length) log('warn','No links inside mobile nav yet');
      }

      // 4. Flash element lifecycle
      const flash = document.getElementById('paparazzi-flash');
      if(!flash) log('warn','Flash element #paparazzi-flash missing');
      else if(getComputedStyle(flash).display==='none' && window.swiper.activeIndex===0){
        log('info','Flash currently hidden (may appear during intro sequence)');
      }

      // 5. Logo layering
      const logo = document.getElementById('main-logo');
      if(logo){
        const z = getComputedStyle(logo).zIndex;
        if(parseInt(z,10) < 1000) log('warn','Logo z-index lower than expected', z);
      } else log('warn','Logo element missing');

      // 6. Accessibility roles
      const issues = [];
      safe('.mobile-nav a, .main-nav a').forEach(a=>{ if(!a.getAttribute('aria-label') && !a.textContent.trim()) issues.push(a); });
      if(issues.length) log('warn','Links without accessible name', issues);

      // 7. Active link sync
      const act = safe('.mobile-nav a.active, .main-nav a.active');
      const mismatch = act.some(a=>parseInt(a.dataset.index)!==window.swiper.activeIndex);
      if(mismatch) log('warn','Active link dataset index mismatch with swiper.activeIndex');

      // 8. Body scroll lock state when menu closed
      const menuOpen = mob && mob.classList.contains('is-open');
      if(!menuOpen && document.body.style.overflow==='hidden') log('warn','Body overflow locked while menu not open');

      log('info','Diagnostics complete');
    } catch(err){
      log('error','Self-test crashed', err);
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
