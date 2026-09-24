const navigationEntry = performance.getEntriesByType('navigation')[0];
const shouldResetScroll = navigationEntry?.type === 'reload';

if (shouldResetScroll && 'scrollRestoration' in history) {
	history.scrollRestoration = 'manual';
}

(() => {
	if (typeof window.gsap !== 'undefined') return;

	const timelineStub = {
		to() { return this; },
		fromTo() { return this; },
		set() { return this; },
		add() { return this; },
		kill() { return this; },
		totalTime() { return this; },
		duration() { return 1; }
	};

	window.ScrollTrigger = window.ScrollTrigger || {
		config() {},
		clearScrollMemory() {},
		refresh() {},
		getAll() { return []; }
	};

	window.gsap = {
		registerPlugin() {},
		set() {},
		killTweensOf() {},
		timeline() {
			return { ...timelineStub };
		},
		fromTo() {
			return { ...timelineStub };
		},
		to(target, vars = {}) {
			if (target === window && vars.scrollTo) {
				const y = typeof vars.scrollTo === 'number' ? vars.scrollTo : vars.scrollTo.y;
				window.scrollTo({
					top: Number(y) || 0,
					behavior: vars.duration === 0 ? 'auto' : 'smooth'
				});
			}
			if (typeof vars.onUpdate === 'function') vars.onUpdate();
			if (typeof vars.onComplete === 'function') vars.onComplete();
			return { ...timelineStub };
		},
		utils: {
			toArray(value) {
				return typeof value === 'string' ? Array.from(document.querySelectorAll(value)) : Array.from(value || []);
			},
			wrap(min, max, value) {
				const wrapValue = (input) => {
					const range = max - min;
					return ((((input - min) % range) + range) % range) + min;
				};
				return value === undefined ? wrapValue : wrapValue(value);
			},
			snap(increment) {
				return (value) => Math.round(value / increment) * increment;
			}
		}
	};
})();

function getScrollTargetY(targetId) {
	const targetEl = document.querySelector(targetId);
	if (!targetEl) return null;
	if (targetId === '#hero-section') return 0;

	if (window.matchMedia('(min-width: 1024px)').matches && targetEl.classList.contains('card')) {
		const stickyCards = document.querySelector('.sticky-cards');
		const cardOrder = ['#card-4', '#card-3', '#card-upgrade', '#card-1'];
		const cardIndex = cardOrder.indexOf(targetId);

		if (stickyCards && cardIndex >= 0) {
			const targetOffset = cardOrder.slice(0, cardIndex).reduce((offset, selector) => {
				const card = document.querySelector(selector);
				return offset + (card?.offsetHeight || window.innerHeight);
			}, 0);
			const innerOffset = targetId === '#card-3' ? Math.round(window.innerHeight * 0.82) : 0;
			return Math.max(0, stickyCards.offsetTop + targetOffset + innerOffset);
		}
	}

	if (targetId === '#about') {
		return Math.max(0, targetEl.offsetTop);
	}

	return Math.max(0, targetEl.getBoundingClientRect().top + window.scrollY);
}

function setupReliableNavigation() {
	const glassNav = document.querySelector('.glass-nav');
	if (!glassNav || glassNav.dataset.navReady === 'true') return;

	glassNav.dataset.navReady = 'true';

	glassNav.addEventListener('click', (event) => {
		const link = event.target.closest('a[href]');
		if (!link || !glassNav.contains(link)) return;

		const url = new URL(link.getAttribute('href'), window.location.href);
		const samePage = url.origin === window.location.origin && url.pathname === window.location.pathname;

		if (!url.hash || !samePage) return;

		const targetY = getScrollTargetY(url.hash);
		if (targetY === null) return;

		event.preventDefault();
		event.stopImmediatePropagation();

		const navLinks = glassNav.querySelectorAll('.nav-link');
		if (link.classList.contains('nav-link')) {
			navLinks.forEach(nav => nav.classList.remove('active'));
			link.classList.add('active');
		}

		glassNav.classList.remove('is-open');
		const mobileMenuToggle = glassNav.querySelector('.mobile-menu-toggle');
		mobileMenuToggle?.setAttribute('aria-expanded', 'false');
		mobileMenuToggle?.setAttribute('aria-label', 'Open navigation menu');

		window.scrollTo({
			top: targetY,
			behavior: 'smooth'
		});
	}, true);
}

document.addEventListener('DOMContentLoaded', setupReliableNavigation, { once: true });

// --- HERO WORD SHOVE EFFECT ---
const shoveContainers = document.querySelectorAll('[data-shove-text]');

if (shoveContainers.length > 0 && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
	const shoveWords = [];
	const shoveRadius = 132;
	const shoveStrength = 34;
	const heroForShove = document.querySelector('.hero');
	let pendingShoveEvent = null;
	let shoveFrame = 0;

	shoveContainers.forEach((container) => {
		const words = container.textContent.trim().split(/\s+/);
		container.textContent = '';

		words.forEach((word, index) => {
			const span = document.createElement('span');
			span.dataset.shove = '';
			span.textContent = word;
			container.appendChild(span);

			if (index < words.length - 1) {
				container.appendChild(document.createTextNode(' '));
			}

			shoveWords.push(span);
		});
	});

	const updateShove = (event) => {
		shoveWords.forEach((word) => {
			const rect = word.getBoundingClientRect();
			const centerX = rect.left + rect.width / 2;
			const centerY = rect.top + rect.height / 2;
			const deltaX = centerX - event.clientX;
			const deltaY = centerY - event.clientY;
			const distance = Math.hypot(deltaX, deltaY);

			if (distance > shoveRadius || distance === 0) {
				word.style.transform = 'translate3d(0, 0, 0)';
				return;
			}

			const force = (1 - distance / shoveRadius) * shoveStrength;
			const x = (deltaX / distance) * force;
			const y = (deltaY / distance) * force;
			word.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
		});
	};

	const requestShoveUpdate = (event) => {
		pendingShoveEvent = event;
		if (shoveFrame) return;

		shoveFrame = requestAnimationFrame(() => {
			shoveFrame = 0;
			if (pendingShoveEvent) updateShove(pendingShoveEvent);
		});
	};

	const resetShove = () => {
		shoveWords.forEach((word) => {
			word.style.transform = 'translate3d(0, 0, 0)';
		});
	};

	heroForShove?.addEventListener('mousemove', requestShoveUpdate, { passive: true });
	heroForShove?.addEventListener('mouseleave', resetShove);
}

// --- BACKGROUND MUSIC INITIALIZATION ---
const bgm = new Audio();
bgm.loop = true;
bgm.volume = 0; // Start at 0 for a smooth fade-in
bgm.playbackRate = 0.75; // Slow down tempo to a chill 40-60 BPM range
bgm.preload = 'none'; // Don't preload until user interaction

let bgmStarted = false;

function startBGM() {
	if (bgmStarted) return;
	bgmStarted = true;

	// Lazy-load the audio source only on first interaction
	if (!bgm.src || bgm.src === '' || bgm.src === window.location.href) {
		bgm.src = '(FREE FOR PROFIT) 90s Boom Bap Chill Jazz x LoFi Type Beat - Anxiety.mp3';
	}

	bgm.play().then(() => {
		console.log("BGM successfully started playing!");
		// Smoothly fade in volume using GSAP!
		gsap.to(bgm, {
			volume: 0.12, // Audible background volume level
			duration: 3,  // Smooth cinematic fade-in
			ease: "power1.inOut"
		});
		// Remove interaction listeners since music is playing successfully
		removeBgmListeners();
	}).catch(err => {
		console.log("Autoplay blocked or deferred by browser policies:", err);
		bgmStarted = false; // Reset to allow retry on next interaction
	});
}

function removeBgmListeners() {
	window.removeEventListener('pointerdown', startBGM);
	window.removeEventListener('keydown', startBGM);
}

// Browsers only allow audio reliably after a real user gesture.
window.addEventListener('pointerdown', startBGM, { once: true });
window.addEventListener('keydown', startBGM, { once: true });

window.addEventListener('load', () => {
	if (shouldResetScroll) {
		window.scrollTo(0, 0);
	}

	const preloader = document.getElementById('preloader');
	const preloaderImg = document.getElementById('preloader-img');

	if (preloader && preloaderImg) {
		// Trigger zoom out animation on the image when loaded
		preloaderImg.classList.remove('pop-animation');
		preloaderImg.classList.add('zoom-out-exit');

		// Wait for zoom animation to finish, then fade out the preloader background
		setTimeout(() => {
			preloader.classList.add('hidden');
			document.body.classList.remove('preloader-active');
		}, 600); // Wait for the 0.6s zoom out animation
	}

	gsap.registerPlugin(...[window.ScrollTrigger, window.ScrollToPlugin].filter(Boolean))
	ScrollTrigger.config({
		limitCallbacks: true,
		ignoreMobileResize: true
	});

	if (shouldResetScroll) {
		ScrollTrigger.clearScrollMemory('manual')
	}

	const desktopMotion = window.matchMedia('(min-width: 1024px)').matches;

	if (desktopMotion) {
		const cards = gsap.utils.toArray('.card')

		cards.forEach((card, index) => {
			if (index < cards.length - 1) {
				const cardInner = card.querySelector('.card-inner')

				gsap.fromTo(
					cardInner,
					{
						y: '0%',
						z: 0,
						rotationX: 0,
					},
					{
						y: '-50%',
						z: -250,
						rotationX: 45,
						scrollTrigger: {
							trigger: cards[index + 1],
							start: 'top 85%',
							end: 'top -75%',
							scrub: 0.2,
							pin: card,
							pinSpacing: false,
							anticipatePin: 1,
							fastScrollEnd: true
						},
					},
				)

				gsap.to(cardInner, {
					'--after-opacity': 1,
					scrollTrigger: {
						trigger: cards[index + 1],
						start: 'top 75%',
						end: 'top -25%',
						scrub: 0.2,
						fastScrollEnd: true
					},
				})
			}
		})
	}

	// --- LAYER 4 FLOAT ANIMATION ---
	if (desktopMotion && document.querySelector('.hero .layer-4')) {
		gsap.to('.hero .layer-4', {
			yPercent: -3,   // Subtle float
			ease: 'none',
			scrollTrigger: {
				trigger: '.hero',
				start: 'top top',
				end: 'bottom top',
				scrub: true
			}
		});
	}



	// --- FLOATING TECH STACK LOGOS FOR CARD-1 ---
	const card1 = document.querySelector("#card-1");
	const floatContainer = card1?.querySelector(".floating-images-container");

	if (card1 && floatContainer) {
		const stackItems = [
			{ icon: "assets/stack/html.png", label: "HTML", color: "#e34f26" },
			{ icon: "assets/stack/css.png", label: "CSS", color: "#1572b6" },
			{ icon: "assets/stack/javascript.png", label: "JavaScript", color: "#f7df1e" },
			{ icon: "assets/stack/java.png", label: "Java", color: "#ef4444" },
			{ icon: "assets/stack/python.png", label: "Python", color: "#3776ab" },
			{ icon: "assets/stack/c.png", label: "C", color: "#00599c" },
			{ icon: "assets/stack/cpp.png", label: "C++", color: "#00599c" },
			{ icon: "assets/stack/github.png", label: "GitHub", color: "#f8fafc" },
			{ icon: "assets/stack/firebase.png", label: "Firebase", color: "#ffca28" },
			{ icon: "assets/stack/mysql.png", label: "MySQL", color: "#00758f" },
			{ icon: "assets/stack/git.png", label: "Git", color: "#f05032" }
		];

		function spawnStackLogo() {
			if (!card1Visible) return;

			const maxStackLogos = window.innerWidth <= 768 ? 10 : 18;
			const existingLogos = floatContainer.querySelectorAll('.floating-stack-logo');
			if (existingLogos.length >= maxStackLogos) {
				gsap.killTweensOf(existingLogos[0]);
				existingLogos[0].remove();
			}

			const tech = stackItems[Math.floor(Math.random() * stackItems.length)];
			const el = document.createElement('div');
			el.className = 'floating-stack-logo';
			el.style.setProperty('--stack-color', tech.color);
			el.innerHTML = `
				<span class="stack-logo-mark"><img src="${tech.icon}" alt="" loading="lazy"></span>
				<span class="stack-logo-label">${tech.label}</span>
			`;

			const left = 4 + Math.random() * 88;
			el.style.left = `${left}%`;

			const scale = 0.82 + Math.random() * 0.58;
			el.style.setProperty('--stack-scale', scale.toFixed(2));

			floatContainer.appendChild(el);

			const duration = 9 + Math.random() * 8;
			gsap.fromTo(el, {
				y: 0,
				opacity: 0,
				rotation: Math.random() * 18 - 9,
				scale: scale
			}, {
				y: -window.innerHeight - 1000,
				opacity: 1,
				rotation: `+=${Math.random() * 24 - 12}`,
				duration: duration,
				ease: "none",
				onComplete: () => {
					el.remove();
				}
			});
		}

		// Only spawn images when card-1 is visible (saves bandwidth + CPU)
		let spawnInterval = null;
		let card1Visible = false;
		let burstTimeouts = [];

		function clearStackLogoSpawns() {
			if (spawnInterval) {
				clearInterval(spawnInterval);
				spawnInterval = null;
			}

			burstTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
			burstTimeouts = [];

			floatContainer.querySelectorAll('.floating-stack-logo').forEach(logo => {
				gsap.killTweensOf(logo);
				logo.remove();
			});
		}

		const card1Observer = new IntersectionObserver((entries) => {
			entries.forEach(entry => {
				card1Visible = entry.isIntersecting;
				if (entry.isIntersecting && !spawnInterval) {
					// Initial burst
					for (let i = 0; i < 6; i++) {
						burstTimeouts.push(setTimeout(spawnStackLogo, i * 700));
					}
					spawnInterval = setInterval(spawnStackLogo, 1500);
				} else if (!entry.isIntersecting) {
					clearStackLogoSpawns();
				}
			});
		}, { threshold: 0.05 });

		card1Observer.observe(card1);
		document.addEventListener('visibilitychange', () => {
			if (document.hidden) clearStackLogoSpawns();
		});
	}

	// --- HERO EYE TRACKING SCRIPT ---
	const pupilLayers = document.querySelectorAll('.hero .layer-2');
	if (pupilLayers.length > 0) {
		let mouseTargetX = 0;
		let mouseTargetY = 0;
		let mouseX = 0;
		let mouseY = 0;

		window.addEventListener('mousemove', (e) => {
			mouseTargetX = (e.clientX / window.innerWidth) * 2 - 1;
			mouseTargetY = (e.clientY / window.innerHeight) * 2 - 1;
		});

		window.addEventListener('touchmove', (e) => {
			if (e.touches.length > 0) {
				mouseTargetX = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
				mouseTargetY = (e.touches[0].clientY / window.innerHeight) * 2 - 1;
			}
		});

		function animateHero() {
			mouseX += (mouseTargetX - mouseX) * 0.2;
			mouseY += (mouseTargetY - mouseY) * 0.2;

			let currentPupilX = 0;

			if (mouseX < 0) {
				const pupilMaxOffsetLeft = 45;
				currentPupilX = mouseX * pupilMaxOffsetLeft;
			} else {
				const pupilMaxOffsetRight = 45;
				currentPupilX = mouseX * pupilMaxOffsetRight;
			}

			const pupilMaxOffsetY = 25;
			const currentPupilY = mouseY * pupilMaxOffsetY;

			pupilLayers.forEach((layer) => {
				layer.style.transform = `translate3d(${currentPupilX}px, ${currentPupilY}px, 0)`;
			});

			requestAnimationFrame(animateHero);
		}

		pupilLayers.forEach((layer) => {
			layer.style.transform = 'translate3d(0px, 0px, 0)';
		});
		animateHero();
	}


	// Helper to calculate absolute top offset of any element, bypassing position: sticky and transform shifts
	function getAbsoluteOffsetTop(el) {
		let top = 0;
		while (el) {
			top += el.offsetTop || 0;
			el = el.offsetParent;
		}
		return top;
	}

	// --- GLASS NAV HOVER SLIDER SCRIPT ---
	const glassNav = document.querySelector('.glass-nav');
	const navHoverBg = document.querySelector('.nav-hover-bg');
	const navLinks = document.querySelectorAll('.glass-nav a.nav-link');
	const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');

	if (glassNav && navHoverBg && navLinks.length > 0) {
		mobileMenuToggle?.addEventListener('click', () => {
			const isOpen = glassNav.classList.toggle('is-open');
			mobileMenuToggle.setAttribute('aria-expanded', String(isOpen));
			mobileMenuToggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
		});

		navLinks.forEach(link => {
			link.addEventListener('mouseenter', function () {
				// Calculate position relative to the main nav container
				const linkRect = this.getBoundingClientRect();
				const navRect = glassNav.getBoundingClientRect();

				const left = linkRect.left - navRect.left;
				const top = linkRect.top - navRect.top;

				navHoverBg.style.width = `${linkRect.width}px`;
				navHoverBg.style.height = `${linkRect.height}px`;
				navHoverBg.style.transform = `translate(${left}px, ${top}px)`;
				navHoverBg.style.opacity = '1';
			});
		});

		// Attach smooth scrolling to all local anchor links in the nav, including logo
		const allNavLinks = document.querySelectorAll('.glass-nav a[href^="#"]');
		allNavLinks.forEach(link => {
			link.addEventListener('click', function (e) {
				e.preventDefault();
				
				// Update active state class ONLY for text links (.nav-link)
				if (this.classList.contains('nav-link')) {
					navLinks.forEach(nav => nav.classList.remove('active'));
					this.classList.add('active');
				}

				glassNav.classList.remove('is-open');
				mobileMenuToggle?.setAttribute('aria-expanded', 'false');
				mobileMenuToggle?.setAttribute('aria-label', 'Open navigation menu');

				const targetId = this.getAttribute('href');
				const targetEl = document.querySelector(targetId);
				if (targetEl) {
					const targetY = getScrollTargetY(targetId);
					if (targetY === null) return;

					gsap.killTweensOf(window);
					gsap.to(window, {
						scrollTo: { y: targetY, autoKill: true },
						duration: targetId === '#hero-section' ? 0.35 : (desktopMotion ? 0.65 : 0.38),
						ease: "power3.out",
						overwrite: true
					});
				}
			});
		});

		glassNav.addEventListener('mouseleave', function () {
			navHoverBg.style.opacity = '0';
		});
	}

	// --- SCROLL STORYBAR ---
	const storybar = document.querySelector('.scroll-storybar');
	const storyFill = document.querySelector('.scroll-storybar-fill');
	const storyThumb = document.querySelector('.scroll-storybar-thumb');
	const storyIndex = document.getElementById('scrollStoryIndex');
	const storyTitle = document.getElementById('scrollStoryTitle');
	const storySections = [
		{ id: 'hero-section', index: '01', title: 'Intro Hero' },
		{ id: 'i-can-section', index: '02', title: 'I can' },
		{ id: 'card-4', index: '03', title: 'Capabilities' },
		{ id: 'card-3', index: '04', title: 'Projects' },
		{ id: 'card-upgrade', index: '05', title: 'Education' },
		{ id: 'card-1', index: '06', title: 'Stack' },
		{ id: 'about', index: '07', title: 'Contact' }
	]
		.map(section => ({ ...section, el: document.getElementById(section.id) }))
		.filter(section => section.el);

	if (storybar && storyFill && storyThumb && storySections.length) {
		let storyRaf = 0;
		let activeStoryId = '';

		const updateStorybar = () => {
			storyRaf = 0;
			const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
			const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
			storybar.style.setProperty('--scroll-progress', progress.toFixed(4));
			storyFill.style.transform = `scaleY(${progress})`;
			storyThumb.style.transform = `translate3d(-50%, calc(${(progress * 100).toFixed(2)}% - 50%), 0)`;

			let active = storySections[0];
			const threshold = window.innerHeight * 0.46;
			storySections.forEach(section => {
				if (section.el.getBoundingClientRect().top <= threshold) {
					active = section;
				}
			});

			if (active && active.id !== activeStoryId) {
				activeStoryId = active.id;
				if (storyIndex) storyIndex.textContent = active.index;
				if (storyTitle) storyTitle.textContent = active.title;
				storybar.classList.remove('is-popping');
				void storybar.offsetWidth;
				storybar.classList.add('is-popping');
			}
		};

		const requestStorybarUpdate = () => {
			if (storyRaf) return;
			storyRaf = requestAnimationFrame(updateStorybar);
		};

		updateStorybar();
		window.addEventListener('scroll', requestStorybarUpdate, { passive: true });
		window.addEventListener('resize', requestStorybarUpdate);
	}

	// --- FLIPBOOK PAGE FLIP SCRIPT ---
	const flipbook = document.getElementById('flipbook');
	const flipIndicator = document.getElementById('flipIndicator');
	if (flipbook && flipIndicator) {
		const leaves = flipbook.querySelectorAll('.flip-leaf');
		const totalLeaves = leaves.length;
		let currentFlipped = 0; // how many leaves are flipped

		const pageLabels = ['Capabilities', 'AI & ML', 'Web Development', 'App Development', 'UI/UX Design', 'Database Management', 'Back'];

		function updateIndicator() {
			flipIndicator.textContent = pageLabels[currentFlipped] || '';

			// Handle dynamic centring states
			flipbook.classList.remove('state-cover', 'state-open', 'state-back');

			if (currentFlipped === 0) {
				flipbook.classList.add('state-cover');
			} else if (currentFlipped === totalLeaves) {
				flipbook.classList.add('state-back');
			} else {
				flipbook.classList.add('state-open');
			}
		}

		flipbook.addEventListener('click', function (e) {
			const rect = flipbook.getBoundingClientRect();
			const isOpenSpread = currentFlipped > 0 && currentFlipped < totalLeaves;
			const spineX = rect.left;
			const isForwardClick = isOpenSpread
				? e.clientX >= spineX
				: e.clientX > rect.left + rect.width / 2;

			if (isForwardClick) {
				// Click right side → flip forward
				if (currentFlipped < totalLeaves) {
					leaves[currentFlipped].classList.add('flipped');
					currentFlipped++;
					updateIndicator();
				}
			} else {
				// Click left side → flip backward
				if (currentFlipped > 0) {
					currentFlipped--;
					leaves[currentFlipped].classList.remove('flipped');
					updateIndicator();
				}
			}
		});

		updateIndicator();
	}

	// --- INFINITE COVER FLOW FOR CARD-3 ---
	const card3 = document.querySelector("#card-3");
	const projectStickyShowcase = card3?.querySelector('.project-sticky-showcase');
	const useStickyProjectCards = desktopMotion
		&& projectStickyShowcase
		&& window.getComputedStyle(projectStickyShowcase).display !== 'none';
	const projectStickyCards = useStickyProjectCards ? gsap.utils.toArray('#card-3 .project-sticky-card') : [];

	if (desktopMotion && card3 && projectStickyCards.length > 0) {
		gsap.set(projectStickyCards, {
			transformOrigin: '50% 42%',
			willChange: 'transform'
		});
		gsap.set(projectStickyCards[0], { yPercent: 0, scale: 1, rotation: 0 });
		projectStickyCards.slice(1).forEach(card => {
			gsap.set(card, { yPercent: 104, scale: 1, rotation: 0 });
		});

		const projectTimeline = gsap.timeline({
			scrollTrigger: {
				trigger: card3,
				start: 'top -82%',
				end: () => `+=${window.innerHeight * (projectStickyCards.length - 1)}`,
				scrub: true,
				invalidateOnRefresh: true,
				fastScrollEnd: true
			}
		});

		for (let i = 0; i < projectStickyCards.length - 1; i += 1) {
			const currentCard = projectStickyCards[i];
			const nextCard = projectStickyCards[i + 1];

			projectTimeline
				.to(currentCard, {
					scale: 0.7,
					rotation: 5,
					duration: 1,
					ease: 'none'
				}, i)
				.to(nextCard, {
					yPercent: 0,
					duration: 1,
					ease: 'none'
				}, i);
		}
	}

	const boxesContainer = card3?.querySelector(".boxes");
	const boxes = gsap.utils.toArray('#card-3 .box');

	if (desktopMotion && !projectStickyCards.length && card3 && boxesContainer && boxes.length > 0) {
		gsap.set(boxes, { yPercent: -50, display: 'block' });

		const duration = 1;
		const stagger = duration / boxes.length;
		const offset = 0;
		const loop = gsap.timeline({ paused: true, repeat: -1, ease: 'none' });
		const shifts = [...boxes, ...boxes, ...boxes];

		shifts.forEach((box, index) => {
			const boxTl = gsap.timeline()
				.set(box, {
					xPercent: 250,
					rotateY: -50,
					opacity: 0,
					scale: 0.5
				})
				.to(box, { opacity: 1, scale: 1, duration: 0.1 }, 0)
				.to(box, { opacity: 0, scale: 0.5, duration: 0.1 }, 0.9)
				.fromTo(box, { xPercent: 250 }, {
					xPercent: -350,
					duration: 1,
					immediateRender: false,
					ease: 'power1.inOut'
				}, 0)
				.fromTo(box, { rotateY: -50 }, {
					rotateY: 50,
					immediateRender: false,
					duration: 1,
					ease: 'power4.inOut'
				}, 0)
				.to(box, {
					z: 100,
					scale: 1.25,
					duration: 0.1,
					repeat: 1,
					yoyo: true
				}, 0.4)
				.fromTo(box, { zIndex: 1 }, {
					zIndex: boxes.length,
					repeat: 1,
					yoyo: true,
					ease: 'none',
					duration: 0.5,
					immediateRender: false
				}, 0);

			loop.add(boxTl, index * stagger);
		});

		const cycleDuration = stagger * boxes.length;
		const startTime = cycleDuration + duration * 0.5 + offset;
		const loopHead = gsap.fromTo(loop,
			{ totalTime: startTime },
			{
				totalTime: `+=${cycleDuration}`,
				duration: 1,
				ease: 'none',
				repeat: -1,
				paused: true
			}
		);

		const playhead = { position: gsap.utils.wrap(0, loopHead.duration())(startTime) };
		const positionWrap = gsap.utils.wrap(0, loopHead.duration());
		const scrollToPosition = (position) => {
			const snapPosition = gsap.utils.snap(1 / boxes.length)(position);
			gsap.to(playhead, {
				position: snapPosition,
				duration: 0.5,
				ease: 'power3.out',
				onUpdate: () => loopHead.totalTime(positionWrap(playhead.position))
			});
		};

		const next = () => scrollToPosition(playhead.position - 1 / boxes.length);
		const prev = () => scrollToPosition(playhead.position + 1 / boxes.length);
		card3.querySelector('.next')?.addEventListener('click', next);
		card3.querySelector('.prev')?.addEventListener('click', prev);

		document.addEventListener('keydown', event => {
			const rect = card3.getBoundingClientRect();
			const inView = rect.top < window.innerHeight && rect.bottom > 0;
			if (!inView) return;
			if (event.code === 'ArrowLeft' || event.code === 'KeyA') next();
			if (event.code === 'ArrowRight' || event.code === 'KeyD') prev();
		});

		boxesContainer.addEventListener('click', event => {
			const box = event.target.closest('.box');
			if (!box) return;

			const target = boxes.indexOf(box);
			const current = gsap.utils.wrap(
				0,
				boxes.length,
				Math.round(boxes.length * positionWrap(playhead.position))
			);

			let bump = target - current;
			if (target > current && target - current > boxes.length * 0.5) {
				bump = (boxes.length - bump) * -1;
			}
			if (current > target && current - target > boxes.length * 0.5) {
				bump = boxes.length + bump;
			}
			scrollToPosition(playhead.position + bump * (1 / boxes.length));
		});

		if (typeof Draggable !== 'undefined') {
			Draggable.create('#card-3 .drag-proxy', {
				type: 'x',
				trigger: '#card-3 .boxes',
				onPress() {
					this.startOffset = playhead.position;
				},
				onDrag() {
					playhead.position = this.startOffset + (this.startX - this.x) * 0.001;
					loopHead.totalTime(positionWrap(playhead.position));
				},
				onDragEnd() {
					scrollToPosition(playhead.position);
				}
			});
		}

		loopHead.totalTime(positionWrap(playhead.position));
	}

	requestAnimationFrame(() => {
		ScrollTrigger.refresh();
	});

})


// --- HERO VIDEO PLAY/PAUSE LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
	const heroSection = document.getElementById('hero-section');
	const heroVideo = document.getElementById('hero-video');

	if (heroSection && heroVideo) {
		const videoObserver = new IntersectionObserver((entries) => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					heroVideo.play().catch(err => console.log('Video play error:', err));
				} else {
					heroVideo.pause();
				}
			});
		}, { threshold: 0.1 });

		videoObserver.observe(heroSection);
	}
	// --- TAB VISIBILITY BGM SMOOTH FADE OUT & FADE IN ---
	document.addEventListener('visibilitychange', () => {
		const isModalActive = false;

		// Explicitly kill any active volume tweens to prevent race conditions on quick tab switching
		gsap.killTweensOf(bgm);

		if (document.hidden) {
			// User moved to another tab or minimized the browser: fade out music smoothly
			if (bgmStarted && !isModalActive) {
				gsap.to(bgm, {
					volume: 0,
					duration: 1.0,
					ease: "power1.out",
					onComplete: () => {
						bgm.pause();
					}
				});
			}
		} else {
			// User returned to this tab: smoothly play and fade music back in
			if (bgmStarted && !isModalActive) {
				bgm.play().then(() => {
					gsap.to(bgm, {
						volume: 0.12, // Audible background volume level
						duration: 1.5,
						ease: "power1.inOut"
					});
				}).catch(err => console.log("BGM play failed on visibility change:", err));
			}
		}
	});
});
