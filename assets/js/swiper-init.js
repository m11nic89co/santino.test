document.addEventListener('DOMContentLoaded', function () {
    const slides = document.querySelectorAll('.swiper-slide');
    const slideTitles = Array.from(slides).map(slide => slide.dataset.title || '');

    const swiper = new Swiper('.swiper', {
        direction: 'vertical',
        slidesPerView: 1,
        spaceBetween: 0,
        mousewheel: true,
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
        speed: 1200, // Slower speed for the new effect
        effect: 'slide',
        keyboard: {
            enabled: true,
        },
        on: {
            slideChangeTransitionStart: function () {
                const previousSlide = this.slides[this.previousIndex];
                const currentSlide = this.slides[this.activeIndex];

                if (previousSlide) {
                    previousSlide.classList.remove('slide-come-up');
                    previousSlide.classList.add('slide-fall-out');
                }
                if (currentSlide) {
                    currentSlide.classList.remove('slide-fall-out');
                    currentSlide.classList.add('slide-come-up');
                }
            },
        },
    });

    // --- Hero Parallax driver ---
    // Uses slide.progress to drive lightweight transforms on .hero-bg and .hero-parallax
    // Respects prefers-reduced-motion and runtime low-power flag on <body>
    const _prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

    // --- Menu Generation ---
    const navLeft = document.querySelector('.main-nav-left');
    const navRight = document.querySelector('.main-nav-right');
    const mobileNav = document.querySelector('.mobile-nav');
    const midPoint = Math.ceil(slideTitles.length / 2);
    const leftSlice = slideTitles.slice(0, midPoint);
    const rightSlice = slideTitles.slice(midPoint);
    // Keep indices aligned with slides; we'll override visible labels for specific items
    // Map to anchors but allow relabeling below
    const leftItems = leftSlice.map((title, index) => {
        if (!title) return '';
        return `<a href="#" data-index="${index}" id="menu-link-${index}">${title}</a>`;
    }).join('');
    const rightItems = rightSlice.map((title, index) => {
        if (!title) return '';
        const realIndex = midPoint + index;
        return `<a href="#" data-index="${realIndex}" id="menu-link-${realIndex}">${title}</a>`;
    }).join('');
    const menuItems = slideTitles.map((title, index) => {
        if (!title) return '';
        return `<a href="#" data-index="${index}" id="menu-link-${index}">${title}</a>`;
    }).join('');

    navLeft.innerHTML = leftItems;
    navRight.innerHTML = rightItems;
    mobileNav.innerHTML = menuItems;

    // Swap first two visible menu items between left and right navs (preserve data-index).
    // After swap, normalize the label 'КОНТРАКТНОЕ ПРОИЗВОДСТВО' -> 'ПОД ЗАКАЗ'.
    try {
        const rightAnchors = navRight.querySelectorAll('a');
        const leftAnchors = navLeft.querySelectorAll('a');
        // swap first items
        if (rightAnchors.length >= 1 && leftAnchors.length >= 1) {
            const tmp = rightAnchors[0].textContent;
            rightAnchors[0].textContent = leftAnchors[0].textContent;
            leftAnchors[0].textContent = tmp;
        }
        // swap second items
        if (rightAnchors.length >= 2 && leftAnchors.length >= 2) {
            const tmp2 = rightAnchors[1].textContent;
            rightAnchors[1].textContent = leftAnchors[1].textContent;
            leftAnchors[1].textContent = tmp2;
        }
        // replace long label with shorter requested label
        const allAnchors = [...navLeft.querySelectorAll('a'), ...navRight.querySelectorAll('a')];
        allAnchors.forEach(a => {
            if ((a.textContent || '').trim() === 'КОНТРАКТНОЕ ПРОИЗВОДСТВО') a.textContent = 'ПОД ЗАКАЗ';
        });
    } catch (e) { /* ignore if navs not present */ }

    // Mobile: set labels in the same order (left group then right group)
    try {
        const mlinks = mobileNav.querySelectorAll('a');
        const mobileLabels = ['О НАС', 'КОЛЛЕКЦИЯ', 'ПОД ЗАКАЗ', 'КОНТАКТЫ'];
        for (let i = 0; i < mlinks.length && i < mobileLabels.length; i++) {
            mlinks[i].textContent = mobileLabels[i];
        }
        // Fallback replacement for legacy text
        mlinks.forEach(a => {
            if ((a.textContent || '').trim() === 'КОНТРАКТНОЕ ПРОИЗВОДСТВО') a.textContent = 'ПОД ЗАКАЗ';
        });
    } catch (e) { /* ignore */ }


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
    const firstSlide = swiper.slides[swiper.activeIndex];
    if (firstSlide) {
        firstSlide.classList.add('slide-come-up');
    }

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
