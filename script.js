const navigationEntry = performance.getEntriesByType('navigation')[0];
const shouldResetScroll = navigationEntry?.type === 'reload';

if (shouldResetScroll && 'scrollRestoration' in history) {
	history.scrollRestoration = 'manual';
}

// --- CUSTOM GLOW CURSOR ---
const customCursor = document.querySelector('.custom-cursor');
const canUseCustomCursor = customCursor && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

if (canUseCustomCursor) {
	let cursorX = window.innerWidth / 2;
	let cursorY = window.innerHeight / 2;
	let cursorTargetX = cursorX;
	let cursorTargetY = cursorY;

	const moveCursor = () => {
		cursorX += (cursorTargetX - cursorX) * 0.28;
		cursorY += (cursorTargetY - cursorY) * 0.28;
		customCursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) translate(-50%, -50%)`;
		requestAnimationFrame(moveCursor);
	};

	window.addEventListener('mousemove', (event) => {
		cursorTargetX = event.clientX;
		cursorTargetY = event.clientY;
		customCursor.classList.add('is-visible');
	});

	document.addEventListener('mouseleave', () => {
		customCursor.classList.remove('is-visible');
	});

	document.addEventListener('mouseover', (event) => {
		const isInteractive = event.target.closest('a, button, input, textarea, select, [role="button"]');
		customCursor.classList.toggle('is-hovering', Boolean(isInteractive));
	});

	moveCursor();
}

// --- HERO WORD SHOVE EFFECT ---
const shoveContainers = document.querySelectorAll('[data-shove-text]');

if (shoveContainers.length > 0 && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
	const shoveWords = [];
	const shoveRadius = 132;
	const shoveStrength = 34;

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

	const resetShove = () => {
		shoveWords.forEach((word) => {
			word.style.transform = 'translate3d(0, 0, 0)';
		});
	};

	window.addEventListener('mousemove', updateShove);
	document.querySelector('.hero')?.addEventListener('mouseleave', resetShove);
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
	window.removeEventListener('click', startBGM);
	window.removeEventListener('keydown', startBGM);
	window.removeEventListener('scroll', startBGM);
}

// 1. Try playing immediately on script load
startBGM();

// 2. Try playing on window load (website fully loaded)
window.addEventListener('load', startBGM);

// 3. Fallbacks: Listen for user gestures (click, keydown, scroll) to unblock autoplay
window.addEventListener('click', startBGM);
window.addEventListener('keydown', startBGM);
window.addEventListener('scroll', startBGM);

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

	gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)
	if (shouldResetScroll) {
		ScrollTrigger.clearScrollMemory('manual')
	}

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
						scrub: true,
						pin: card,
						pinSpacing: false,
					},
				},
			)

			gsap.to(cardInner, {
				'--after-opacity': 1,
				scrollTrigger: {
					trigger: cards[index + 1],
					start: 'top 75%',
					end: 'top -25%',
					scrub: true,
				},
			})
		}
	})

	// --- LAYER 4 FLOAT ANIMATION ---
	if (document.querySelector('.hero .layer-4')) {
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
		// You previously changed this to 0.2 to match!
		mouseX += (mouseTargetX - mouseX) * 0.2;
		mouseY += (mouseTargetY - mouseY) * 0.2;

		if (pupilLayers.length > 0) {
			let currentPupilX = 0;

			// Separate the boundaries for moving left vs moving right!
			// If moving left is less smooth, adjusting the left offset below will fix it.
			if (mouseX < 0) {
				const pupilMaxOffsetLeft = 45; // Adjust this if the left movement clips or feels abrupt
				currentPupilX = mouseX * pupilMaxOffsetLeft;
			} else {
				const pupilMaxOffsetRight = 45; // Your previous max offset
				currentPupilX = mouseX * pupilMaxOffsetRight;
			}

			const pupilMaxOffsetY = 25;
			const currentPupilY = mouseY * pupilMaxOffsetY;

			pupilLayers.forEach((layer) => {
				layer.style.transform = `translate3d(${currentPupilX}px, ${currentPupilY}px, 0)`;
			});
		}
		requestAnimationFrame(animateHero);
	}

	pupilLayers.forEach((layer) => {
		layer.style.transform = 'translate3d(0px, 0px, 0)';
	});
	animateHero();



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

	if (glassNav && navHoverBg && navLinks.length > 0) {
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

				const targetId = this.getAttribute('href');
				const targetEl = document.querySelector(targetId);
				if (targetEl) {
					const targetY = getAbsoluteOffsetTop(targetEl);
					
					gsap.to(window, {
						scrollTo: { y: targetY, autoKill: false },
						duration: 1.5,
						ease: "power2.inOut"
					});
				}
			});
		});

		glassNav.addEventListener('mouseleave', function () {
			navHoverBg.style.opacity = '0';
		});
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
			const clickX = e.clientX - rect.left;
			const half = rect.width / 2;

			if (clickX > half) {
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
	const boxesContainer = card3?.querySelector(".boxes");
	const boxes = gsap.utils.toArray('#card-3 .box');

	if (card3 && boxesContainer && boxes.length > 0) {
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

		const playhead = { position: 0 };
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

		loopHead.totalTime(startTime);
		gsap.to(playhead, {
			scrollTrigger: {
				trigger: card3,
				start: 'top bottom',
				end: 'bottom top',
				scrub: 1
			},
			position: `+=${loopHead.duration() * 0.3}`,
			ease: 'none',
			onUpdate: () => loopHead.totalTime(positionWrap(playhead.position))
		});
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
