Loader visibility fix

What's changed:

- The loader logo (`.loader-logo`) is now visible by default via critical CSS in `index.html` to avoid flash-of-invisible-logo on first paint.
- Duplicate `.loader-logo` rules were removed from `deferred.css` to prevent conflicts when the deferred stylesheet loads.
- The inline loader JS no longer sets `opacity = 0` at DOMContentLoaded; it now adjusts filter/scale and animates to full brightness/scale.
- Service Worker cache name bumped to `santino-v2` so clients receive updated files after a hard reload.

How to test locally:

1. In the browser, open DevTools -> Application -> Service Workers. Unregister any existing service worker and clear site data.
2. Reload the page (Ctrl+R). You should see the loader logo immediately above the progress bar and animate smoothly.
3. If using a controlled client, do a hard reload (Ctrl+F5) to ensure you get the updated SW and assets.

If the logo still doesn't appear, ensure `santino_magneto_outlined.svg` exists in repo root and is accessible (it's referenced as `/santino_magneto_outlined.svg` in HTML).

Additional note — animations synchronized

- Logo brightness/scale animation and loader-bar duration are now synchronized to 1000ms.
- The loader hides after both animations finish (1000ms + 200ms buffer).
- Test by opening DevTools → Performance and recording a short capture; you should see the two animations running together.
