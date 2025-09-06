document.addEventListener('DOMContentLoaded', function () {
    const slides = document.querySelectorAll('.swiper-slide');
    const slideTitles = Array.from(slides).map(slide => slide.dataset.title || '');

    const _prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Simplified: force plain vertical slide effect (no fancy creative/fade modes)
    const selectedEffect = 'slide';
    const speedMs = _prefersReducedMotion ? 550 : 750;

    const swiper = new Swiper('.swiper', {
        direction: 'vertical',
        slidesPerView: 1,
        spaceBetween: 0,
        // Make progress-based logic reliable for parallax
        watchSlidesProgress: true,
        roundLengths: true,
        observer: true,
        observeParents: true,
        // Smoothen wheel/touch behavior across devices
        mousewheel: {
            forceToAxis: true,
            releaseOnEdges: true,
            thresholdDelta: 24,   // require a larger wheel delta to trigger
            thresholdTime: 80,    // and slightly longer time window
            sensitivity: 0.4,     // lower sensitivity for calmer steps
        },
    // Touch tuning for mobile
    touchAngle: 30,           // stricter vertical intent
    threshold: 10,            // a touch needs a bit more travel to start
    followFinger: true,
    simulateTouch: true,
    passiveListeners: true,   // keep listeners passive to avoid main-thread jank
    touchStartPreventDefault: false, // don't call preventDefault on passive listeners
    iOSEdgeSwipeDetection: true,
    iOSEdgeSwipeThreshold: 30,
        resistanceRatio: 0.92, // gentler resistance for smoother feel
        longSwipesMs: 220,     // slightly longer swipe timing window
        touchReleaseOnEdges: true,
        preventInteractionOnTransition: true, // ignore new input while animating
        a11y: {
            enabled: true,
            firstSlideMessage: 'Первая секция',
            lastSlideMessage: 'Последняя секция',
            paginationBulletMessage: 'Перейти к секции {{index}}',
        },
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
            renderBullet: function (index, className) {
                const title = slideTitles[index];
                const label = title ? `Перейти к секции: ${title}` : `Перейти к секции ${index+1}`;
                return `<span class="${className}" data-tooltip="${title}" role="button" tabindex="0" aria-label="${label}" aria-controls="section-${index}"></span>`;
            },
        },
        speed: speedMs,
        effect: selectedEffect,
        grabCursor: true,
        keyboard: {
            enabled: true,
        },
        on: {},
    });
    // Removed fog/creative effects; simple scroll-like navigation only

    // --- Hero Parallax driver ---
    // Uses slide.progress to drive lightweight transforms on .hero-bg and .hero-parallax
    // Respects prefers-reduced-motion and runtime low-power flag on <body>
    // use the _prefersReducedMotion defined above
    let _parallaxRaf = null;

    function _applyParallaxOnce() {
        if (_prefersReducedMotion || document.body.classList.contains('is-low-power')) {
            document.querySelectorAll('.hero-bg, .hero-parallax').forEach(el => {
                el.style.transform = '';
                el.style.willChange = '';
            });
            return;
        }

        // Only consider slides near the viewport to reduce per-frame work
        swiper.slides.forEach(slide => {
            const p = slide.progress; // -1 .. 0 .. 1
            if (p < -1.5 || p > 1.5) return;
            const bg = slide.querySelector && slide.querySelector('.hero-bg');
            const para = slide.querySelector && slide.querySelector('.hero-parallax');

            if (bg) {
                // subtle vertical parallax + tiny zoom based on how far the slide is from center
                const bgTranslate = (p * 12); // percent
                const bgScale = 1 + Math.min(0.06, Math.abs(p) * 0.03);
                bg.style.willChange = 'transform';
                bg.style.transform = `translate3d(0, ${bgTranslate}%, 0) scale(${bgScale})`;
            }
            if (para) {
                // content moves the opposite direction and less distance
                const paraTranslate = (p * -6); // percent
                para.style.willChange = 'transform';
                para.style.transform = `translate3d(0, ${paraTranslate}%, 0)`;
            }
        });
    }

    function _scheduleParallax() {
        if (_parallaxRaf) cancelAnimationFrame(_parallaxRaf);
        _parallaxRaf = requestAnimationFrame(_applyParallaxOnce);
    }

    // Hook into Swiper lifecycle for smooth updates
    swiper.on('setTranslate', _scheduleParallax);
    swiper.on('slideChangeTransitionEnd', _applyParallaxOnce);
    // Run once on init so the first slide (hero) is correctly positioned
    _applyParallaxOnce();

    // --- Grid overlay: show only after leaving the hero (no grid on first slide, and not during preload) ---
    function updateGridOverlay() {
        // Keep grid off for all slides except the first, where it's ultra-faint
        const isHero = swiper.activeIndex === 0;
        document.body.classList.toggle('grid-hero', isHero);
        document.body.classList.remove('grid-on');
    }
    // Ensure correct state on slide changes and init
    swiper.on('slideChange', updateGridOverlay);
    updateGridOverlay();

    // --- Italian-style reveal for the "НАША КОЛЛЕКЦИЯ" (Коллекция) section ---
    const collectionIdx = (() => {
        // Support both legacy 'Коллекция' and new 'НАША КОЛЛЕКЦИЯ' titles
        const norm = (t) => (t || '').toLowerCase().trim();
        let idx = slideTitles.findIndex(t => {
            const n = norm(t);
            return n === 'коллекция' || n === 'наша коллекция';
        });
        if (idx < 0) idx = 2; // fallback to known index
        return idx;
    })();

    function playCollectionReveal() {
        const target = slides[collectionIdx];
        if (!target) return;
        // retrigger CSS animation by removing/forcing reflow/adding with a slight delay for "fog from nowhere"
        target.classList.remove('italian-reveal');
        void target.offsetWidth;
        setTimeout(() => {
            target.classList.add('italian-reveal');
        }, 120);
    }
    // Play on initial load if we start at collection, and on entering it
    if (swiper.activeIndex === collectionIdx) playCollectionReveal();
    swiper.on('slideChangeTransitionStart', () => {
        if (swiper.activeIndex === collectionIdx) playCollectionReveal();
    });

    // Toggle slow background pan only when collection is active
    function updateCollectionPan() {
        const target = slides[collectionIdx];
        if (!target) return;
        const shouldPan = swiper.activeIndex === collectionIdx;
        if (!shouldPan) {
            target.classList.remove('collection-pan');
            return;
        }
        // Delay start until current transition completes to avoid jump
        if (swiper.animating) {
            const startPan = () => {
                target.classList.add('collection-pan');
                swiper.off('slideChangeTransitionEnd', startPan);
            };
            swiper.on('slideChangeTransitionEnd', startPan);
        } else {
            target.classList.add('collection-pan');
        }
    }
    updateCollectionPan();
    swiper.on('slideChange', updateCollectionPan);

    // Toggle slow background pan only when ABOUT (now moved to last: section-4) is active
    const aboutIdx = 4; // section-4
    function updateAboutPan() {
        const target = slides[aboutIdx];
        if (!target) return;
        const isActive = swiper.activeIndex === aboutIdx;
    target.classList.toggle('about-pan', isActive);
        if (isActive) {
            // retrigger reveal by toggling class
            target.classList.remove('about-reveal');
            void target.offsetWidth;
            requestAnimationFrame(() => target.classList.add('about-reveal'));
        } else {
            target.classList.remove('about-reveal');
        }
    }
    updateAboutPan();
    swiper.on('slideChange', updateAboutPan);

    // Toggle slow background pan only when CONTRACT MOLDING (now section-2) is active
    const contractIdx = 2; // section-2
    function updateContractPan() {
        const target = slides[contractIdx];
        if (!target) return;
        target.classList.toggle('contract-pan', swiper.activeIndex === contractIdx);
    }
    updateContractPan();
    swiper.on('slideChange', updateContractPan);

    // --- Welding sparks: run only on the first slide (hero) ---
    function updateWeldingSparksCycle() {
        try {
            const isHero = swiper.activeIndex === 0;
            const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const lowPower = document.body.classList.contains('is-low-power');
            if (!isHero) {
                if (typeof window.stopBtnCycle === 'function') window.stopBtnCycle();
                // extra: ensure paparazzi flash hidden if leftover timers existed
                try {
                    const flash = document.getElementById('paparazzi-flash');
                    if (flash) {
                        flash.classList.remove('lightning-series');
                        flash.style.display = 'none';
                    }
                    if (window.__flashTimers) { window.__flashTimers.forEach(id=>clearTimeout(id)); window.__flashTimers = []; }
                } catch(_) {}
            } else {
                if (!reduced && !lowPower && typeof window.startBtnCycle === 'function') window.startBtnCycle();
            }
        } catch (_) { /* no-op */ }
    }
    updateWeldingSparksCycle();
    swiper.on('slideChange', updateWeldingSparksCycle);

    // --- Menu Generation ---
    const navLeft = document.querySelector('.main-nav-left');
    const navRight = document.querySelector('.main-nav-right');
    const mobileNav = document.querySelector('.mobile-nav');

    // Build items excluding the hero (index 0). Keep data-index values so logo (index 0) still goes to hero.
    const allItems = slideTitles.map((t, i) => ({ title: t, idx: i })).filter(it => !!it.title);
    const byIdx = Object.fromEntries(allItems.map(it => [it.idx, it]));

    // Explicit order after moving ABOUT to the end: left => 1:'НАША КОЛЛЕКЦИЯ', 2:'КОНТРАКТНОЕ ЛИТЬЁ'; right => 3:'КОНТАКТЫ', 4:'О НАС'
    const labelMap = { 1: 'НАША КОЛЛЕКЦИЯ', 2: 'КОНТРАКТНОЕ ЛИТЬЁ', 3: 'КОНТАКТЫ', 4: 'О НАС' };
    const desiredOrder = [1, 2, 3, 4].filter(i => byIdx[i]);
    // Append any other indices (if exist) in natural order excluding duplicates and 0 (hero)
    const others = allItems
        .map(it => it.idx)
        .filter(i => i !== 0 && !desiredOrder.includes(i));
    const orderedIdx = [...desiredOrder, ...others];
    const contentItems = orderedIdx.map(i => ({ idx: i, title: labelMap[i] || (byIdx[i]?.title || '') }));

    // Split groups: first two left, rest right (ABOUT now appears in right group at the end)
    const leftGroup = contentItems.slice(0, 2);
    const rightGroup = contentItems.slice(2);

    const leftItemsHtml  = leftGroup.map(it => `<a href="#" data-index="${it.idx}" id="menu-link-${it.idx}">${it.title}</a>`).join('');
    const rightItemsHtml = rightGroup.map(it => `<a href="#" data-index="${it.idx}" id="menu-link-${it.idx}">${it.title}</a>`).join('');
    const allItemsHtml   = [leftItemsHtml, rightItemsHtml].join('');
    // Mobile menu gets a leading 'ГЛАВНАЯ' pointing to slide 0
    const homeItemHtml   = `<a href="#" data-index="0" id="menu-link-0">ГЛАВНАЯ</a>`;
    // Mobile social icons (placeholders: update href values to real profiles)
    const mobileSocialHtml = `\n<div class="mobile-social" role="group" aria-label="Социальные сети">\n`
        + `<a class=\"social-link social-yt\" aria-label=\"YouTube\" href=\"https://youtube.com\" target=\"_blank\" rel=\"noopener\">`
        + `<svg viewBox=\"0 0 24 24\" width=\"26\" height=\"26\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M23.5 6.2s-.23-1.64-.95-2.36c-.9-.95-1.9-.96-2.36-1.02C16.9 2.5 12 2.5 12 2.5h0s-4.9 0-8.19.32c-.46.06-1.46.07-2.36 1.02C.73 4.56.5 6.2.5 6.2S.27 8.13.27 10.06v1.85c0 1.93.23 3.86.23 3.86s.23 1.64.95 2.36c.9.95 2.08.92 2.61 1.02 1.9.18 8 .3 8 .3s4.9-.01 8.19-.33c.46-.06 1.46-.07 2.36-1.02.72-.72.95-2.36.95-2.36s.23-1.93.23-3.86v-1.85c0-1.93-.23-3.86-.23-3.86ZM9.82 14.73V8.67l6.19 3.04-6.19 3.02Z\"/></svg>`
        + `</a>`
        + `<a class=\"social-link social-vk\" aria-label=\"VK\" href=\"https://vk.com\" target=\"_blank\" rel=\"noopener\">`
        + `<svg viewBox=\"0 0 24 24\" width=\"26\" height=\"26\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M21.55 6.56c.14-.46 0-.8-.66-.8h-2.2c-.56 0-.82.3-.96.63 0 0-1.12 2.72-2.7 4.48-.51.5-.74.66-1.02.66-.14 0-.34-.16-.34-.62V6.56c0-.55-.15-.8-.6-.8H9.2c-.34 0-.54.25-.54.48 0 .52.78.64.86 2.1v3.17c0 .7-.13.83-.41.83-.74 0-2.53-2.74-3.59-5.87-.2-.58-.4-.82-.96-.82H2.35c-.62 0-.74.3-.74.63 0 .59.74 3.5 3.45 7.35 1.8 2.56 4.34 3.94 6.66 3.94 1.39 0 1.56-.31 1.56-.84v-1.94c0-.62.13-.74.56-.74.32 0 .88.16 2.18 1.39 1.49 1.46 1.74 2.13 2.57 2.13h2.2c.63 0 .95-.31.77-.93-.2-.62-.92-1.53-1.88-2.6-.52-.61-1.3-1.27-1.54-1.6-.33-.42-.24-.6 0-.97 0 0 2.72-3.85 3-5.15Z\"/></svg>`
        + `</a>`
        + `<a class=\"social-link social-wa\" aria-label=\"WhatsApp\" href=\"https://wa.me/79001234567\" target=\"_blank\" rel=\"noopener\">`
        + `<svg viewBox=\"0 0 24 24\" width=\"26\" height=\"26\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M20.52 3.48A11.87 11.87 0 0 0 12.04 0C5.46.03.2 5.3.22 11.88c0 2.09.55 4.14 1.6 5.94L0 24l6.4-1.67a11.86 11.86 0 0 0 5.65 1.44h.01c6.58 0 11.85-5.27 11.87-11.75A11.73 11.73 0 0 0 20.52 3.48Zm-8.48 17.3h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.8.99 1.02-3.7-.24-.38a9.8 9.8 0 0 1-1.5-5.17C2.07 6.42 6.46 2.1 12.02 2.1c2.6 0 5.03 1 6.86 2.82A9.62 9.62 0 0 1 21.9 12c-.02 5.55-4.4 8.78-9.86 8.78Zm5.4-7.33c-.29-.15-1.7-.84-1.96-.94-.26-.1-.45-.15-.64.15-.19.29-.74.94-.9 1.13-.17.19-.33.21-.62.06-.29-.15-1.23-.45-2.34-1.43-.86-.76-1.44-1.7-1.61-1.99-.17-.29-.02-.45.13-.6.13-.13.29-.33.43-.5.15-.17.19-.29.29-.48.1-.19.05-.36-.03-.51-.08-.15-.64-1.54-.88-2.1-.23-.55-.47-.48-.64-.49-.17-.01-.36-.01-.55-.01-.19 0-.5.07-.76.36-.26.29-1 1-1 2.44 0 1.44 1.03 2.84 1.17 3.04.15.19 2.03 3.1 4.92 4.35.69.3 1.23.48 1.65.61.69.22 1.32.19 1.82.12.55-.08 1.7-.7 1.94-1.39.24-.68.24-1.26.17-1.39-.07-.13-.26-.21-.55-.36Z\"/></svg>`
        + `</a>\n</div>`;
    const mobileItemsHtml= `<div class="mobile-nav-inner">`
        + [homeItemHtml, ...contentItems.map(it => `<a href="#" data-index="${it.idx}" id="menu-link-${it.idx}">${it.title}</a>`)].join('')
        + mobileSocialHtml
        + `</div>`;

    function injectMenusForViewport() {
        const isDesktop = window.innerWidth > 900;
        if (isDesktop) {
            // Desktop: all items go to the left cascade; right menu cleared
            // Include HOME at the very top per request
            navLeft.innerHTML = homeItemHtml + allItemsHtml;
            navRight.innerHTML = '';
        } else {
            // Mobile/Tablet: keep split around logo as before
            navLeft.innerHTML = leftItemsHtml;
            navRight.innerHTML = rightItemsHtml;
        }
        mobileNav.innerHTML = mobileItemsHtml;
    }

    injectMenusForViewport();

    // Refresh selector after injection so we capture generated links
    let allNavLinks = document.querySelectorAll('.main-nav a, .mobile-nav a, .logo-link');
    const hamburger = document.getElementById('hamburger-menu');
    const hamburgerCaption = document.querySelector('.hamburger-caption');
    // const mobileNav = document.getElementById('mobile-nav'); // This was the duplicate declaration, now removed.

    function updateActiveLink(index) {
        allNavLinks.forEach(link => {
            link.classList.remove('active');
            link.removeAttribute('aria-current');
            const isTarget = parseInt(link.dataset.index) === index;
            if (isTarget) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
            }
        });
    }

    swiper.on('slideChange', function () {
        updateActiveLink(swiper.activeIndex);
    });

    function bindLink(link) {
        if (link.dataset.bound === '1') return;
        link.dataset.bound = '1';
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const slideIndex = parseInt(this.dataset.index);
            if (Number.isNaN(slideIndex)) return; // ignore logo or non-nav
            // slot-machine roll on desktop menu links
            if (this.classList.contains('has-slot')) {
                this.classList.remove('roll');
                void this.offsetWidth; // force reflow
                this.classList.add('roll');
            }
            swiper.slideTo(slideIndex);
            if (mobileNav.classList.contains('is-open')) {
                toggleMenu(false);
            }
        });
    }

    allNavLinks.forEach(bindLink);

    function toggleMenu(open) {
        const willOpen = typeof open === 'boolean' ? open : !mobileNav.classList.contains('is-open');
        hamburger.classList.toggle('is-active', willOpen);
        mobileNav.classList.toggle('is-open', willOpen);
        hamburger.setAttribute('aria-expanded', String(willOpen));
        mobileNav.setAttribute('aria-hidden', String(!willOpen));
        // lock body scroll when menu is open (mobile)
        document.body.dataset.scrollLock = willOpen ? '1' : '';
        document.body.style.overflow = willOpen ? 'hidden' : '';
        if (hamburgerCaption) {
            // keep caption visible even when menu open; could dim if needed
            hamburgerCaption.style.opacity = willOpen ? '0.9' : '1';
        }
        if (willOpen) {
            // move focus to first link
            const first = mobileNav.querySelector('a');
            if (first) first.focus();
        } else {
            hamburger.focus();
        }
    }

    hamburger.addEventListener('click', () => toggleMenu());
    hamburger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMenu(); }
        if (e.key === 'Escape') { toggleMenu(false); }
    });

    // Click outside links to close when overlay is open
    mobileNav.addEventListener('click', (e) => {
        if (!e.target.closest('a')) toggleMenu(false);
    });

    // Safety: close on hash change or wheel interaction when open
    window.addEventListener('hashchange', () => { if (mobileNav.classList.contains('is-open')) toggleMenu(false); });
    swiper.on('wheel', () => { if (mobileNav.classList.contains('is-open')) toggleMenu(false); });

    // Focus trap inside mobile nav when open
    mobileNav.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { toggleMenu(false); }
        if (e.key === 'Tab' && mobileNav.classList.contains('is-open')) {
            const focusables = mobileNav.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])');
            if (!focusables.length) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });

    // Ensure mobile menu reflects current active slide on init
    if (mobileNav) {
    const mlinks = mobileNav.querySelectorAll('a');
        mlinks.forEach(a => {
            const idx = parseInt(a.dataset.index);
            if (idx === swiper.activeIndex) a.classList.add('active');
        });
    }

    // Initialize first slide and link
    updateActiveLink(swiper.activeIndex);
    // custom slide animation classes removed in favor of Swiper creativeEffect

    // Hide caption on desktop
    function updateCaptionVisibility() {
        const isMobile = window.innerWidth <= 900;
        if (hamburgerCaption) hamburgerCaption.style.display = isMobile ? 'block' : 'none';
    }
    updateCaptionVisibility();
    window.addEventListener('resize', () => requestAnimationFrame(updateCaptionVisibility), { passive: true });

    // Keyboard support for pagination bullets (enter/space)
    const paginationEl = document.querySelector('.swiper-pagination');
    if (paginationEl) {
        paginationEl.addEventListener('keydown', (e) => {
            const target = e.target;
            if (!(target && target.classList && target.classList.contains('swiper-pagination-bullet'))) return;
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const bullets = Array.from(paginationEl.querySelectorAll('.swiper-pagination-bullet'));
                const idx = bullets.indexOf(target);
                if (idx >= 0) swiper.slideTo(idx);
            }
        });
    }

    // --- Dimension labels in millimeters under menu underline (desktop only) ---
    const PX_PER_MM = 3.7795275591; // CSS reference: 1in = 96px, 1mm = 96/25.4
    const ARROW_SIZE_PX = 8; // must match --nav-arrow-size in CSS

    function updateMenuDimensionLabels() {
        const desktopLinks = document.querySelectorAll('.main-nav a[data-index]');
        const mobileLinks  = document.querySelectorAll('.mobile-nav a[data-index]');
        [...desktopLinks, ...mobileLinks].forEach(link => {
            const rect = link.getBoundingClientRect();
            const lineWidthPx = Math.max(0, rect.width - (ARROW_SIZE_PX * 2));
            const mm = Math.max(1, Math.round(lineWidthPx / PX_PER_MM));
            link.setAttribute('data-mm', String(mm));
        });
    }

    // initial compute after layout (after nav injected)
    requestAnimationFrame(() => updateMenuDimensionLabels());
    // recompute on resize with a light debounce
    let _mmRaf = 0;
    function handleResize() {
        // reinject menus for breakpoint and rebind links safely
        injectMenusForViewport();
        allNavLinks = document.querySelectorAll('.main-nav a, .mobile-nav a, .logo-link');
        allNavLinks.forEach(bindLink);
        updateActiveLink(swiper.activeIndex);
        if (_mmRaf) cancelAnimationFrame(_mmRaf);
        _mmRaf = requestAnimationFrame(updateMenuDimensionLabels);
    }
    window.addEventListener('resize', handleResize, { passive: true });
    // recompute when opening the mobile menu (links become centered and wider)
    mobileNav.addEventListener('transitionend', (e) => {
        const prop = e.propertyName;
        if ((prop === 'opacity' || prop === 'transform') && mobileNav.classList.contains('is-open')) {
            requestAnimationFrame(updateMenuDimensionLabels);
        }
    });
});
