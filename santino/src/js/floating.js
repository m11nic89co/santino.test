// Floating gallery: show at least N non-duplicate floating SVGs simultaneously
(function(){
  // files only; full path is resolved per-container using data-base attribute
  const files = [
    'soap_dish.svg',
    'cup.svg',
    'plastic_jar_lid.svg',
    'food_box.svg',
    'flower_box.svg'
  ];

  function randInt(max){ return Math.floor(Math.random()*max); }

  function chooseUniqueIndices(n, max){
    const out = new Set();
    while(out.size < n){
      out.add(randInt(max));
      if(out.size === max) break;
    }
    return Array.from(out);
  }

  function createItem(src, filename){
    const el = document.createElement('div');
    el.className = 'floating-item';
    el.dataset.file = filename;
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.loading = 'lazy';
    el.appendChild(img);
    return el;
  }

  function placeRandom(el){
    const container = el.parentElement;
    const pw = Math.max(120, container.clientWidth);
    const ph = Math.max(120, container.clientHeight);
    const scale = Number(container.dataset.scale || 1);
    const w = (90 + Math.random()*80) * scale;
    const h = w * 0.7;
    el.style.width = Math.round(w) + 'px';
    el.style.height = Math.round(h) + 'px';
    el.style.left = Math.round(Math.random()*(pw - w)) + 'px';
    el.style.top = Math.round(Math.random()*(ph - h)) + 'px';
    el.style.transform = 'rotate(' + (Math.random()*28 - 14) + 'deg)';
  }

  function refresh(container, minShown, base){
    // remove accidental duplicates by filename
    const items = Array.from(container.querySelectorAll('.floating-item'));
    const seen = new Set();
    items.forEach(it => {
      const f = it.dataset.file;
      if(seen.has(f)) it.remove(); else seen.add(f);
    });

    let shown = Array.from(container.querySelectorAll('.floating-item'));
    const need = Math.max(0, minShown - shown.length);

    // available filenames
    const used = new Set(shown.map(s => s.dataset.file));
    const available = files.filter(f => !used.has(f));
    const picks = [];
    for(let i=0;i<need && available.length;i++){
      const idx = randInt(available.length);
      picks.push(available.splice(idx,1)[0]);
    }
    picks.forEach(fname => {
      const url = base + fname;
      const item = createItem(url, fname);
      container.appendChild(item);
      placeRandom(item);
    });

    // nudge some existing items
    shown = Array.from(container.querySelectorAll('.floating-item'));
    shown.forEach(it=>{ if(Math.random() < 0.45) placeRandom(it); });

    // keep count bounded
    while(container.children.length > files.length){ container.removeChild(container.lastChild); }
  }

  window.addEventListener('DOMContentLoaded', ()=>{
    const containers = document.querySelectorAll('.floating-gallery');
    containers.forEach(container=>{
      const minShown = Math.max(3, parseInt(container.dataset.min || '3',10));
      // base path for svgs (allow embedding into any folder)
      let base = container.dataset.base;
      if(!base){ base = 'santino/svgs/'; }
      if(!base.endsWith('/')) base = base + '/';

      // init with unique picks
      const ids = chooseUniqueIndices(minShown, files.length);
      ids.forEach(i=>{
        const fname = files[i];
        const item = createItem(base + fname, fname);
        container.appendChild(item);
        placeRandom(item);
      });

      // periodic refresh
      setInterval(()=> refresh(container, minShown, base), 2800 + Math.random()*3200);

      // reposition on resize
      window.addEventListener('resize', ()=>{
        Array.from(container.querySelectorAll('.floating-item')).forEach(placeRandom);
      });
    });
  });
})();
