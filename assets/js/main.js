// Плавная загрузка, затем эффект вспышки и плавное появление логотипа и сайта
// Helper: detect low-power mode (set by assets/js/performance.js)
function isLowPower() {
	try { return document.body.classList.contains('is-low-power'); } catch (_) { return false; }
}
		window.addEventListener('DOMContentLoaded', () => {
			const loaderBg = document.getElementById('loader-bg');
			const mainLogo = document.getElementById('main-logo');
			const body = document.body;
			const main = document.querySelector('main');
			const loaderBar = document.getElementById('loader-bar');
			const heroSection = document.querySelector('.hero-section');
			const loaderLogo = document.querySelector('.loader-logo');
			const paparazziFlash = document.getElementById('paparazzi-flash');
			const afterflash = document.getElementById('afterflash');
			const header = document.querySelector('header');

			// --- Плавное появление логотипа (3 секунды, быстрее) ---
			loaderLogo.style.opacity = '0';
			loaderLogo.style.filter = 'brightness(0.5)';
			loaderLogo.style.transform = 'scale(0.90)';
			loaderLogo.style.transition = 'opacity 3s cubic-bezier(.77,0,.18,1), filter 3s cubic-bezier(.77,0,.18,1), transform 2s cubic-bezier(.77,0,.18,1)';
			setTimeout(() => {
				loaderLogo.style.opacity = '1';
				loaderLogo.style.filter = 'brightness(1)';
				loaderLogo.style.transform = 'scale(1)';
			}, 100);

			// --- Быстрая загрузка полоски (1 секунда, параллельно логотипу) ---
			let progress = 0;
			const duration = 1000;
			const start = performance.now();

			function animateBar(now) {
				const elapsed = now - start;
				progress = Math.min(elapsed / duration, 1);
				loaderBar.style.width = (progress * 100) + '%';
				if (progress < 1) {
					requestAnimationFrame(animateBar);
				} else {
					loaderBar.style.width = '100%';
				}
			}
			requestAnimationFrame(animateBar);

			// После загрузки полоски — НЕ скрываем лоадер сразу, а ждём полного появления логотипа (3 секунды)
			setTimeout(() => {
				loaderLogo.style.transition = 'opacity 1s cubic-bezier(.77,0,.18,1)';
				loaderLogo.style.opacity = '0';
				loaderBg.classList.add('hide');

				setTimeout(() => {
					main.style.transition = 'opacity 1s cubic-bezier(.77,0,.18,1), transform 1s cubic-bezier(.77,0,.18,1)';
					main.style.opacity = '0';
					main.style.transform = 'translateY(40px)';
					mainLogo.style.transition = 'opacity 1s cubic-bezier(.77,0,.18,1), transform 1s cubic-bezier(.77,0,.18,1)';
					mainLogo.style.opacity = '0';
					mainLogo.style.transform = 'translateY(40vh) scale(1.5)';

					// Серия молний: меньше на слабых устройствах
					let total = 0;
					const flashes = [];
					const flashCount = isLowPower() ? 2 : 4;
					for (let i = 0; i < flashCount; i++) {
						let pause = i < 3 ? Math.floor(Math.random() * 110) + 40 : 0; // 40-150мс между вспышками
						flashes.push(total);
						total += pause;
					}
					const maxCycle = 700;
					if (total > maxCycle) {
						const scale = maxCycle / total;
						for (let i = 1; i < flashes.length; i++) {
							flashes[i] = Math.floor(flashes[i] * scale);
						}
					}

					// Исправляем длительность молнии: делаем каждую вспышку ~350мс для реалистичности
					flashes.forEach((delay, idx) => {
						setTimeout(() => {
							paparazziFlash.classList.add('lightning-series');
							paparazziFlash.style.display = 'block';
							paparazziFlash.style.filter = isLowPower() ? 'blur(4px) brightness(2.2)' : 'blur(6px) brightness(3.2)';
							setTimeout(() => {
								paparazziFlash.classList.remove('lightning-series');
								paparazziFlash.style.display = 'none';
								paparazziFlash.style.filter = isLowPower() ? 'blur(6px) brightness(1.6)' : 'blur(8px) brightness(2.2)';
							}, 350);
						}, delay);
					});

					// После последней молнии показываем логотип и сайт
					setTimeout(() => {
						mainLogo.classList.add('logo-animate-in');
						mainLogo.style.opacity = '';
						mainLogo.style.transform = '';

						// После появления логотипа и сайта — поочерёдное появление каждого слова заголовка
						setTimeout(() => {
							window.scrollTo(0, 0);
							if (window.innerWidth > 900) {
								document.body.style.overflow = 'hidden';
							}

							// sync CSS var for header height to exact logo box height
							requestAnimationFrame(() => {
								if (header) {
									const h = Math.round(header.getBoundingClientRect().height);
									document.documentElement.style.setProperty('--header-h', h + 'px');
								}
							});

							setTimeout(() => {
								window.scrollTo(0, 0);
								document.body.style.overflow = '';
								body.classList.remove('site-hidden');
								main.style.opacity = '';
								main.style.transform = '';
								main.classList.add('site-visible');
								heroSection.classList.add('fog-in');
								// Mark intro done so FAB dim can start reacting after first render
								document.body.classList.add('fab-intro-done');

							const heroTitle = document.querySelector('.hero-title');
							const heroDesc = document.querySelector('.hero-desc');
							const heroBtn = document.querySelector('.btn');
							const trustLine = document.querySelector('.hero-subtle');

								// --- Разбиваем только вторую часть заголовка на слова и оборачиваем в span ---
								const mainSpan = heroTitle.querySelector('.hero-title-main');
								const restSpan = heroTitle.querySelector('.hero-title-rest');
								const words = restSpan.textContent.trim().split(' ');
								restSpan.innerHTML = words.map(word => `<span class="word" style="opacity:0;display:inline-block;transform:translateY(40px);transition:none;">${word}</span>`).join(' ');

								const wordSpans = restSpan.querySelectorAll('.word');

								// Скрываем описание и кнопку
								heroDesc.style.transition = 'none';
								heroBtn.style.transition = 'none';
								heroDesc.style.opacity = '0';
								heroDesc.style.transform = 'translateY(40px)';
								heroBtn.style.opacity = '0';
								heroBtn.style.transform = 'none'; // keep flow, avoid shift

								// Поочерёдное появление каждого слова + вспышка "shine" по слову
								wordSpans.forEach((span, i) => {
									setTimeout(() => {
										span.style.transition = 'opacity 0.7s cubic-bezier(.77,0,.18,1), transform 0.7s cubic-bezier(.77,0,.18,1)';
										span.style.opacity = '1';
										span.style.transform = 'none';
										// запустить короткий блик после появления
										span.classList.add('word-shine');
										setTimeout(() => span.classList.remove('word-shine'), 1000);
									}, 200 + i * 500);
								});

								// После последнего слова — появление описания
								setTimeout(() => {
									heroDesc.style.transition = 'opacity 1s cubic-bezier(.77,0,.18,1), transform 1s cubic-bezier(.77,0,.18, 1)';
									heroDesc.style.opacity = '1';
									heroDesc.style.transform = 'none';
								}, 200 + words.length * 500 + 400);

								// Одновременно с описанием — появление кнопки, чтобы текст не подпрыгивал
								setTimeout(() => {
									heroBtn.style.transition = 'opacity 0.9s cubic-bezier(.77,0,.18,1)';
									heroBtn.style.opacity = '1';
									// After button visible, compute mid position for hamburger
									requestAnimationFrame(() => {
										try {
											const btnRect = heroBtn.getBoundingClientRect();
											const trustRect = trustLine ? trustLine.getBoundingClientRect() : { top: window.innerHeight * 0.78 };
											const mid = Math.round((btnRect.bottom + trustRect.top) / 2);
											document.documentElement.style.setProperty('--cta-bottom', btnRect.bottom + 'px');
											document.documentElement.style.setProperty('--trust-top', trustRect.top + 'px');
											// Also adjust on resize/orientation
											function updateBurgerVars(){
												const b = heroBtn.getBoundingClientRect();
												const t = trustLine ? trustLine.getBoundingClientRect() : { top: window.innerHeight * 0.78 };
												document.documentElement.style.setProperty('--cta-bottom', b.bottom + 'px');
												document.documentElement.style.setProperty('--trust-top', t.top + 'px');
											}
											window.addEventListener('resize', () => requestAnimationFrame(updateBurgerVars), { passive: true });
											window.addEventListener('orientationchange', () => setTimeout(() => requestAnimationFrame(updateBurgerVars), 50), { passive: true });
										} catch(_) { }
									});
								}, 200 + words.length * 500 + 400);

								// Старт синего чертежного цикла сразу после вспышки
								try {
									const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
									if (!reduced) startBlueprintCycle();
								} catch (_) { }

								// Ensure hero button cycle starts when hero is visible and not in low-power/reduced-motion
								try {
									const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
									const isHero = 0 === 0; // always true here, but keep explicit for readability
									if (isHero && !reduced && !isLowPower() && typeof startBtnCycle === 'function') {
										startBtnCycle();
									}
								} catch (_) { }

								// Mobile mode auto-toggle and reveal the mm grid subtly
								try {
									function applyMobileMode() {
										const shouldMobile = window.innerWidth <= 900;
										document.body.classList.toggle('mobile-mode', shouldMobile);
									}
									applyMobileMode();
									window.addEventListener('resize', () => {
										if (window.__mm_resize_raf) cancelAnimationFrame(window.__mm_resize_raf);
										window.__mm_resize_raf = requestAnimationFrame(applyMobileMode);
									}, { passive: true });
								} catch(_) { }

								setTimeout(() => document.body.classList.add('grid-on'), 250);
							}, 500);
						}, 700);
					}, 900);
				}, 900);
			}, 3000 + 100);
		});

// Dim FAB on scroll, then restore
(function setupScrollDim() {
	try {
		let scrollTimer = null;
		const onScroll = () => {
			// Ignore during intro, and do not re-dim after FAB was used
			if (!document.body.classList.contains('fab-intro-done')) return;
			if (document.body.classList.contains('fab-used')) return;
			document.body.classList.add('is-scrolling');
			document.body.classList.add('fab-dimmed');
			if (scrollTimer) clearTimeout(scrollTimer);
			scrollTimer = setTimeout(() => document.body.classList.remove('is-scrolling'), 180);
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('wheel', onScroll, { passive: true });
		// Fallback for older touch devices where pointer events may be off
		window.addEventListener('touchmove', () => {
			if (!document.body.classList.contains('fab-intro-done')) return;
			if (document.body.classList.contains('fab-used')) return;
			document.body.classList.add('is-swiping');
			document.body.classList.add('fab-dimmed');
			if (scrollTimer) clearTimeout(scrollTimer);
			scrollTimer = setTimeout(() => document.body.classList.remove('is-swiping'), 180);
		}, { passive: true });
	} catch(_) {}
})();

// Dim and drop FAB on swipe gestures (touch move)
// Minimal swipe detector to apply half-opacity during touch move
(function setupSwipeFlag() {
	try {
		let timer = null;
		let down = false;
		const arm = () => {
			if (timer) clearTimeout(timer);
			timer = setTimeout(() => document.body.classList.remove('is-swiping'), 180);
		};
		window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') down = true; }, { passive: true });
		window.addEventListener('pointermove', (e) => {
			if (e.pointerType !== 'touch' || !down) return;
			if (!document.body.classList.contains('fab-intro-done')) return;
			if (document.body.classList.contains('fab-used')) return;
			document.body.classList.add('is-swiping');
			document.body.classList.add('fab-dimmed');
			arm();
		}, { passive: true });
		window.addEventListener('pointerup', () => { down = false; arm(); }, { passive: true });
		window.addEventListener('pointercancel', () => { down = false; arm(); }, { passive: true });
	} catch(_) {}
})();

// Clear persistent dim when FAB is clicked/tapped
(function setupFabUndimOnClick() {
	try {
		const fab = document.querySelector('.hamburger-menu');
		if (!fab) return;
		const markUsed = () => document.body.classList.add('fab-used');
		const undim = () => { document.body.classList.remove('fab-dimmed'); markUsed(); };
		fab.addEventListener('click', undim);
		fab.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch') undim(); }, { passive: true });
		fab.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') undim(); });
	} catch(_) {}
})();

// Idle dim: if FAB не использовали некоторое время после загрузки, приглушаем
(function setupFabIdleDim() {
	try {
		const fab = document.querySelector('.hamburger-menu'); if (!fab) return;
		const IDLE_MS = 6000; // 6s после загрузки
		const timer = setTimeout(() => {
			// Only after intro and only if FAB was not used
			if (document.body.classList.contains('fab-intro-done') && !document.body.classList.contains('fab-used')) {
				document.body.classList.add('fab-dimmed');
			}
		}, IDLE_MS);
		// На первое взаимодействие помечаем как использованную
		const markUsedOnce = () => {
			document.body.classList.add('fab-used');
			fab.removeEventListener('click', markUsedOnce);
			fab.removeEventListener('pointerdown', markUsedOnce);
			fab.removeEventListener('keydown', keyMark);
		};
		const keyMark = (e) => { if (e.key === 'Enter' || e.key === ' ') markUsedOnce(); };
		fab.addEventListener('click', markUsedOnce, { once: true });
		fab.addEventListener('pointerdown', markUsedOnce, { once: true, passive: true });
		fab.addEventListener('keydown', keyMark);
	} catch(_) {}
})();

// Prevent double-tap zoom on mobile (keeps pinch-zoom). Skips inputs/textarea/select/contenteditable
(function preventDoubleTapZoom() {
	try {
		let last = 0;
		const isEditable = (el) => !!(el && (el.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]')));
		document.addEventListener('touchend', (e) => {
			// ignore multi-touch gestures (pinch)
			if (e.touches && e.touches.length > 0) return;
			const t = Date.now();
			const target = e.target;
			if (isEditable(target)) return;
			if (t - last <= 300) {
				e.preventDefault();
			}
			last = t;
		}, { passive: false });
		// Some browsers still trigger dblclick leading to zoom
		document.addEventListener('dblclick', (e) => {
			if (isEditable(e.target)) return;
			e.preventDefault();
		}, { passive: false });
	} catch(_) {}
})();

		const buttonTexts = [
			'Получить персональную цену',
			'Посмотреть каталог 2025',
			'Запросить спецпредложение',
			'Получить VIP-прайс',
			'Получить прайс-лист'
		];
		const heroBtn = document.querySelector('.btn');
		let btnIndex = 0;
		let btnCycleActive = false;
		const prefersReduced = (() => {
			try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(_) { return false; }
		})();
		let heroBtnIntervalId = null;

		function lampFlickerChange() {
			const btn = document.querySelector('.btn');
			if (!btn) return;
			if (btnCycleActive) return;
			btnCycleActive = true;

			const flickerDuration = 700;
			const gapDuration = 2000;
			const neonDuration = 1500;

			// 1. Перегорание (исчезновение)
			btn.classList.add('flicker');
			btn.classList.remove('neon');

			setTimeout(() => {
				// 2. Кнопка полностью исчезла, делаем разрыв (gap)
				btn.classList.remove('flicker');
				btn.style.visibility = 'hidden';

				// Искры сварки во время gap
				try {
					const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
					if (!reduced && !isLowPower()) {
						// slower, longer sparks during the gap
						spawnSparks(btn, { duration: gapDuration + 600, bursts: 2 });
					}
				} catch (_) { }

				// 3. После разрыва — меняем текст и показываем неоновую кнопку
				setTimeout(() => {
					btnIndex = (btnIndex + 1) % buttonTexts.length;
					btn.textContent = buttonTexts[btnIndex];
					btn.style.visibility = 'visible';
					btn.classList.add('neon');
					setTimeout(() => {
						// fix: remove 'neon' in latin, not Cyrillic
						btn.classList.remove('neon');
						btnCycleActive = false;
					}, neonDuration);
				}, gapDuration);
			}, flickerDuration);
		}

		function startBtnCycle() {
			if (heroBtnIntervalId) return;
			heroBtnIntervalId = setInterval(lampFlickerChange, 700 + 2000 + 1500); // полный цикл
		}
		function stopBtnCycle() {
			if (heroBtnIntervalId) {
				clearInterval(heroBtnIntervalId);
				heroBtnIntervalId = null;
			}
		}
		if (heroBtn && !prefersReduced) {
			setTimeout(() => { if (!isLowPower()) startBtnCycle(); }, 2000);
		}

		// Удалены дополнительные секции и связанные 3D-переходы

		/* Set a reliable --vh variable for mobile browsers that shrink visual viewport when UI chrome shows.
		   Uses window.innerHeight and updates on resize/orientationchange. This helps elements sized to 100vh
		   to actually fit inside the visible area so images and the ticker aren't hidden behind mobile bars. */

		(function setVhCssVar() {
			function updateVh() {
				// Prefer visualViewport height when available (iOS Safari, Android Chrome)
				const vv = window.visualViewport;
				const h = vv && vv.height ? vv.height : window.innerHeight;
				const vh = h * 0.01;
				document.documentElement.style.setProperty('--vh', vh + 'px');
			}

			updateVh();
			window.addEventListener('resize', updateVh, { passive: true });
			window.addEventListener('orientationchange', updateVh, { passive: true });
			// Also update after a short delay to catch browser UI transitions
			window.addEventListener('focus', () => setTimeout(updateVh, 150), { passive: true });
			// Extra: update bottom padding for ticker visibility on mobile
			function updateMobileTickerPadding() {
				if (!document.body.classList.contains('mobile-mode')) return;
				const vv = window.visualViewport;
				const safeInset = (() => {
					// Try CSS env first (iOS notch), fallback 0
					try {
						const v = getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)');
						return parseFloat(v) || 0;
					} catch(_) { return 0; }
				})();
				// Base space for ticker height (~2.2em ≈ 36px) + small buffer
				const tickerH = 36; // px
				const buffer = 6;   // px
				const bottomPad = tickerH + safeInset + buffer;
				document.body.style.paddingBottom = bottomPad + 'px';
				const ticker = document.querySelector('.ticker-wrap');
				if (ticker) ticker.style.bottom = safeInset + 'px';
			}
			updateMobileTickerPadding();
			window.addEventListener('resize', updateMobileTickerPadding, { passive: true });
			window.addEventListener('orientationchange', updateMobileTickerPadding, { passive: true });
			window.addEventListener('focus', () => setTimeout(updateMobileTickerPadding, 150), { passive: true });
		})();

		// ---- Sparks: simple particle system for welding effect ----
		function spawnSparks(anchorEl, opts = {}) {
			const { duration = 2000, bursts = 2 } = opts; // longer overall
			const overlay = getSparksOverlay();
			const rect = anchorEl.getBoundingClientRect();
			const originX = rect.left + rect.width / 2;
			const originY = rect.top + rect.height / 2;

			// Plan 2–3 bursts within duration
			const burstCount = Math.max(1, bursts);
			const step = duration / (burstCount + 1);
			for (let b = 0; b < burstCount; b++) {
				const delay = Math.floor(step * (b + 1) * 0.8 + Math.random() * step * 0.4);
				setTimeout(() => emitBurst(overlay, originX, originY), delay);
			}
			// Safety cleanup (overlay persists, particles self-remove)
		}

		function emitBurst(overlay, x, y) {
			const count = 6 + Math.floor(Math.random() * 5); // fewer per burst for calmer look
			for (let i = 0; i < count; i++) {
				// Random direction in full 360° each time
				const angle = Math.random() * Math.PI * 2; // 0..2π
				const speed = 90 + Math.random() * 90; // slower
				const life = 900 + Math.random() * 700; // longer
				const gravity = 360; // gentler fall
				const spin = (Math.random() * 50 - 25); // slower spin
				const shrink = 0.6 + Math.random() * 0.4;
				const spark = document.createElement('div');
				spark.className = 'spark';
				// randomize size/tint a bit
				const h = 8 + Math.floor(Math.random() * 10);
				spark.style.height = h + 'px';
				if (Math.random() < 0.2) {
					// alternate cool tint
					spark.style.background = 'linear-gradient(to bottom, #ffffff 0%, #a0e9ff 45%, #00d5ff 100%)';
				}
				spark.style.left = (x - 1) + 'px';
				spark.style.top = (y - 1) + 'px';
				overlay.appendChild(spark);

				const start = performance.now();
				const vx = Math.cos(angle) * speed; // px/s
				let vy = Math.sin(angle) * speed;    // px/s
				const rot0 = Math.random() * 360;
				const update = (now) => {
					const t = Math.min(1, (now - start) / life); // 0..1
					// time in seconds
					const ts = t * (life / 1000);
					// gravity integration
					const yOffset = vy * ts + 0.5 * gravity * ts * ts; // px
					const xOffset = vx * ts; // px
					const rot = rot0 + spin * ts;
					const scaleY = 1 - t * shrink;
					const opacity = 1 - t;
					spark.style.transform = `translate(${xOffset}px, ${yOffset}px) rotate(${rot}deg) scaleY(${Math.max(0.2, scaleY)})`;
					spark.style.opacity = opacity.toFixed(3);
					if (t < 1) {
						requestAnimationFrame(update);
					} else {
						spark.remove();
					}
				};
				requestAnimationFrame(update);
			}
		}

		let _sparksOverlay;
		function getSparksOverlay() {
			if (_sparksOverlay && document.body.contains(_sparksOverlay)) return _sparksOverlay;
			const el = document.createElement('div');
			el.className = 'sparks-overlay';
			// ensure overlay is above the main 3d and hero layers
			el.style.zIndex = 10000;
			document.body.appendChild(el);
			_sparksOverlay = el;
			return el;
		}

		// Fire sparks on CTA click as well
		if (heroBtn) {
			heroBtn.addEventListener('click', () => {
				try {
					const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
					if (!reduced && !isLowPower()) {
						spawnSparks(heroBtn, { duration: 1400, bursts: 2 });
					}
				} catch (_) { }
			});
		}

		// ----- Blueprints overlay: slow appearing/disappearing schematic drawings -----
		let _blueprintsOverlay;
		function getBlueprintsOverlay() {
			if (_blueprintsOverlay && document.body.contains(_blueprintsOverlay)) return _blueprintsOverlay;
			const el = document.createElement('div');
			el.className = 'blueprints-overlay';
			const heroSection = document.querySelector('.hero-section');
			if (heroSection) {
				heroSection.appendChild(el);
			} else {
				document.body.appendChild(el);
			}
			_blueprintsOverlay = el;
			return el;
		}

		function svgPot() {
			const ns = 'http://www.w3.org/2000/svg';
			const svg = document.createElementNS(ns, 'svg');
			svg.setAttribute('viewBox', '0 0 240 240');
			// rim
			const rim = document.createElementNS(ns, 'rect');
			rim.setAttribute('x', '40'); rim.setAttribute('y', '40'); rim.setAttribute('width', '160'); rim.setAttribute('height', '16'); rim.setAttribute('class', 'major');
			svg.appendChild(rim);
			// body
			const body = document.createElementNS(ns, 'path');
			body.setAttribute('d', 'M60 56 L180 56 L156 200 L84 200 Z');
			svg.appendChild(body);
			// inner guides
			const g1 = document.createElementNS(ns, 'line'); g1.setAttribute('x1', '84'); g1.setAttribute('y1', '200'); g1.setAttribute('x2', '96'); g1.setAttribute('y2', '56'); svg.appendChild(g1);
			const g2 = document.createElementNS(ns, 'line'); g2.setAttribute('x1', '156'); g2.setAttribute('y1', '200'); g2.setAttribute('x2', '144'); g2.setAttribute('y2', '56'); svg.appendChild(g2);
			const ellipse = document.createElementNS(ns, 'ellipse'); ellipse.setAttribute('cx', '120'); ellipse.setAttribute('cy', '56'); ellipse.setAttribute('rx', '60'); ellipse.setAttribute('ry', '10'); svg.appendChild(ellipse);
			return svg;
		}

		function svgCrate() {
			const ns = 'http://www.w3.org/2000/svg';
			const svg = document.createElementNS(ns, 'svg');
			svg.setAttribute('viewBox', '0 0 260 180');
			const outer = document.createElementNS(ns, 'rect');
			outer.setAttribute('x', '20'); outer.setAttribute('y', '20'); outer.setAttribute('width', '220'); outer.setAttribute('height', '140'); outer.setAttribute('class', 'major');
			svg.appendChild(outer);
			// grid inside
			for (let x = 40; x <= 220; x += 30) {
				const l = document.createElementNS(ns, 'line'); l.setAttribute('x1', x); l.setAttribute('y1', '20'); l.setAttribute('x2', x); l.setAttribute('y2', '160'); svg.appendChild(l);
			}
			for (let y = 40; y <= 160; y += 24) {
				const l = document.createElementNS(ns, 'line'); l.setAttribute('x1', '20'); l.setAttribute('y1', y); l.setAttribute('x2', '240'); l.setAttribute('y2', y); svg.appendChild(l);
			}
			// handles
			const h1 = document.createElementNS(ns, 'rect'); h1.setAttribute('x', '36'); h1.setAttribute('y', '80'); h1.setAttribute('width', '28'); h1.setAttribute('height', '16'); svg.appendChild(h1);
			const h2 = document.createElementNS(ns, 'rect'); h2.setAttribute('x', '196'); h2.setAttribute('y', '80'); h2.setAttribute('width', '28'); h2.setAttribute('height', '16'); svg.appendChild(h2);
			return svg;
		}

		function svgBox() {
			const ns = 'http://www.w3.org/2000/svg';
			const svg = document.createElementNS(ns, 'svg');
			svg.setAttribute('viewBox', '0 0 260 200');
			// outer box
			const outer = document.createElementNS(ns, 'rect'); outer.setAttribute('x', '40'); outer.setAttribute('y', '40'); outer.setAttribute('width', '180'); outer.setAttribute('height', '120'); outer.setAttribute('class', 'major'); svg.appendChild(outer);
			// lid
			const lid = document.createElementNS(ns, 'rect'); lid.setAttribute('x', '40'); lid.setAttribute('y', '32'); lid.setAttribute('width', '180'); lid.setAttribute('height', '8'); svg.appendChild(lid);
			// ribs
			for (let x = 64; x <= 200; x += 24) {
				const l = document.createElementNS(ns, 'line'); l.setAttribute('x1', x); l.setAttribute('y1', '40'); l.setAttribute('x2', x); l.setAttribute('y2', '160'); svg.appendChild(l);
			}
			for (let y = 64; y <= 160; y += 24) {
				const l = document.createElementNS(ns, 'line'); l.setAttribute('x1', '40'); l.setAttribute('y1', y); l.setAttribute('x2', '220'); l.setAttribute('y2', y); svg.appendChild(l);
			}
			return svg;
		}

		// Additional blueprint types
		function svgBasket() {
			const ns = 'http://www.w3.org/2000/svg';
			const svg = document.createElementNS(ns, 'svg');
			svg.setAttribute('viewBox', '0 0 240 240');
			// outer ellipse top & bottom
			const top = document.createElementNS(ns, 'ellipse'); top.setAttribute('cx', '120'); top.setAttribute('cy', '44'); top.setAttribute('rx', '80'); top.setAttribute('ry', '16'); top.setAttribute('class', 'major'); svg.appendChild(top);
			const body = document.createElementNS(ns, 'path'); body.setAttribute('d', 'M40 44 C 44 160, 196 160, 200 44'); svg.appendChild(body);
			const bottom = document.createElementNS(ns, 'ellipse'); bottom.setAttribute('cx', '120'); bottom.setAttribute('cy', '164'); bottom.setAttribute('rx', '60'); bottom.setAttribute('ry', '10'); svg.appendChild(bottom);
			// vertical ribs
			for (let a = 0; a < 12; a++) {
				const t = 40 + a * (160 / 12);
				const l = document.createElementNS(ns, 'line'); l.setAttribute('x1', String(120)); l.setAttribute('y1', '44'); l.setAttribute('x2', String(t)); l.setAttribute('y2', '164'); svg.appendChild(l);
			}
			// rings
			for (let y = 72; y <= 152; y += 16) { const e = document.createElementNS(ns, 'ellipse'); e.setAttribute('cx', '120'); e.setAttribute('cy', String(y)); e.setAttribute('rx', '76'); e.setAttribute('ry', '14'); svg.appendChild(e); }
			return svg;
		}

		function svgTray() {
			const ns = 'http://www.w3.org/2000/svg';
			const svg = document.createElementNS(ns, 'svg');
			svg.setAttribute('viewBox', '0 0 260 160');
			const base = document.createElementNS(ns, 'rect'); base.setAttribute('x', '30'); base.setAttribute('y', '60'); base.setAttribute('width', '200'); base.setAttribute('height', '60'); base.setAttribute('class', 'major'); svg.appendChild(base);
			const lip = document.createElementNS(ns, 'rect'); lip.setAttribute('x', '24'); lip.setAttribute('y', '52'); lip.setAttribute('width', '212'); lip.setAttribute('height', '8'); svg.appendChild(lip);
			// cross ribs
			for (let x = 50; x <= 210; x += 30) { const l = document.createElementNS(ns, 'line'); l.setAttribute('x1', x); l.setAttribute('y1', '60'); l.setAttribute('x2', x); l.setAttribute('y2', '120'); svg.appendChild(l); }
			for (let y = 76; y <= 120; y += 22) { const l = document.createElementNS(ns, 'line'); l.setAttribute('x1', '30'); l.setAttribute('y1', y); l.setAttribute('x2', '230'); l.setAttribute('y2', y); svg.appendChild(l); }
			return svg;
		}

		function svgBottle() {
			const ns = 'http://www.w3.org/2000/svg';
			const svg = document.createElementNS(ns, 'svg');
			svg.setAttribute('viewBox', '0 0 200 260');
			const neck = document.createElementNS(ns, 'rect'); neck.setAttribute('x', '88'); neck.setAttribute('y', '24'); neck.setAttribute('width', '24'); neck.setAttribute('height', '36'); neck.setAttribute('class', 'major'); svg.appendChild(neck);
			const mouth = document.createElementNS(ns, 'rect'); mouth.setAttribute('x', '82'); mouth.setAttribute('y', '16'); mouth.setAttribute('width', '36'); mouth.setAttribute('height', '8'); svg.appendChild(mouth);
			const body = document.createElementNS(ns, 'path'); body.setAttribute('d', 'M70 60 C 60 90, 60 180, 100 220 C 140 180, 140 90, 130 60 Z'); body.setAttribute('class', ''); svg.appendChild(body);
			const guide1 = document.createElementNS(ns, 'line'); guide1.setAttribute('x1', '100'); guide1.setAttribute('y1', '60'); guide1.setAttribute('x2', '100'); guide1.setAttribute('y2', '220'); svg.appendChild(guide1);
			const level = document.createElementNS(ns, 'ellipse'); level.setAttribute('cx', '100'); level.setAttribute('cy', '180'); level.setAttribute('rx', '36'); level.setAttribute('ry', '8'); svg.appendChild(level);
			return svg;
		}

		// New: Flower garden planter box (цветочный садовый ящик)
		function svgPlanterBox() {
			const ns = 'http://www.w3.org/2000/svg';
			const svg = document.createElementNS(ns, 'svg');
			svg.setAttribute('viewBox', '0 0 320 180');
			// outer box
			const outer = document.createElementNS(ns, 'rect');
			outer.setAttribute('x', '20'); outer.setAttribute('y', '50'); outer.setAttribute('width', '280'); outer.setAttribute('height', '80'); outer.setAttribute('class', 'major');
			svg.appendChild(outer);
			// lip
			const lip = document.createElementNS(ns, 'rect');
			lip.setAttribute('x', '16'); lip.setAttribute('y', '42'); lip.setAttribute('width', '288'); lip.setAttribute('height', '8');
			svg.appendChild(lip);
			// inner dividers
			for (let x = 60; x <= 260; x += 50) {
				const l = document.createElementNS(ns, 'line');
				l.setAttribute('x1', String(x)); l.setAttribute('y1', '50'); l.setAttribute('x2', String(x)); l.setAttribute('y2', '130');
				svg.appendChild(l);
			}
			// bottom base slant
			const base = document.createElementNS(ns, 'path');
			base.setAttribute('d', 'M20 130 L300 130 L288 140 L32 140 Z');
			svg.appendChild(base);
			// small feet
			const f1 = document.createElementNS(ns, 'line'); f1.setAttribute('x1', '36'); f1.setAttribute('y1', '140'); f1.setAttribute('x2', '36'); f1.setAttribute('y2', '150'); svg.appendChild(f1);
			const f2 = document.createElementNS(ns, 'line'); f2.setAttribute('x1', '284'); f2.setAttribute('y1', '140'); f2.setAttribute('x2', '284'); f2.setAttribute('y2', '150'); svg.appendChild(f2);
			return svg;
		}

		// New: Flower vase (ваза для цветов)
		function svgFlowerVase() {
			const ns = 'http://www.w3.org/2000/svg';
			const svg = document.createElementNS(ns, 'svg');
			svg.setAttribute('viewBox', '0 0 220 260');
			const rim = document.createElementNS(ns, 'ellipse'); rim.setAttribute('cx', '110'); rim.setAttribute('cy', '40'); rim.setAttribute('rx', '70'); rim.setAttribute('ry', '12'); rim.setAttribute('class', 'major'); svg.appendChild(rim);
			const neck = document.createElementNS(ns, 'path'); neck.setAttribute('d', 'M60 40 C 80 52, 92 68, 92 90 C 92 110, 74 130, 74 150 C 74 182, 98 206, 110 206 C 122 206, 146 182, 146 150 C 146 130, 128 110, 128 90 C 128 68, 140 52, 160 40'); svg.appendChild(neck);
			const axis = document.createElementNS(ns, 'line'); axis.setAttribute('x1', '110'); axis.setAttribute('y1', '40'); axis.setAttribute('x2', '110'); axis.setAttribute('y2', '206'); svg.appendChild(axis);
			const base = document.createElementNS(ns, 'ellipse'); base.setAttribute('cx', '110'); base.setAttribute('cy', '210'); base.setAttribute('rx', '44'); base.setAttribute('ry', '8'); svg.appendChild(base);
			return svg;
		}

		// New: Plant support/trellis (поддержка для цветов)
		function svgPlantSupport() {
			const ns = 'http://www.w3.org/2000/svg';
			const svg = document.createElementNS(ns, 'svg');
			svg.setAttribute('viewBox', '0 0 240 260');
			// vertical rods
			const rodsX = [70, 120, 170];
			rodsX.forEach((x, i) => {
				const l = document.createElementNS(ns, 'line');
				l.setAttribute('x1', String(x)); l.setAttribute('y1', '50'); l.setAttribute('x2', String(x)); l.setAttribute('y2', '220');
				if (i === 0 || i === rodsX.length - 1) l.setAttribute('class', 'major');
				svg.appendChild(l);
			});
			// rings
			[70, 120, 170].forEach((cy, idx) => {
				const rx = 90 - idx * 10, ry = 12;
				const e = document.createElementNS(ns, 'ellipse');
				e.setAttribute('cx', '120'); e.setAttribute('cy', String(cy)); e.setAttribute('rx', String(rx)); e.setAttribute('ry', String(ry));
				if (idx === 0) e.setAttribute('class', 'major');
				svg.appendChild(e);
			});
			// ground spikes
			const s1 = document.createElementNS(ns, 'path'); s1.setAttribute('d', 'M70 220 L66 240 L74 240 Z'); svg.appendChild(s1);
			const s3 = document.createElementNS(ns, 'path'); s3.setAttribute('d', 'M170 220 L166 240 L174 240 Z'); svg.appendChild(s3);
			return svg;
		}

		// New: Honeycomb mesh for fruits (сетка-сота для фруктов)
		function svgHoneycombMesh() {
			const ns = 'http://www.w3.org/2000/svg';
			const svg = document.createElementNS(ns, 'svg');
			svg.setAttribute('viewBox', '0 0 260 200');
			// container
			const outer = document.createElementNS(ns, 'rect'); outer.setAttribute('x', '20'); outer.setAttribute('y', '20'); outer.setAttribute('width', '220'); outer.setAttribute('height', '160'); outer.setAttribute('rx', '10'); outer.setAttribute('ry', '10'); outer.setAttribute('class', 'major'); svg.appendChild(outer);
			// hex cells
			const size = 14;
			const dx = size * 1.5;
			const dy = Math.sqrt(3) * size / 2;
			function addHex(cx, cy) {
				const pts = [
					[cx - size, cy],
					[cx - size / 2, cy - dy],
					[cx + size / 2, cy - dy],
					[cx + size, cy],
					[cx + size / 2, cy + dy],
					[cx - size / 2, cy + dy],
					[cx - size, cy]
				];
				const poly = document.createElementNS(ns, 'polyline');
				poly.setAttribute('points', pts.map(p => p.join(',')).join(' '));
				svg.appendChild(poly);
			}
			const startX = 40, startY = 40, cols = 7, rows = 5;
			for (let r = 0; r < rows; r++) {
				for (let c = 0; c < cols; c++) {
					const cx = startX + c * dx + (r % 2 ? dx / 2 : 0);
					const cy = startY + r * (dy * 2);
					addHex(cx, cy);
				}
			}
			return svg;
		}

		// New: Square flower pot (квадратный горшок)
		function svgSquarePot() {
			const ns = 'http://www.w3.org/2000/svg';
			const svg = document.createElementNS(ns, 'svg');
			svg.setAttribute('viewBox', '0 0 240 240');
			// top rim (square)
			const rim = document.createElementNS(ns, 'rect');
			rim.setAttribute('x', '50'); rim.setAttribute('y', '40'); rim.setAttribute('width', '140'); rim.setAttribute('height', '16'); rim.setAttribute('class', 'major');
			svg.appendChild(rim);
			// body (tapering to a smaller square base)
			const body = document.createElementNS(ns, 'path');
			body.setAttribute('d', 'M60 56 L180 56 L160 184 L80 184 Z');
			svg.appendChild(body);
			// base square
			const base = document.createElementNS(ns, 'rect');
			base.setAttribute('x', '92'); base.setAttribute('y', '184'); base.setAttribute('width', '56'); base.setAttribute('height', '12'); base.setAttribute('class', 'major');
			svg.appendChild(base);
			// inner guides
			const g1 = document.createElementNS(ns, 'line'); g1.setAttribute('x1', '80'); g1.setAttribute('y1', '184'); g1.setAttribute('x2', '96'); g1.setAttribute('y2', '56'); svg.appendChild(g1);
			const g2 = document.createElementNS(ns, 'line'); g2.setAttribute('x1', '160'); g2.setAttribute('y1', '184'); g2.setAttribute('x2', '144'); g2.setAttribute('y2', '56'); svg.appendChild(g2);
			return svg;
		}

		// New: Cylindrical vase (сосуд/ваза для цветов)
		function svgCylinderVase() {
			const ns = 'http://www.w3.org/2000/svg';
			const svg = document.createElementNS(ns, 'svg');
			svg.setAttribute('viewBox', '0 0 200 260');
			// rim
			const rim = document.createElementNS(ns, 'ellipse'); rim.setAttribute('cx', '100'); rim.setAttribute('cy', '36'); rim.setAttribute('rx', '56'); rim.setAttribute('ry', '10'); rim.setAttribute('class', 'major'); svg.appendChild(rim);
			// sides
			const sideL = document.createElementNS(ns, 'path'); sideL.setAttribute('d', 'M44 36 C 48 60, 48 200, 100 220'); svg.appendChild(sideL);
			const sideR = document.createElementNS(ns, 'path'); sideR.setAttribute('d', 'M156 36 C 152 60, 152 200, 100 220'); svg.appendChild(sideR);
			// bottom
			const base = document.createElementNS(ns, 'ellipse'); base.setAttribute('cx', '100'); base.setAttribute('cy', '220'); base.setAttribute('rx', '34'); base.setAttribute('ry', '8'); base.setAttribute('class', 'major'); svg.appendChild(base);
			// water level guide
			const level = document.createElementNS(ns, 'ellipse'); level.setAttribute('cx', '100'); level.setAttribute('cy', '120'); level.setAttribute('rx', '48'); level.setAttribute('ry', '8'); svg.appendChild(level);
			return svg;
		}

		// New: Pedestal outdoor vase (ваза на ножке для уличных цветов)
		function svgPedestalVase() {
			const ns = 'http://www.w3.org/2000/svg';
			const svg = document.createElementNS(ns, 'svg');
			svg.setAttribute('viewBox', '0 0 240 260');
			const rim = document.createElementNS(ns, 'ellipse'); rim.setAttribute('cx', '120'); rim.setAttribute('cy', '48'); rim.setAttribute('rx', '72'); rim.setAttribute('ry', '12'); rim.setAttribute('class', 'major'); svg.appendChild(rim);
			const bowl = document.createElementNS(ns, 'path'); bowl.setAttribute('d', 'M48 48 C 60 100, 90 130, 120 140 C 150 130, 180 100, 192 48'); svg.appendChild(bowl);
			const stem = document.createElementNS(ns, 'rect'); stem.setAttribute('x', '108'); stem.setAttribute('y', '140'); stem.setAttribute('width', '24'); stem.setAttribute('height', '44'); svg.appendChild(stem);
			const foot = document.createElementNS(ns, 'ellipse'); foot.setAttribute('cx', '120'); foot.setAttribute('cy', '200'); foot.setAttribute('rx', '58'); foot.setAttribute('ry', '10'); foot.setAttribute('class', 'major'); svg.appendChild(foot);
			// decorative rings
			const ring = document.createElementNS(ns, 'ellipse'); ring.setAttribute('cx', '120'); ring.setAttribute('cy', '140'); ring.setAttribute('rx', '32'); ring.setAttribute('ry', '6'); svg.appendChild(ring);
			return svg;
		}

		// New models: more flower pots and planters
		function svgConicalPot() {
			const ns = 'http://www.w3.org/2000/svg';
			const svg = document.createElementNS(ns, 'svg');
			svg.setAttribute('viewBox', '0 0 240 240');
			const rim = document.createElementNS(ns, 'ellipse'); rim.setAttribute('cx', '120'); rim.setAttribute('cy', '40'); rim.setAttribute('rx', '80'); rim.setAttribute('ry', '12'); rim.setAttribute('class', 'major'); svg.appendChild(rim);
			const sideL = document.createElementNS(ns, 'line'); sideL.setAttribute('x1', '60'); sideL.setAttribute('y1', '40'); sideL.setAttribute('x2', '90'); sideL.setAttribute('y2', '200'); svg.appendChild(sideL);
			const sideR = document.createElementNS(ns, 'line'); sideR.setAttribute('x1', '180'); sideR.setAttribute('y1', '40'); sideR.setAttribute('x2', '150'); sideR.setAttribute('y2', '200'); svg.appendChild(sideR);
			const base = document.createElementNS(ns, 'ellipse'); base.setAttribute('cx', '120'); base.setAttribute('cy', '200'); base.setAttribute('rx', '30'); base.setAttribute('ry', '8'); base.setAttribute('class', 'major'); svg.appendChild(base);
			const inner = document.createElementNS(ns, 'ellipse'); inner.setAttribute('cx', '120'); inner.setAttribute('cy', '42'); inner.setAttribute('rx', '72'); inner.setAttribute('ry', '8'); svg.appendChild(inner);
			return svg;
		}

		function svgHangingPot() {
			const ns = 'http://www.w3.org/2000/svg';
			const svg = document.createElementNS(ns, 'svg');
			svg.setAttribute('viewBox', '0 0 240 260');
			const hook = document.createElementNS(ns, 'circle'); hook.setAttribute('cx', '120'); hook.setAttribute('cy', '20'); hook.setAttribute('r', '6'); svg.appendChild(hook);
			const c1 = document.createElementNS(ns, 'line'); c1.setAttribute('x1', '120'); c1.setAttribute('y1', '26'); c1.setAttribute('x2', '80'); c1.setAttribute('y2', '110'); svg.appendChild(c1);
			const c2 = document.createElementNS(ns, 'line'); c2.setAttribute('x1', '120'); c2.setAttribute('y1', '26'); c2.setAttribute('x2', '160'); c2.setAttribute('y2', '110'); svg.appendChild(c2);
			const c3 = document.createElementNS(ns, 'line'); c3.setAttribute('x1', '120'); c3.setAttribute('y1', '26'); c3.setAttribute('x2', '120'); c3.setAttribute('y2', '110'); svg.appendChild(c3);
			const rim = document.createElementNS(ns, 'ellipse'); rim.setAttribute('cx', '120'); rim.setAttribute('cy', '110'); rim.setAttribute('rx', '70'); rim.setAttribute('ry', '12'); rim.setAttribute('class', 'major'); svg.appendChild(rim);
			const bowl = document.createElementNS(ns, 'path'); bowl.setAttribute('d', 'M50 110 C 70 170, 170 170, 190 110'); svg.appendChild(bowl);
			const base = document.createElementNS(ns, 'ellipse'); base.setAttribute('cx', '120'); base.setAttribute('cy', '170'); base.setAttribute('rx', '50'); base.setAttribute('ry', '8'); svg.appendChild(base);
			return svg;
		}

		function svgTallPlanter() {
			const ns = 'http://www.w3.org/2000/svg';
			const svg = document.createElementNS(ns, 'svg');
			svg.setAttribute('viewBox', '0 0 200 300');
			const top = document.createElementNS(ns, 'rect'); top.setAttribute('x', '40'); top.setAttribute('y', '30'); top.setAttribute('width', '120'); top.setAttribute('height', '18'); top.setAttribute('class', 'major'); svg.appendChild(top);
			const body = document.createElementNS(ns, 'rect'); body.setAttribute('x', '48'); body.setAttribute('y', '48'); body.setAttribute('width', '104'); body.setAttribute('height', '200'); svg.appendChild(body);
			for (let y = 70; y <= 220; y += 30) { const l = document.createElementNS(ns, 'line'); l.setAttribute('x1', '48'); l.setAttribute('y1', String(y)); l.setAttribute('x2', '152'); l.setAttribute('y2', String(y)); svg.appendChild(l); }
			const base = document.createElementNS(ns, 'rect'); base.setAttribute('x', '60'); base.setAttribute('y', '260'); base.setAttribute('width', '80'); base.setAttribute('height', '12'); base.setAttribute('class', 'major'); svg.appendChild(base);
			return svg;
		}

		function svgRoundBowl() {
			const ns = 'http://www.w3.org/2000/svg';
			const svg = document.createElementNS(ns, 'svg');
			svg.setAttribute('viewBox', '0 0 260 200');
			const rim = document.createElementNS(ns, 'ellipse'); rim.setAttribute('cx', '130'); rim.setAttribute('cy', '50'); rim.setAttribute('rx', '90'); rim.setAttribute('ry', '12'); rim.setAttribute('class', 'major'); svg.appendChild(rim);
			const bowl = document.createElementNS(ns, 'path'); bowl.setAttribute('d', 'M40 50 C 70 120, 190 120, 220 50'); svg.appendChild(bowl);
			const foot = document.createElementNS(ns, 'ellipse'); foot.setAttribute('cx', '130'); foot.setAttribute('cy', '140'); foot.setAttribute('rx', '46'); foot.setAttribute('ry', '8'); svg.appendChild(foot);
			return svg;
		}

		function svgWallPlanter() {
			const ns = 'http://www.w3.org/2000/svg';
			const svg = document.createElementNS(ns, 'svg');
			svg.setAttribute('viewBox', '0 0 240 200');
			const wall = document.createElementNS(ns, 'line'); wall.setAttribute('x1', '24'); wall.setAttribute('y1', '20'); wall.setAttribute('x2', '24'); wall.setAttribute('y2', '180'); wall.setAttribute('class', 'major'); svg.appendChild(wall);
			const bracket = document.createElementNS(ns, 'path'); bracket.setAttribute('d', 'M24 60 L110 60 C 140 60, 150 80, 150 90'); svg.appendChild(bracket);
			const rim = document.createElementNS(ns, 'ellipse'); rim.setAttribute('cx', '150'); rim.setAttribute('cy', '90'); rim.setAttribute('rx', '50'); rim.setAttribute('ry', '10'); rim.setAttribute('class', 'major'); svg.appendChild(rim);
			const bowl = document.createElementNS(ns, 'path'); bowl.setAttribute('d', 'M100 90 C 120 140, 180 140, 200 90'); svg.appendChild(bowl);
			return svg;
		}

		function svgUrn() {
			const ns = 'http://www.w3.org/2000/svg';
			const svg = document.createElementNS(ns, 'svg');
			svg.setAttribute('viewBox', '0 0 240 260');
			const rim = document.createElementNS(ns, 'ellipse'); rim.setAttribute('cx', '120'); rim.setAttribute('cy', '36'); rim.setAttribute('rx', '76'); rim.setAttribute('ry', '12'); rim.setAttribute('class', 'major'); svg.appendChild(rim);
			const body = document.createElementNS(ns, 'path'); body.setAttribute('d', 'M44 36 C 60 100, 90 120, 120 130 C 150 120, 180 100, 196 36'); svg.appendChild(body);
			const neck = document.createElementNS(ns, 'rect'); neck.setAttribute('x', '104'); neck.setAttribute('y', '130'); neck.setAttribute('width', '32'); neck.setAttribute('height', '24'); svg.appendChild(neck);
			const foot = document.createElementNS(ns, 'ellipse'); foot.setAttribute('cx', '120'); foot.setAttribute('cy', '170'); foot.setAttribute('rx', '48'); foot.setAttribute('ry', '8'); foot.setAttribute('class', 'major'); svg.appendChild(foot);
			return svg;
		}

		function svgWindowBox() {
			const ns = 'http://www.w3.org/2000/svg';
			const svg = document.createElementNS(ns, 'svg');
			svg.setAttribute('viewBox', '0 0 320 160');
			const box = document.createElementNS(ns, 'rect'); box.setAttribute('x', '30'); box.setAttribute('y', '60'); box.setAttribute('width', '260'); box.setAttribute('height', '56'); box.setAttribute('class', 'major'); svg.appendChild(box);
			const lip = document.createElementNS(ns, 'rect'); lip.setAttribute('x', '24'); lip.setAttribute('y', '52'); lip.setAttribute('width', '272'); lip.setAttribute('height', '8'); svg.appendChild(lip);
			for (let x = 50; x <= 270; x += 36) { const l = document.createElementNS(ns, 'line'); l.setAttribute('x1', String(x)); l.setAttribute('y1', '60'); l.setAttribute('x2', String(x)); l.setAttribute('y2', '116'); svg.appendChild(l); }
			const br1 = document.createElementNS(ns, 'path'); br1.setAttribute('d', 'M60 116 L50 140'); svg.appendChild(br1);
			const br2 = document.createElementNS(ns, 'path'); br2.setAttribute('d', 'M260 116 L270 140'); svg.appendChild(br2);
			return svg;
		}

		// ----- New: tableware and construction-themed blueprints -----
		function svgWineGlass() {
			const ns = 'http://www.w3.org/2000/svg';
			const svg = document.createElementNS(ns, 'svg');
			svg.setAttribute('viewBox', '0 0 200 260');
			// bowl
			const bowl = document.createElementNS(ns, 'path');
			bowl.setAttribute('d', 'M60 40 C 60 100, 140 100, 140 40');
			svg.appendChild(bowl);
			// stem
			const stem = document.createElementNS(ns, 'rect'); stem.setAttribute('x', '96'); stem.setAttribute('y', '40'); stem.setAttribute('width', '8'); stem.setAttribute('height', '120'); svg.appendChild(stem);
			// base
			const base = document.createElementNS(ns, 'ellipse'); base.setAttribute('cx', '100'); base.setAttribute('cy', '170'); base.setAttribute('rx', '36'); base.setAttribute('ry', '8'); base.setAttribute('class', 'major'); svg.appendChild(base);
			return svg;
		}

		function svgBeerGlass() {
			const ns = 'http://www.w3.org/2000/svg';
			const svg = document.createElementNS(ns, 'svg');
			svg.setAttribute('viewBox', '0 0 200 260');
			// tapered sides
			const left = document.createElementNS(ns, 'path'); left.setAttribute('d', 'M70 40 C 74 60, 82 200, 92 220'); svg.appendChild(left);
			const right = document.createElementNS(ns, 'path'); right.setAttribute('d', 'M130 40 C 126 60, 118 200, 108 220'); svg.appendChild(right);
			// lip and bottom
			const lip = document.createElementNS(ns, 'rect'); lip.setAttribute('x', '68'); lip.setAttribute('y', '40'); lip.setAttribute('width', '64'); lip.setAttribute('height', '8'); lip.setAttribute('class', 'major'); svg.appendChild(lip);
			const base = document.createElementNS(ns, 'ellipse'); base.setAttribute('cx', '100'); base.setAttribute('cy', '224'); base.setAttribute('rx', '40'); base.setAttribute('ry', '8'); base.setAttribute('class', 'major'); svg.appendChild(base);
			return svg;
		}

		function svgCup() {
			const ns = 'http://www.w3.org/2000/svg';
			const svg = document.createElementNS(ns, 'svg');
			svg.setAttribute('viewBox', '0 0 220 200');
			const rim = document.createElementNS(ns, 'ellipse'); rim.setAttribute('cx', '110'); rim.setAttribute('cy', '40'); rim.setAttribute('rx', '70'); rim.setAttribute('ry', '12'); rim.setAttribute('class', 'major'); svg.appendChild(rim);
			const body = document.createElementNS(ns, 'path'); body.setAttribute('d', 'M40 40 C 48 120, 172 120, 180 40'); svg.appendChild(body);
			const foot = document.createElementNS(ns, 'ellipse'); foot.setAttribute('cx', '110'); foot.setAttribute('cy', '130'); foot.setAttribute('rx', '50'); foot.setAttribute('ry', '8'); foot.setAttribute('class', 'major'); svg.appendChild(foot);
			const handle = document.createElementNS(ns, 'path'); handle.setAttribute('d', 'M178 56 C 196 68, 196 100, 178 110'); svg.appendChild(handle);
			return svg;
		}

		function svgPlate() {
			const ns = 'http://www.w3.org/2000/svg';
			const svg = document.createElementNS(ns, 'svg');
			svg.setAttribute('viewBox', '0 0 260 160');
			const rim = document.createElementNS(ns, 'ellipse'); rim.setAttribute('cx', '130'); rim.setAttribute('cy', '80'); rim.setAttribute('rx', '100'); rim.setAttribute('ry', '28'); rim.setAttribute('class', 'major'); svg.appendChild(rim);
			const well = document.createElementNS(ns, 'ellipse'); well.setAttribute('cx', '130'); well.setAttribute('cy', '82'); well.setAttribute('rx', '60'); well.setAttribute('ry', '16'); svg.appendChild(well);
			return svg;
		}

		function svgStackedPlates() {
			const ns = 'http://www.w3.org/2000/svg';
			const svg = document.createElementNS(ns, 'svg');
			svg.setAttribute('viewBox', '0 0 260 180');
			for (let i = 0; i < 3; i++) {
				const e = document.createElementNS(ns, 'ellipse');
				e.setAttribute('cx', '130'); e.setAttribute('cy', String(80 + i * 16)); e.setAttribute('rx', String(100 - i * 8)); e.setAttribute('ry', '24');
				if (i === 0) e.setAttribute('class', 'major');
				svg.appendChild(e);
			}
			return svg;
		}

		function svgToolbox() {
			const ns = 'http://www.w3.org/2000/svg';
			const svg = document.createElementNS(ns, 'svg');
			svg.setAttribute('viewBox', '0 0 300 190');
			const base = document.createElementNS(ns, 'rect'); base.setAttribute('x', '30'); base.setAttribute('y', '60'); base.setAttribute('width', '240'); base.setAttribute('height', '90'); base.setAttribute('class', 'major'); svg.appendChild(base);
			const lid = document.createElementNS(ns, 'rect'); lid.setAttribute('x', '30'); lid.setAttribute('y', '48'); lid.setAttribute('width', '240'); lid.setAttribute('height', '12'); svg.appendChild(lid);
			const handle = document.createElementNS(ns, 'rect'); handle.setAttribute('x', '130'); handle.setAttribute('y', '28'); handle.setAttribute('width', '40'); handle.setAttribute('height', '20'); svg.appendChild(handle);
			for (let x = 52; x <= 248; x += 32) { const l = document.createElementNS(ns, 'line'); l.setAttribute('x1', String(x)); l.setAttribute('y1', '60'); l.setAttribute('x2', String(x)); l.setAttribute('y2', '150'); svg.appendChild(l); }
			return svg;
		}

		function svgPalletCrate() {
			const ns = 'http://www.w3.org/2000/svg';
			const svg = document.createElementNS(ns, 'svg');
			svg.setAttribute('viewBox', '0 0 320 200');
			const crate = document.createElementNS(ns, 'rect'); crate.setAttribute('x', '30'); crate.setAttribute('y', '40'); crate.setAttribute('width', '260'); crate.setAttribute('height', '120'); crate.setAttribute('class', 'major'); svg.appendChild(crate);
			for (let y = 60; y <= 140; y += 20) { const l = document.createElementNS(ns, 'line'); l.setAttribute('x1', '30'); l.setAttribute('y1', String(y)); l.setAttribute('x2', '290'); l.setAttribute('y2', String(y)); svg.appendChild(l); }
			// pallet
			const p1 = document.createElementNS(ns, 'rect'); p1.setAttribute('x', '40'); p1.setAttribute('y', '164'); p1.setAttribute('width', '240'); p1.setAttribute('height', '8'); svg.appendChild(p1);
			const p2 = document.createElementNS(ns, 'rect'); p2.setAttribute('x', '40'); p2.setAttribute('y', '176'); p2.setAttribute('width', '240'); p2.setAttribute('height', '8'); svg.appendChild(p2);
			return svg;
		}

		function svgBucket() {
			const ns = 'http://www.w3.org/2000/svg';
			const svg = document.createElementNS(ns, 'svg');
			svg.setAttribute('viewBox', '0 0 220 240');
			const rim = document.createElementNS(ns, 'ellipse'); rim.setAttribute('cx', '110'); rim.setAttribute('cy', '40'); rim.setAttribute('rx', '70'); rim.setAttribute('ry', '12'); rim.setAttribute('class', 'major'); svg.appendChild(rim);
			const body = document.createElementNS(ns, 'path'); body.setAttribute('d', 'M40 40 L60 200 L160 200 L180 40'); svg.appendChild(body);
			const base = document.createElementNS(ns, 'rect'); base.setAttribute('x', '60'); base.setAttribute('y', '200'); base.setAttribute('width', '100'); base.setAttribute('height', '10'); svg.appendChild(base);
			const handle = document.createElementNS(ns, 'path'); handle.setAttribute('d', 'M50 60 C 110 0, 110 0, 170 60'); svg.appendChild(handle);
			return svg;
		}

		const blueprintFactories = [
			svgPot, svgCrate, svgBox, svgBasket, svgTray, svgBottle,
			svgPlanterBox, svgFlowerVase, svgPlantSupport, svgHoneycombMesh, svgPedestalVase,
			svgConicalPot, svgHangingPot, svgTallPlanter, svgRoundBowl, svgWallPlanter, svgUrn, svgWindowBox,
			svgSquarePot, svgCylinderVase,
			// newly added themed shapes
			svgWineGlass, svgBeerGlass, svgCup, svgPlate, svgStackedPlates, svgToolbox, svgPalletCrate, svgBucket
		];

		// Add animated professional-like dimensions (horizontal top and vertical right) to an SVG
		function addDimensionsToSvg(svg) {
			try {
				const ns = 'http://www.w3.org/2000/svg';
				const vbRaw = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(parseFloat);
				if (vbRaw.length !== 4 || vbRaw.some(n => isNaN(n))) return;
				const [minX, minY, vbW, vbH] = vbRaw;
				const inset = Math.max(8, Math.min(vbW, vbH) * 0.05);
				const g = document.createElementNS(ns, 'g');
				g.setAttribute('class', 'dims');

				// Horizontal dimension (top)
				const hx1 = minX + inset;
				const hx2 = minX + vbW - inset;
				const hy = minY + inset + 10;
				const hExt1 = document.createElementNS(ns, 'line'); hExt1.setAttribute('class', 'dim-ext'); hExt1.setAttribute('x1', hx1); hExt1.setAttribute('y1', hy - 14); hExt1.setAttribute('x2', hx1); hExt1.setAttribute('y2', hy + 6);
				const hExt2 = document.createElementNS(ns, 'line'); hExt2.setAttribute('class', 'dim-ext'); hExt2.setAttribute('x1', hx2); hExt2.setAttribute('y1', hy - 14); hExt2.setAttribute('x2', hx2); hExt2.setAttribute('y2', hy + 6);
				const hLine = document.createElementNS(ns, 'line'); hLine.setAttribute('class', 'dim-line'); hLine.setAttribute('x1', hx1); hLine.setAttribute('y1', hy); hLine.setAttribute('x2', hx2); hLine.setAttribute('y2', hy);
				const hLen = Math.max(0, hx2 - hx1); hLine.style.setProperty('--len', String(hLen)); hLine.style.setProperty('--d', '0.1s');
				const a = 3; // smaller arrow size
				const hArrL = document.createElementNS(ns, 'path'); hArrL.setAttribute('class', 'dim-arrow'); hArrL.setAttribute('d', `M ${hx1 + a} ${hy - a} L ${hx1} ${hy} L ${hx1 + a} ${hy + a} Z`); hArrL.style.setProperty('--d', '0.25s');
				const hArrR = document.createElementNS(ns, 'path'); hArrR.setAttribute('class', 'dim-arrow'); hArrR.setAttribute('d', `M ${hx2 - a} ${hy - a} L ${hx2} ${hy} L ${hx2 - a} ${hy + a} Z`); hArrR.style.setProperty('--d', '0.25s');
				const hTxt = document.createElementNS(ns, 'text'); hTxt.setAttribute('class', 'dim-text'); hTxt.setAttribute('x', String(minX + vbW / 2)); hTxt.setAttribute('y', String(hy - 6)); hTxt.setAttribute('text-anchor', 'middle'); hTxt.style.setProperty('--d', '0.35s'); hTxt.textContent = `${Math.round(vbW)} mm`;

				// Vertical dimension (right)
				const vy1 = minY + inset;
				const vy2 = minY + vbH - inset;
				const vx = minX + vbW - inset - 10;
				const vExt1 = document.createElementNS(ns, 'line'); vExt1.setAttribute('class', 'dim-ext'); vExt1.setAttribute('x1', vx - 6); vExt1.setAttribute('y1', vy1); vExt1.setAttribute('x2', vx + 14); vExt1.setAttribute('y2', vy1);
				const vExt2 = document.createElementNS(ns, 'line'); vExt2.setAttribute('class', 'dim-ext'); vExt2.setAttribute('x1', vx - 6); vExt2.setAttribute('y1', vy2); vExt2.setAttribute('x2', vx + 14); vExt2.setAttribute('y2', vy2);
				const vLine = document.createElementNS(ns, 'line'); vLine.setAttribute('class', 'dim-line'); vLine.setAttribute('x1', vx); vLine.setAttribute('y1', vy1); vLine.setAttribute('x2', vx); vLine.setAttribute('y2', vy2);
				const vLen = Math.max(0, vy2 - vy1); vLine.style.setProperty('--len', String(vLen)); vLine.style.setProperty('--d', '0.3s');
				const vArrT = document.createElementNS(ns, 'path'); vArrT.setAttribute('class', 'dim-arrow'); vArrT.setAttribute('d', `M ${vx - a} ${vy1 + a} L ${vx} ${vy1} L ${vx + a} ${vy1 + a} Z`); vArrT.style.setProperty('--d', '0.45s');
				const vArrB = document.createElementNS(ns, 'path'); vArrB.setAttribute('class', 'dim-arrow'); vArrB.setAttribute('d', `M ${vx - a} ${vy2 - a} L ${vx} ${vy2} L ${vx + a} ${vy2 - a} Z`); vArrB.style.setProperty('--d', '0.45s');
				const vTxt = document.createElementNS(ns, 'text'); vTxt.setAttribute('class', 'dim-text v'); vTxt.setAttribute('x', String(vx + 10)); vTxt.setAttribute('y', String(minY + vbH / 2)); vTxt.setAttribute('text-anchor', 'middle'); vTxt.style.setProperty('--d', '0.55s'); vTxt.textContent = `${Math.round(vbH)} mm`;

				[g,
					hExt1, hExt2,
					hLine,
					hArrL, hArrR,
					hTxt,
					vExt1, vExt2,
					vLine,
					vArrT, vArrB,
					vTxt
				].forEach(n => { if (n !== g) g.appendChild(n); });
				svg.appendChild(g);
			} catch (_) { }
		}

		// Track which blueprint types are currently visible
		let visibleBlueprintIndexes = [];
		function spawnBlueprint() {
			const overlay = getBlueprintsOverlay();
			// Get currently visible blueprint types by data-bp-index attribute
			visibleBlueprintIndexes = Array.from(overlay.querySelectorAll('.blueprint[data-bp-index]'))
				.map(bp => parseInt(bp.getAttribute('data-bp-index'), 10))
				.filter(idx => !isNaN(idx));

			// Find available indexes (not currently visible)
			const availableIndexes = blueprintFactories
				.map((_, idx) => idx)
				.filter(idx => !visibleBlueprintIndexes.includes(idx));

			// If all types are visible, allow any (fallback to original behavior)
			let chosenIdx;
			if (availableIndexes.length > 0) {
				chosenIdx = availableIndexes[Math.floor(Math.random() * availableIndexes.length)];
			} else {
				chosenIdx = Math.floor(Math.random() * blueprintFactories.length);
			}
			const make = blueprintFactories[chosenIdx];
			const bp = document.createElement('div');
			bp.className = 'blueprint';
			bp.setAttribute('data-bp-index', chosenIdx);
			const svg = make();
			bp.appendChild(svg);
			addDimensionsToSvg(svg);

			// random size/position/rotation (smaller gentle motion)
			const vw = window.innerWidth, vh = window.innerHeight;
			const size = Math.round(Math.min(vw, vh) * (0.30 + Math.random() * 0.20)); // 30%..50%
			// 70% of spawns biased to central area (but avoid exact middle) on all viewports
			function pickBiasedCoord(avail) {
				const biasProb = 0.7; // 70%
				if (!(avail > 0) || Math.random() > biasProb) {
					return Math.random() * Math.max(0, avail);
				}
				const center = avail / 2;
				const halfCentral = avail * 0.30; // central 60% band total (±30%)
				const deadHalf = Math.max(8, avail * 0.05); // exclude a small central band (±5%)
				const leftStart = Math.max(0, center - halfCentral);
				const leftEnd = Math.max(0, center - deadHalf);
				const rightStart = Math.min(avail, center + deadHalf);
				const rightEnd = Math.min(avail, center + halfCentral);
				const chooseLeft = Math.random() < 0.5;
				const rangeStart = chooseLeft ? leftStart : rightStart;
				const rangeEnd = chooseLeft ? leftEnd : rightEnd;
				const span = Math.max(0, rangeEnd - rangeStart);
				if (span <= 0) return Math.random() * Math.max(0, avail);
				return rangeStart + Math.random() * span;
			}
			const availX = Math.max(0, vw - size);
			const availY = Math.max(0, vh - size);
			const x = Math.round(pickBiasedCoord(availX));
			const y = Math.round(pickBiasedCoord(availY));
			const rot = (Math.random() * 10 - 5); // -5..5 deg
			bp.style.width = size + 'px';
			bp.style.height = size + 'px';
			// set CSS variables for drift keyframes
			bp.style.setProperty('--bp-x', x + 'px');
			bp.style.setProperty('--bp-y', y + 'px');
			bp.style.setProperty('--bp-r', rot + 'deg');
			// gentle drift delta per element
			const dx = Math.round((Math.random() * 40 - 20));
			const dy = Math.round((Math.random() * 40 - 20));
			bp.style.setProperty('--bp-dx', dx + 'px');
			bp.style.setProperty('--bp-dy', dy + 'px');

			overlay.appendChild(bp);

			// fade in and trigger dimension animations
			requestAnimationFrame(() => {
				bp.style.opacity = '0.3';
				requestAnimationFrame(() => { bp.classList.add('dim-animate'); });
			});

			const hold = 3500 + Math.floor(Math.random() * 1500); // 3.5-5s
			const total = 1000 + hold + 1000; // faster fade in/out
			// fade out and cleanup sooner
			setTimeout(() => { bp.style.opacity = '0'; }, 1000 + hold);
			setTimeout(() => { bp.remove(); }, total + 200);
		}

		let _bpNextTimer = null;
		let _bpStarted = false;
	function startBlueprintCycle() {
			if (_bpStarted) return;
			_bpStarted = true;
			// Desktop (>=1024px) up to 8 models, otherwise up to 5
			function getMaxAtOnce() {
				try {
		    const desktop = (window.matchMedia && window.matchMedia('(min-width: 1024px)').matches);
		    	if (isLowPower()) return desktop ? 4 : 3;
		    	// Increase baseline: desktop more models visible immediately, mobile also a bit more
		    	return desktop ? 12 : 8;
				} catch (_) { return 5; }
			}
			const overlay = getBlueprintsOverlay();
			// Immediately populate the overlay with a batch of blueprints so the page feels lively from the start.
			try {
				const initial = getMaxAtOnce();
				for (let i = 0; i < initial; i++) {
					// stagger slightly so positions/sizes/durations vary
					setTimeout(() => { try { spawnBlueprint(); } catch(_){} }, i * 120);
				}
			} catch (_) { }
			function tick() {
				// keep up to maxAtOnce blueprints concurrently
				const current = overlay.querySelectorAll('.blueprint').length;
				const maxAtOnce = getMaxAtOnce();
				// Skip spawning when tab is hidden or user prefers reduced motion
				if (!document.hidden && !prefersReduced && current < maxAtOnce) {
					spawnBlueprint();
				}
				// random interval for appearance (1–3s); slower on low-power (2–4s)
				const nextIn = isLowPower() ? (2000 + Math.floor(Math.random() * 2000)) : (1000 + Math.floor(Math.random() * 2000));
				_bpNextTimer = setTimeout(tick, nextIn);
			}
			tick();
		}

		// ---- Seamless ticker setup (brands, cyan color, smooth infinite loop) ----
		(function setupTicker() {
			const track = document.getElementById('ticker-track');
			const seg = document.getElementById('ticker-segment');
			if (!track || !seg) return;

			// store initial items for controlled filling
			const baseItems = Array.from(seg.children).map(n => n.cloneNode(true));

			function fillBaseSegmentToViewport() {
				// clear current seg to base items
				seg.innerHTML = '';
				baseItems.forEach(n => seg.appendChild(n.cloneNode(true)));
				const container = track.parentElement;
				if (!container) return;
				// duplicate items inside the base segment until it fully covers container width (no empty pause)
				// add one gap worth of safety to avoid sub-pixel gaps at seam
				const cs = getComputedStyle(seg);
				const gapPx = parseFloat(cs.gap || cs.columnGap || '0') || 0;
				let guard = 0;
				while (seg.getBoundingClientRect().width < container.getBoundingClientRect().width + gapPx + 1 && guard < 30) {
					baseItems.forEach(n => seg.appendChild(n.cloneNode(true)));
					guard++;
				}
			}

			function ensureTwoSegments() {
				// Keep exactly two segments: base + clone for perfect -50% loop
				Array.from(track.querySelectorAll('.ticker-segment')).forEach((s, i) => { if (i > 0) s.remove(); });
				track.appendChild(seg.cloneNode(true));
			}

			function recalcDuration() {
				// Use a fixed px/sec speed across all devices for identical perceived speed
				const speed = 50; // px/s, constant everywhere
				const segW = seg.getBoundingClientRect().width; // distance per cycle in px
				const duration = segW / speed; // exact time in seconds, no clamping
				track.style.setProperty('--ticker-duration', duration + 's');
			}

			function imageFallbacks() {
				const allBadges = track.querySelectorAll('.logo-badge');
				allBadges.forEach(badge => {
					const img = badge.querySelector('.logo-img');
					if (!img) return;
					const markMissing = () => badge.classList.add('logo-missing');
					if (!img.getAttribute('src')) markMissing();
					if (img.complete && img.naturalWidth === 0) markMissing();
					img.addEventListener('error', markMissing);
					img.addEventListener('load', () => {
						if (img.naturalWidth > 0) badge.classList.remove('logo-missing');
						// sizes may change after load (SVG intrinsic), so refit and recalc
						requestAnimationFrame(() => { fillBaseSegmentToViewport(); ensureTwoSegments(); recalcDuration(); });
					});
				});
			}

			// initial setup
			requestAnimationFrame(() => {
				fillBaseSegmentToViewport();
				ensureTwoSegments();
				recalcDuration();
				imageFallbacks();
			});

			// keep seamless on resize
			window.addEventListener('resize', () => {
				requestAnimationFrame(() => { fillBaseSegmentToViewport(); ensureTwoSegments(); recalcDuration(); });
			});

			// Recalculate after web fonts load (text placeholders change width on mobile)
			try {
				if (document.fonts && document.fonts.ready) {
					document.fonts.ready.then(() => {
						requestAnimationFrame(() => { fillBaseSegmentToViewport(); ensureTwoSegments(); recalcDuration(); });
					});
				}
			} catch (_) { }

			// Extra recalculation when switching between desktop/mobile (body.mobile-mode toggles)
			try {
				const bodyEl = document.body;
				const mo = new MutationObserver((mutations) => {
					for (const m of mutations) {
						if (m.type === 'attributes' && m.attributeName === 'class') {
							requestAnimationFrame(() => { fillBaseSegmentToViewport(); ensureTwoSegments(); recalcDuration(); });
							break;
						}
					}
				});
				mo.observe(bodyEl, { attributes: true, attributeFilter: ['class'] });
			} catch (_) { }
		})();

		// Pause/resume time-based effects when tab visibility changes
		document.addEventListener('visibilitychange', () => {
			const paused = document.hidden;
			document.body.classList.toggle('is-paused', paused);
			if (paused) {
				stopBtnCycle();
			} else {
				if (heroBtn && !prefersReduced) startBtnCycle();
				if (!_bpStarted && !prefersReduced) startBlueprintCycle();
			}
		}, { passive: true });
