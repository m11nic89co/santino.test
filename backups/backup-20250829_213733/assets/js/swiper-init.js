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

    // --- Menu Generation ---
    const navLeft = document.querySelector('.main-nav-left');
    const navRight = document.querySelector('.main-nav-right');
    const mobileNav = document.querySelector('.mobile-nav');

    const menuItems = slideTitles.map((title, index) => {
        return `<a href="#" data-index="${index}" id="menu-link-${index}">${title}</a>`;
    }).join('');

    const midPoint = Math.ceil(slideTitles.length / 2);
    const leftItems = slideTitles.slice(0, midPoint).map((title, index) => {
        return `<a href="#" data-index="${index}" id="menu-link-${index}">${title}</a>`;
    }).join('');
    const rightItems = slideTitles.slice(midPoint).map((title, index) => {
        return `<a href="#" data-index="${midPoint + index}" id="menu-link-${midPoint + index}">${title}</a>`;
    }).join('');

    navLeft.innerHTML = leftItems;
    navRight.innerHTML = rightItems;
    mobileNav.innerHTML = menuItems;


    // Refresh selector after we injected nav HTML so we capture generated links
    let allNavLinks = document.querySelectorAll('.main-nav a, .mobile-nav a, .logo-link');
    const hamburger = document.getElementById('hamburger-menu');
    // const mobileNav = document.getElementById('mobile-nav'); // This was the duplicate declaration, now removed.

    function updateActiveLink(index) {
        allNavLinks.forEach(link => {
            link.classList.remove('active');
            link.removeAttribute('aria-current');
            if (parseInt(link.dataset.index) === index) {
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
            swiper.slideTo(slideIndex);
            if (mobileNav.classList.contains('is-open')) {
                mobileNav.classList.remove('is-open');
                hamburger.classList.remove('is-active');
            }
        });
    });

    function toggleMenu(open) {
        const willOpen = typeof open === 'boolean' ? open : !mobileNav.classList.contains('is-open');
        hamburger.classList.toggle('is-active', willOpen);
        mobileNav.classList.toggle('is-open', willOpen);
        hamburger.setAttribute('aria-expanded', String(willOpen));
        mobileNav.setAttribute('aria-hidden', String(!willOpen));
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

    // Initialize first slide and link
    updateActiveLink(swiper.activeIndex);
    const firstSlide = swiper.slides[swiper.activeIndex];
    if (firstSlide) {
        firstSlide.classList.add('slide-come-up');
    }

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
});