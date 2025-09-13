// Compute ticker duration so visible speed is consistent (px per second) across devices
// Usage: include this script after the ticker DOM, or call TickerSpeed.init({selector:'#ticker-track', pxPerSecond: 100})
const TickerSpeed = (function () {
  function getTrackWidth(track) {
    // total width of track content (px)
    return track.scrollWidth;
  }

  function applyDuration(track, pxPerSecond) {
    const width = getTrackWidth(track);
    // we animate translateX from 0 to -50% of track (since content is duplicated for seamless loop)
    // compute pixels to travel = width / 2
    const pixels = width / 2;
    const duration = Math.max(4, Math.round(pixels / (pxPerSecond || 100)));
    // only update when changed to avoid animation restart/jitter
    const prev = track.style.getPropertyValue('--ticker-duration');
    const next = duration + 's';
    if (prev !== next) track.style.setProperty('--ticker-duration', next);
    return duration;
  }

  function init(opts) {
    // read default px/s from CSS variable if present
    const rootStyle = getComputedStyle(document.documentElement);
    const cssPx = parseFloat(rootStyle.getPropertyValue('--ticker-px-per-second')) || 120;
    const cfg = Object.assign({ selector: '#ticker-track', pxPerSecond: cssPx }, opts || {});
    const track = document.querySelector(cfg.selector);
    if (!track) return;

    let _raf = 0;
    function recalc() {
      // If main.js has built a seamless ticker (two segments), let it drive duration to avoid conflicts
      try {
        const segs = track.querySelectorAll('.ticker-segment');
        if (segs && segs.length >= 2) return; // no-op; seamless ticker manages its own speed
      } catch (_) {}
      if (_raf) cancelAnimationFrame(_raf);
      _raf = requestAnimationFrame(() => {
        applyDuration(track, cfg.pxPerSecond);
      });
    }

    // respect reduced motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      track.style.animationPlayState = 'paused';
      return;
    }

  // initial compute
  recalc();
  // recompute on resize and when fonts/images load
  window.addEventListener('resize', () => recalc());
  window.addEventListener('orientationchange', () => setTimeout(recalc, 80));
  window.addEventListener('pageshow', () => setTimeout(recalc, 80));
  window.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(recalc, 80); });
  window.addEventListener('load', () => setTimeout(recalc, 100));

    // also observe mutations in case content changes
    const ro = new MutationObserver(() => recalc());
    ro.observe(track, { childList: true, subtree: true });
  }

  return { init };
})();

// auto-init if found
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const rootStyle = getComputedStyle(document.documentElement);
    const cssPx = parseFloat(rootStyle.getPropertyValue('--ticker-px-per-second')) || 30;
    const low = document.body && document.body.classList && document.body.classList.contains('is-low-power');
    const speed = low ? Math.max(20, Math.round(cssPx * 0.6)) : cssPx; // ~40% slower on low-power
    // Defer a tick so main.js can construct the seamless ticker first; then init only if needed
    setTimeout(() => {
      const track = document.querySelector('#ticker-track');
      if (!track) return;
      const segs = track.querySelectorAll('.ticker-segment');
      if (segs && segs.length >= 2) return; // already managed by main.js
      TickerSpeed.init({ selector: '#ticker-track', pxPerSecond: speed });
    }, 0);
  });
}
