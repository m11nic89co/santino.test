// Measure logo image natural heights and set --ticker-logo-height so all logos match visually
(function () {
  function pxToEm(px, contextEl) {
    const fontSize = parseFloat(getComputedStyle(contextEl).fontSize) || 16;
    return px / fontSize;
  }

  function measureImage(el) {
    return new Promise((resolve) => {
      if (!el) return resolve(null);
      // if it's an <img>
      if (el.tagName.toLowerCase() === 'img') {
        if (el.complete && el.naturalHeight) return resolve(el.naturalHeight);
        const img = new Image();
        img.onload = () => resolve(img.naturalHeight);
        img.onerror = () => resolve(null);
        img.src = el.src;
        return;
      }
      // if it's inline svg
      if (el.tagName.toLowerCase() === 'svg') {
        try {
          const bbox = el.getBBox();
          return resolve(bbox.height || null);
        } catch (e) {
          return resolve(null);
        }
      }
      resolve(null);
    });
  }

  async function normalize(selector) {
    const container = document.querySelector(selector || '#ticker');
    if (!container) return;
    const logoImgs = Array.from(container.querySelectorAll('.logo-badge .logo-img'));
    if (!logoImgs.length) return;

    const heights = [];
    for (const img of logoImgs) {
      const h = await measureImage(img);
      if (h && h > 0) heights.push(h);
    }
    if (!heights.length) return;

    // choose median to avoid outliers
    heights.sort((a, b) => a - b);
    const mid = Math.floor(heights.length / 2);
    const median = heights.length % 2 === 1 ? heights[mid] : (heights[mid - 1] + heights[mid]) / 2;

    // convert to em relative to ticker font-size
    const em = pxToEm(median, container);
    document.documentElement.style.setProperty('--ticker-logo-height', em + 'em');
  }

  function init() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    window.addEventListener('load', () => setTimeout(() => normalize('#ticker'), 120));
    window.addEventListener('resize', () => normalize('#ticker'));
  }

  if (typeof window !== 'undefined') init();
})();
