document.addEventListener('DOMContentLoaded', function () {
    const slides = document.querySelectorAll('.swiper-slide');
    const slideTitles = Array.from(slides).map(slide => slide.dataset.title || '');

    const _prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // --- Transition mode selection ---
    function getTransitionMode() {
        if (_prefersReducedMotion) return 'slide';
        const params = new URLSearchParams(window.location.search);
        const fromQuery = (params.get('mode') || params.get('transition') || '').toLowerCase();
        const fromBody = (document.body.dataset.transition || '').toLowerCase();
        const cand = fromQuery || fromBody || '';
        if (['mist','zoom','glide','fade','slide'].includes(cand)) return cand;
        return 'mist'; // default
    }

    const TRANSITION_MODE = getTransitionMode();

    // Map mode to Swiper effect and options
    let selectedEffect = 'slide';
    let fadeEffectOpt = undefined;
    let creativeEffectOpt = undefined;
    let speedMs = _prefersReducedMotion ? 600 : 920;

    if (_prefersReducedMotion || TRANSITION_MODE === 'slide') {
        selectedEffect = 'slide';
    } else if (TRANSITION_MODE === 'mist' || TRANSITION_MODE === 'fade') {
        selectedEffect = 'fade';
        fadeEffectOpt = { crossFade: true };
    } else if (TRANSITION_MODE === 'zoom') {
        selectedEffect = 'creative';
        creativeEffectOpt = {
            perspective: true,
            limitProgress: 2,
            prev: { translate: [0, -120, -80], scale: 0.92, opacity: 0.8 },
            next: { translate: [0, 120, -80],  scale: 1.06, opacity: 1   },
        };
        speedMs = 940;
    } else if (TRANSITION_MODE === 'glide') {
        selectedEffect = 'creative';
        creativeEffectOpt = {
            perspective: true,
            limitProgress: 2,
            prev: { translate: [-60, -100, -60], rotate: [0, 0, -3], opacity: 0.85 },
            next: { translate: [ 60,  100, -60], rotate: [0, 0,  3], opacity: 1    },
        };
        speedMs = 980;
    }

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
        creativeEffect: creativeEffectOpt,
        fadeEffect: fadeEffectOpt,
        cubeEffect: undefined,
        flipEffect: undefined,
        keyboard: {
            enabled: true,
        },
        on: {},
    });

    // --- Fog overlay setup (only for mist mode) ---
    const fogLayers = [];
    if (TRANSITION_MODE === 'mist' && !_prefersReducedMotion) {
        slides.forEach(slide => {
            const fog = document.createElement('div');
            fog.className = 'fog-layer';
            slide.appendChild(fog);
            fogLayers.push(fog);
        });

        function fogIn(index) {
            const fog = fogLayers[index]; if (!fog) return;
            fog.style.setProperty('--fogOpacity', '0.85');
            fog.style.setProperty('--fogBlur', '14px');
        }
        function fogOut(index) {
            const fog = fogLayers[index]; if (!fog) return;
            fog.style.setProperty('--fogOpacity', '0');
            fog.style.setProperty('--fogBlur', '0px');
        }

        // On transition start, raise fog on previous (outgoing); on end, clear on new and previous
        swiper.on('slideChangeTransitionStart', () => {
            fogIn(swiper.previousIndex ?? 0);
        });
        swiper.on('slideChangeTransitionEnd', () => {
            fogOut(swiper.activeIndex);
            if (Number.isInteger(swiper.previousIndex)) fogOut(swiper.previousIndex);
        });
    }

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
    const mobileItemsHtml= [homeItemHtml, ...contentItems.map(it => `<a href="#" data-index="${it.idx}" id="menu-link-${it.idx}">${it.title}</a>`)].join('');

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
