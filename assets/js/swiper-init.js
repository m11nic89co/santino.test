document.addEventListener('DOMContentLoaded', function () {
    const slides = document.querySelectorAll('.swiper-slide');
    const slideTitles = Array.from(slides).map(slide => slide.dataset.title || '');

    const _prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const _isCoarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const _isSmallViewport = window.innerWidth <= 920 || window.innerHeight <= 820;
    const _isMobileTouch = _isCoarsePointer || _isSmallViewport;

    // Simplified: force plain vertical slide effect (no fancy creative/fade modes)
    const selectedEffect = 'slide';
    // Instant switching requested: 0ms transition for a sheet-like flip
    const INSTANT_SWITCH = true;
    // If not instant, we would use: (_prefersReducedMotion ? 420 : (_isMobileTouch ? 420 : 600))
    const speedMs = INSTANT_SWITCH ? 0 : (_prefersReducedMotion ? 420 : (_isMobileTouch ? 420 : 600));

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
    touchAngle: 55,           // more generous angle so gesture begins immediately
    threshold: 2,             // almost no distance needed
    followFinger: true,
    simulateTouch: true,
    passiveListeners: true,   // keep listeners passive to avoid main-thread jank
    touchStartPreventDefault: false, // don't call preventDefault on passive listeners
    iOSEdgeSwipeDetection: true,
    iOSEdgeSwipeThreshold: 30,
    resistanceRatio: 0.3,  // very low resistance for effortless drag
    longSwipesMs: 120,     // shorter window keeps gesture feeling snappy
    longSwipesRatio: 0.15, // even smaller travel to finalize long swipe
        shortSwipes: true,
        touchReleaseOnEdges: true,
        preventInteractionOnTransition: false, // allow rapid consecutive swipes
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

    // --- Momentum Flick (custom) ---
    // When instant mode is active, emulate momentum: fast short flicks can skip 2+ slides.
    if (INSTANT_SWITCH) {
        let touchStartY = 0;
        let touchStartT = 0;
        const MIN_FLICK_TIME = 260; // ms
        const MIN_FLICK_DIST = 28;  // px
        const EXTRA_SKIP_VELOCITY = 0.45; // px/ms threshold for multi-skip

        const surface = swiper.el;
        surface.addEventListener('touchstart', (e) => {
            if (!e.touches || !e.touches[0]) return;
            touchStartY = e.touches[0].clientY;
            touchStartT = performance.now();
        }, { passive: true });

        surface.addEventListener('touchend', (e) => {
            const dt = performance.now() - touchStartT;
            if (dt > MIN_FLICK_TIME) return; // not a quick flick
            // Use changedTouches if available
            const touch = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
            if (!touch) return;
            const dy = touch.clientY - touchStartY; // positive = swipe down
            const ady = Math.abs(dy);
            if (ady < MIN_FLICK_DIST) return;
            const velocity = ady / dt; // px per ms
            let skip = 1;
            if (velocity > EXTRA_SKIP_VELOCITY) {
                // scale skip by velocity (cap at 3 for sanity)
                skip = Math.min(3, 1 + Math.floor((velocity - EXTRA_SKIP_VELOCITY) * 3));
            }
            const dir = dy > 0 ? -1 : 1; // swipe down -> previous (index -1)
            let target = swiper.activeIndex + dir * skip;
            if (target < 0) target = 0;
            if (target > swiper.slides.length - 1) target = swiper.slides.length - 1;
            if (target !== swiper.activeIndex) {
                swiper.slideTo(target, 0); // immediate
            }
        }, { passive: true });
    }

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

    // --- Section Subtitle Dock (under logo for non-hero sections) ---
    const subtitleDock = document.getElementById('section-subtitle');
    const subtitleMap = slideTitles.map(t => (t || '').trim());
    function updateSectionSubtitle() {
        if (!subtitleDock) return;
        const idx = swiper.activeIndex;
        if (idx === 0) {
            subtitleDock.classList.remove('section-subtitle-visible');
            subtitleDock.textContent = '';
            return;
        }
    const raw = subtitleMap[idx] || '';
    // Preserve original casing for mobile (match hero-desc style)
    subtitleDock.textContent = raw;
        // small reflow to restart transition if needed
        subtitleDock.classList.add('section-subtitle-visible');
    }
    updateSectionSubtitle();
    swiper.on('slideChange', updateSectionSubtitle);

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
    // Mobile HOME item
    const homeItemHtml   = `<a href="#" data-index="0" id="menu-link-0">ГЛАВНАЯ</a>`;
    // Social icons + email (single definition)
    const mobileSocialHtml = `\n<div class="mobile-social" role="group" aria-label="Социальные сети">`
        + `<a class=\"social-link social-phone\" aria-label=\"Позвонить\" href=\"tel:+79001234567\">`
        + `<svg viewBox=\"0 0 24 24\" width=\"26\" height=\"26\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l1.47-1.47a1.02 1.02 0 0 1 1.01-.26c1.12.37 2.33.57 3.58.57.56 0 1 .44 1 .99v2.97c0 .55-.44.99-1 .99C10.85 21.17 2.83 13.15 2.83 3.99c0-.55.44-.99.99-.99H6.8c.55 0 .99.44.99 1 0 1.25.2 2.46.57 3.58.11.33.03.7-.26 1l-1.47 1.47Z\"/></svg>`
        + `</a>`
    + `<a class=\"social-link social-email\" aria-label=\"Email\" href=\"mailto:info@santino.com.ru\">`
    + `<svg viewBox=\"0 0 24 24\" width=\"30\" height=\"24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M2 6.5C2 5.12 3.12 4 4.5 4h15A2.5 2.5 0 0 1 22 6.5v11A2.5 2.5 0 0 1 19.5 20h-15A2.5 2.5 0 0 1 2 17.5v-11Zm2.5-.5a.5.5 0 0 0-.5.5v.26l7.5 5 7.5-5V6.5a.5.5 0 0 0-.5-.5h-14Zm14.5 3.74-6.9 4.6a.75.75 0 0 1-.82 0L4 9.74V17.5c0 .28.22.5.5.5h15a.5.5 0 0 0 .5-.5V9.74Z\"/></svg>`
        + `</a>`
        + `<a class=\"social-link social-wa\" aria-label=\"WhatsApp\" href=\"https://wa.me/79001234567\" target=\"_blank\" rel=\"noopener\">`
        + `<svg viewBox=\"0 0 24 24\" width=\"26\" height=\"26\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M20.52 3.48A11.87 11.87 0 0 0 12.04 0C5.46.03.2 5.3.22 11.88c0 2.09.55 4.14 1.6 5.94L0 24l6.4-1.67a11.86 11.86 0 0 0 5.65 1.44h.01c6.58 0 11.85-5.27 11.87-11.75A11.73 11.73 0 0 0 20.52 3.48Zm-8.48 17.3h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.8.99 1.02-3.7-.24-.38a9.8 9.8 0 0 1-1.5-5.17C2.07 6.42 6.46 2.1 12.02 2.1c2.6 0 5.03 1 6.86 2.82A9.62 9.62 0 0 1 21.9 12c-.02 5.55-4.4 8.78-9.86 8.78Zm5.4-7.33c-.29-.15-1.7-.84-1.96-.94-.26-.1-.45-.15-.64.15-.19.29-.74.94-.9 1.13-.17.19-.33.21-.62.06-.29-.15-1.23-.45-2.34-1.43-.86-.76-1.44-1.7-1.61-1.99-.17-.29-.02-.45.13-.6.13-.13.29-.33.43-.5.15-.17.19-.29.29-.48.1-.19.05-.36-.03-.51-.08-.15-.64-1.54-.88-2.1-.23-.55-.47-.48-.64-.49-.17-.01-.36-.01-.55-.01-.19 0-.5.07-.76.36-.26.29-1 1-1 2.44 0 1.44 1.03 2.84 1.17 3.04.15.19 2.03 3.1 4.92 4.35.69.3 1.23.48 1.65.61.69.22 1.32.19 1.82.12.55-.08 1.7-.7 1.94-1.39.24-.68.24-1.26.17-1.39-.07-.13-.26-.21-.55-.36Z\"/></svg>`
    + `</a>\n</div>`;
    // Final mobile menu HTML sequence
    const mobileItemsHtml = homeItemHtml + allItemsHtml + mobileSocialHtml;

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
