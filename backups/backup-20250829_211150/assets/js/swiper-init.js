document.addEventListener('DOMContentLoaded', function () {
    const slides = document.querySelectorAll('.swiper-slide');
    const slideTitles = Array.from(slides).map(slide => slide.dataset.title || '');

    const swiper = new Swiper('.swiper', {
        direction: 'vertical',
        slidesPerView: 1,
        spaceBetween: 0,
        mousewheel: true,
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
            renderBullet: function (index, className) {
                const title = slideTitles[index];
                return `<span class="${className}" data-tooltip="${title}"></span>`;
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
        return `<a href="#" data-index="${index}">${title}</a>`;
    }).join('');

    const midPoint = Math.ceil(slideTitles.length / 2);
    const leftItems = slideTitles.slice(0, midPoint).map((title, index) => {
        return `<a href="#" data-index="${index}">${title}</a>`;
    }).join('');
    const rightItems = slideTitles.slice(midPoint).map((title, index) => {
        return `<a href="#" data-index="${midPoint + index}">${title}</a>`;
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
            if (parseInt(link.dataset.index) === index) {
                link.classList.add('active');
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

    hamburger.addEventListener('click', function() {
        this.classList.toggle('is-active');
        mobileNav.classList.toggle('is-open');
    });

    // Initialize first slide and link
    updateActiveLink(swiper.activeIndex);
    const firstSlide = swiper.slides[swiper.activeIndex];
    if (firstSlide) {
        firstSlide.classList.add('slide-come-up');
    }
});