document.addEventListener('DOMContentLoaded', function () {
    const slides = document.querySelectorAll('.swiper-slide');
    const slideTitles = Array.from(slides).map(slide => slide.dataset.title || '');

    const _prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
            thresholdDelta: 8,
            thresholdTime: 40,
            sensitivity: 0.7,
        },
    // Touch tuning for mobile
    touchAngle: 30,           // stricter vertical intent
    threshold: 8,             // px before we start swiping
    followFinger: true,
    simulateTouch: true,
    passiveListeners: true,
    touchStartPreventDefault: true,
    iOSEdgeSwipeDetection: true,
    iOSEdgeSwipeThreshold: 30,
        resistanceRatio: 0.86,
        longSwipesMs: 180,
        touchReleaseOnEdges: true,
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
        speed: _prefersReducedMotion ? 600 : 1000,
        effect: _prefersReducedMotion ? 'slide' : 'creative',
        grabCursor: true,
        creativeEffect: _prefersReducedMotion ? undefined : {
            limitProgress: 2,
            shadowPerProgress: true,
            prev: {
                // move previous slide up and tilt backward with depth
                translate: [0, '-110%', -200],
                rotate: [55, 0, 0],
                opacity: 0.4,
                shadow: true,
            },
            next: {
                // bring next slide from below with slight scale and depth
                translate: [0, '110%', -180],
                scale: 0.95,
                opacity: 1,
                shadow: true,
            },
        },
        keyboard: {
            enabled: true,
        },
    on: {},
    });

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

        swiper.slides.forEach(slide => {
            const p = slide.progress; // -1 .. 0 .. 1
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

    // --- Grid overlay only on the first (hero) slide ---
    function updateGridOverlay() {
        document.body.classList.toggle('grid-on', swiper.activeIndex === 0);
    }
    updateGridOverlay();
    swiper.on('slideChange', updateGridOverlay);

    // --- Italian-style reveal for the "Коллекция" section ---
    const collectionIdx = (() => {
        let idx = slideTitles.findIndex(t => (t || '').toLowerCase() === 'коллекция');
        if (idx < 0) idx = 2; // fallback to known index
        return idx;
    })();

    function playCollectionReveal() {
        const target = slides[collectionIdx];
        if (!target) return;
        // retrigger CSS animation by removing/forcing reflow/adding
        target.classList.remove('italian-reveal');
        // force reflow
        void target.offsetWidth;
        target.classList.add('italian-reveal');
    }
    // Play on initial load if we start at collection, and on entering it
    if (swiper.activeIndex === collectionIdx) playCollectionReveal();
    swiper.on('slideChangeTransitionStart', () => {
        if (swiper.activeIndex === collectionIdx) playCollectionReveal();
    });

    // --- Menu Generation ---
    const navLeft = document.querySelector('.main-nav-left');
    const navRight = document.querySelector('.main-nav-right');
    const mobileNav = document.querySelector('.mobile-nav');

    // Build items excluding the hero (index 0). Keep data-index values so logo (index 0) still goes to hero.
    const allItems = slideTitles.map((t, i) => ({ title: t, idx: i })).filter(it => !!it.title);
    const byIdx = Object.fromEntries(allItems.map(it => [it.idx, it]));

    // Explicit order requested after slide rearrangement: left => 1:'О НАС', 2:'КОЛЛЕКЦИЯ'; right => 3:'ПОД ЗАКАЗ', 4:'КОНТАКТЫ'
    const labelMap = { 1: 'О НАС', 2: 'КОЛЛЕКЦИЯ', 3: 'ПОД ЗАКАЗ', 4: 'КОНТАКТЫ' };
    const desiredOrder = [1, 2, 3, 4].filter(i => byIdx[i]);
    // Append any other indices (if exist) in natural order excluding duplicates and 0 (hero)
    const others = allItems
        .map(it => it.idx)
        .filter(i => i !== 0 && !desiredOrder.includes(i));
    const orderedIdx = [...desiredOrder, ...others];
    const contentItems = orderedIdx.map(i => ({ idx: i, title: labelMap[i] || (byIdx[i]?.title || '') }));

    // Split groups: first two left, rest right
    const leftGroup = contentItems.slice(0, 2);
    const rightGroup = contentItems.slice(2);

    const leftItemsHtml = leftGroup.map(it => `<a href="#" data-index="${it.idx}" id="menu-link-${it.idx}">${it.title}</a>`).join('');
    const rightItemsHtml = rightGroup.map(it => `<a href="#" data-index="${it.idx}" id="menu-link-${it.idx}">${it.title}</a>`).join('');
    // Mobile menu gets a leading 'ГЛАВНАЯ' pointing to slide 0
    const homeItemHtml = `<a href="#" data-index="0" id="menu-link-0">ГЛАВНАЯ</a>`;
    const mobileItemsHtml = [homeItemHtml, ...contentItems.map(it => `<a href="#" data-index="${it.idx}" id="menu-link-${it.idx}">${it.title}</a>`)].join('');

    navLeft.innerHTML = leftItemsHtml;
    navRight.innerHTML = rightItemsHtml;
    mobileNav.innerHTML = mobileItemsHtml;

    // Labels already set above; no DOM swapping or relabeling needed here.


    // Refresh selector after we injected nav HTML so we capture generated links
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

    allNavLinks.forEach(link => {
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
    });

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
    window.addEventListener('resize', () => {
        if (_mmRaf) cancelAnimationFrame(_mmRaf);
        _mmRaf = requestAnimationFrame(updateMenuDimensionLabels);
    });
    // recompute when opening the mobile menu (links become centered and wider)
    mobileNav.addEventListener('transitionend', (e) => {
        const prop = e.propertyName;
        if ((prop === 'opacity' || prop === 'transform') && mobileNav.classList.contains('is-open')) {
            requestAnimationFrame(updateMenuDimensionLabels);
        }
    });
});
