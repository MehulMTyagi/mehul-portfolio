const navigationEntry = performance.getEntriesByType('navigation')[0];
const shouldResetScroll = navigationEntry?.type === 'reload';

if (shouldResetScroll && 'scrollRestoration' in history) {
	history.scrollRestoration = 'manual';
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
	// --- SAVOIR FAIRE LP FOR CARD-2 ---
	const card2 = document.querySelector("#card-2");
	const itemsContainer = card2?.querySelector(".items-container");

	if (card2 && itemsContainer) {
		const webpAssets = [
			{ name: "appenure suhail submission.webp", ratio: "9:16" },
			{ name: "AQPpsBSS6Wy7caQBBrSfr_d9sKi4u0nyUbelDE9b1RUYexHoEn672ZaHhWqZWObSFQlddb9M4cqBA0oY0siQWP9B.webp", ratio: "16:9" },
			{ name: "crc v1 THURDAY.webp", ratio: "16:9" },
			{ name: "FLAGSHIP CRC.webp", ratio: "16:9" },
			{ name: "jacob final.webp", ratio: "16:9" },
			{ name: "shorts prompt OT (1).webp", ratio: "9:16" },
			{ name: "shorts prompt OT.webp", ratio: "9:16" },
			{ name: "SIR MAIN.webp", ratio: "9:16" },
			{ name: "Take a look at my Canva design!.webp", ratio: "16:9" }
		];

		card2.addEventListener("click", function (event) {
			let container = document.createElement("div");

			const randomAsset = webpAssets[Math.floor(Math.random() * webpAssets.length)];
			const isPortrait = randomAsset.ratio === "9:16";
			const elementWidth = isPortrait ? 360 : 640;
			const className = isPortrait ? "portrait" : "landscape";

			container.innerHTML = `<div class="img-container ${className}">
										 <img src="card 2 assest/${randomAsset.name}" alt="" />
									   </div>`;

			const appendedElement = container.firstChild;
			itemsContainer.appendChild(appendedElement);

			const rect = card2.getBoundingClientRect();
			appendedElement.style.left = `${event.clientX - rect.left - elementWidth / 2}px`;
			appendedElement.style.top = `${event.clientY - rect.top}px`;
			const randomRotation = Math.random() * 10 - 5;

			gsap.set(appendedElement, {
				scale: 0,
				rotation: randomRotation,
				transformOrigin: "center",
			});

			const tl = gsap.timeline();
			const randomScale = Math.random() * 0.5 + 0.5;
			tl.to(appendedElement, {
				scale: randomScale,
				duration: 0.5,
				delay: 0.1,
			});

			tl.to(
				appendedElement,
				{
					y: () => `-=500`,
					opacity: 1,
					duration: 4,
					ease: "none",
				},
				"<"
			).to(
				appendedElement,
				{
					opacity: 0,
					duration: 1,
					onComplete: () => {
						if (appendedElement.parentNode) {
							appendedElement.parentNode.removeChild(appendedElement);
						}
					},
				},
				"-=0.5"
			);
		});
	}

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

	// --- SHOW REEL VIDEO MODAL SCRIPT ---
	const showReelBtn = document.querySelector('.show-reel-btn[data-open-showreel="true"]');
	const videoModal = document.getElementById('videoModal');
	const closeVideoBtn = document.querySelector('.close-video-btn');
	const videoOverlay = document.querySelector('.video-modal-overlay');
	const showreelVideo = document.getElementById('showreelVideo');

	if (showReelBtn && videoModal) {
		showReelBtn.addEventListener('click', (e) => {
			e.preventDefault();

			// Fire confetti when button is clicked
			if (typeof confetti === 'function') {
				const rect = showReelBtn.getBoundingClientRect();
				const x = (rect.left + rect.width / 2) / window.innerWidth;
				const y = (rect.top + rect.height / 2) / window.innerHeight;
				confetti({
					particleCount: 100,
					spread: 70,
					origin: { x, y },
					colors: ['#4285f4', '#ea4335', '#fbbc04', '#34a853']
				});
			}

			// Fade out background music
			gsap.to(bgm, {
				volume: 0,
				duration: 0.8,
				ease: "power1.out",
				onComplete: () => bgm.pause()
			});

			// Show modal and lazy-load showreel video with sound
			videoModal.classList.add('active');
			if (showreelVideo) {
				// Lazy-load: set source only when modal opens (saves ~77MB on page load)
				const sourceEl = showreelVideo.querySelector('source');
				if (sourceEl && !showreelVideo.src) {
					showreelVideo.src = sourceEl.getAttribute('src');
					showreelVideo.load();
				}
				showreelVideo.currentTime = 0;
				showreelVideo.muted = false;
				showreelVideo.play().catch(err => console.log("Showreel play failed:", err));
			}
		});

		const closeModal = () => {
			videoModal.classList.remove('active');
			// Pause and reset the showreel video, remove src to free memory
			if (showreelVideo) {
				showreelVideo.pause();
				showreelVideo.currentTime = 0;
				showreelVideo.removeAttribute('src');
				showreelVideo.load(); // Reset the video element to free memory
			}
			// Resume background music with fade-in
			if (bgmStarted) {
				bgm.play().then(() => {
					gsap.to(bgm, {
						volume: 0.12,
						duration: 1.5,
						ease: "power1.inOut"
					});
				}).catch(err => console.log("BGM resume failed:", err));
			}
		};

		closeVideoBtn.addEventListener('click', closeModal);
		videoOverlay.addEventListener('click', closeModal);
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

		const DURATION = 1;
		const STAGGER = DURATION / boxes.length;
		const OFFSET = 0;

		const LOOP = gsap.timeline({
			paused: true,
			repeat: -1,
			ease: 'none'
		});

		const SHIFTS = [...boxes, ...boxes, ...boxes];

		SHIFTS.forEach((BOX, index) => {
			const BOX_TL = gsap.timeline()
				.set(BOX, {
					xPercent: 250,
					rotateY: -50,
					opacity: 0,
					scale: 0.5
				})
				// Opacity & Scale
				.to(BOX, {
					opacity: 1,
					scale: 1,
					duration: 0.1
				}, 0)
				.to(BOX, {
					opacity: 0,
					scale: 0.5,
					duration: 0.1
				}, 0.9)
				// Panning
				.fromTo(BOX, {
					xPercent: 250
				}, {
					xPercent: -350,
					duration: 1,
					immediateRender: false,
					ease: 'power1.inOut'
				}, 0)
				// Rotations
				.fromTo(BOX, {
					rotateY: -50
				}, {
					rotateY: 50,
					immediateRender: false,
					duration: 1,
					ease: 'power4.inOut'
				}, 0)
				// Scale & Z
				.to(BOX, {
					z: 100,
					scale: 1.25,
					duration: 0.1,
					repeat: 1,
					yoyo: true
				}, 0.4)
				.fromTo(BOX, {
					zIndex: 1
				}, {
					zIndex: boxes.length,
					repeat: 1,
					yoyo: true,
					ease: 'none',
					duration: 0.5,
					immediateRender: false
				}, 0);

			LOOP.add(BOX_TL, index * STAGGER);
		});

		const CYCLE_DURATION = STAGGER * boxes.length;
		const START_TIME = CYCLE_DURATION + DURATION * 0.5 + OFFSET;

		const LOOP_HEAD = gsap.fromTo(LOOP, 
			{ totalTime: START_TIME },
			{
				totalTime: `+=${CYCLE_DURATION}`,
				duration: 1,
				ease: 'none',
				repeat: -1,
				paused: true
			}
		);

		const PLAYHEAD = { position: 0 };
		const POSITION_WRAP = gsap.utils.wrap(0, LOOP_HEAD.duration());

		const scrollToPosition = (position) => {
			const SNAP_POS = gsap.utils.snap(1 / boxes.length)(position);
			gsap.to(PLAYHEAD, {
				position: SNAP_POS,
				duration: 0.5,
				ease: 'power3.out',
				onUpdate: () => {
					LOOP_HEAD.totalTime(POSITION_WRAP(PLAYHEAD.position));
				}
			});
		};

		// Navigation buttons
		const NEXT = () => scrollToPosition(PLAYHEAD.position - 1 / boxes.length);
		const PREV = () => scrollToPosition(PLAYHEAD.position + 1 / boxes.length);

		const nextBtn = card3.querySelector('.next');
		const prevBtn = card3.querySelector('.prev');
		if (nextBtn) nextBtn.addEventListener('click', NEXT);
		if (prevBtn) prevBtn.addEventListener('click', PREV);

		// Keyboard navigation when card-3 is in view
		document.addEventListener('keydown', event => {
			const rect = card3.getBoundingClientRect();
			const inView = rect.top < window.innerHeight && rect.bottom > 0;
			if (inView) {
				if (event.code === 'ArrowLeft' || event.code === 'KeyA') NEXT();
				if (event.code === 'ArrowRight' || event.code === 'KeyD') PREV();
			}
		});

		// Click on a box to center it, or open in fullscreen if already centered
		boxesContainer.addEventListener('click', e => {
			const BOX = e.target.closest('.box');
			if (BOX) {
				let TARGET = boxes.indexOf(BOX);
				let CURRENT = gsap.utils.wrap(
					0,
					boxes.length,
					Math.round(boxes.length * POSITION_WRAP(PLAYHEAD.position))
				);

				if (TARGET === CURRENT) {
					// Open in fullscreen with audio!
					const video = BOX.querySelector('video');
					if (video) {
						// Save current scroll position to prevent browser scroll-jump glitch on exit
						const savedScrollY = window.scrollY;

						// Temporarily unmute and show controls for fullscreen
						video.muted = false;
						video.controls = true;

						// Fade out background music
						if (bgmStarted && !bgm.paused) {
							gsap.to(bgm, {
								volume: 0,
								duration: 0.5,
								ease: "power1.out",
								onComplete: () => bgm.pause()
							});
						}

						// Attempt to enter fullscreen
						const enterFullscreen = video.requestFullscreen || 
											    video.webkitRequestFullscreen || 
											    video.mozRequestFullScreen || 
											    video.msRequestFullscreen;
						
						if (enterFullscreen) {
							enterFullscreen.call(video).catch(err => {
								console.error("Error attempting to enable fullscreen:", err);
							});
						}

						// Handle exiting fullscreen to mute, hide controls, restore scroll, and resume BGM
						const onFullscreenChange = () => {
							const fullscreenElement = document.fullscreenElement || 
													  document.webkitFullscreenElement || 
													  document.mozFullScreenElement || 
													  document.msFullscreenElement;
							if (fullscreenElement !== video) {
								video.muted = true;
								video.controls = false;
								video.blur(); // Remove focus to prevent browser from scroll-jumping to the element

								// Lock scroll position to savedScrollY to prevent browser scroll-jump glitch on exit
								const lockScroll = () => {
									window.scrollTo(0, savedScrollY);
								};
								window.addEventListener('scroll', lockScroll);

								// Restore scroll position immediately
								window.scrollTo(0, savedScrollY);

								// Unlock scroll after 600ms and refresh ScrollTrigger
								setTimeout(() => {
									window.removeEventListener('scroll', lockScroll);
									window.scrollTo(0, savedScrollY);
									if (typeof ScrollTrigger !== 'undefined') {
										ScrollTrigger.refresh();
									}
								}, 600);

								// Resume background music with fade-in
								if (bgmStarted) {
									bgm.play().then(() => {
										gsap.to(bgm, {
											volume: 0.12,
											duration: 1.0,
											ease: "power1.inOut"
										});
									}).catch(err => console.log("BGM resume failed:", err));
								}

								// Remove listeners
								document.removeEventListener('fullscreenchange', onFullscreenChange);
								document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
								document.removeEventListener('mozfullscreenchange', onFullscreenChange);
								document.removeEventListener('MSFullscreenChange', onFullscreenChange);
							}
						};

						document.addEventListener('fullscreenchange', onFullscreenChange);
						document.addEventListener('webkitfullscreenchange', onFullscreenChange);
						document.addEventListener('mozfullscreenchange', onFullscreenChange);
						document.addEventListener('MSFullscreenChange', onFullscreenChange);
					}
				} else {
					// Center the clicked card
					let BUMP = TARGET - CURRENT;
					if (TARGET > CURRENT && TARGET - CURRENT > boxes.length * 0.5) {
						BUMP = (boxes.length - BUMP) * -1;
					}
					if (CURRENT > TARGET && CURRENT - TARGET > boxes.length * 0.5) {
						BUMP = boxes.length + BUMP;
					}
					scrollToPosition(PLAYHEAD.position + BUMP * (1 / boxes.length));
				}
			}
		});

		// Dragging via Draggable
		if (typeof Draggable !== 'undefined') {
			Draggable.create('#card-3 .drag-proxy', {
				type: 'x',
				trigger: '#card-3 .boxes',
				onPress() {
					this.startOffset = PLAYHEAD.position;
				},
				onDrag() {
					PLAYHEAD.position = this.startOffset + (this.startX - this.x) * 0.001;
					LOOP_HEAD.totalTime(POSITION_WRAP(PLAYHEAD.position));
				},
				onDragEnd() {
					scrollToPosition(PLAYHEAD.position);
				}
			});
		}

		// Initial animation setup
		LOOP_HEAD.totalTime(START_TIME);

		// Subtle scroll-driven movement
		gsap.to(PLAYHEAD, {
			scrollTrigger: {
				trigger: card3,
				start: 'top bottom',
				end: 'bottom top',
				scrub: 1
			},
			position: `+=${LOOP_HEAD.duration() * 0.3}`,
			ease: 'none',
			onUpdate: () => {
				LOOP_HEAD.totalTime(POSITION_WRAP(PLAYHEAD.position));
			}
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



	// --- CREEPY BUTTON INTERACTIVE EYE-TRACKING ---
	const creepyBtn = document.querySelector('.creepy-btn');
	if (creepyBtn) {
		const eyesContainer = creepyBtn.querySelector('.creepy-btn__eyes');
		const pupils = creepyBtn.querySelectorAll('.creepy-btn__pupil');

		const updateEyes = (e) => {
			if (!eyesContainer || pupils.length === 0) return;

			// Handle touch or mouse event coordinate vectors
			const userEvent = e.touches ? e.touches[0] : e;
			
			// Center of eyes container relative to client viewport
			const eyesRect = eyesContainer.getBoundingClientRect();
			const eyesCenterX = eyesRect.left + eyesRect.width / 2;
			const eyesCenterY = eyesRect.top + eyesRect.height / 2;

			// Cursor coordinates relative to client viewport
			const cursorX = userEvent.clientX;
			const cursorY = userEvent.clientY;

			// Calculate vector difference
			const dx = cursorX - eyesCenterX;
			const dy = cursorY - eyesCenterY;

			// Compute eye rotation angle and total distance
			const angle = Math.atan2(-dy, dx) + Math.PI / 2;
			const distance = Math.hypot(dx, dy);

			// Define maximum vision track bounds
			const visionRangeX = 180;
			const visionRangeY = 75;

			let x = (Math.sin(angle) * distance) / visionRangeX;
			let y = (Math.cos(angle) * distance) / visionRangeY;

			// Clamp pupil coordinates to realistic bounds
			x = Math.max(-0.5, Math.min(0.5, x));
			y = Math.max(-0.5, Math.min(0.5, y));

			// Translate offset from absolute center
			const translateX = `${-50 + x * 50}%`;
			const translateY = `${-50 + y * 50}%`;

			pupils.forEach(pupil => {
				pupil.style.transform = `translate(${translateX}, ${translateY})`;
			});
		};

		// Continuously track mouse movement and touch gestures
		document.addEventListener('mousemove', updateEyes);
		document.addEventListener('touchmove', updateEyes);
	}

	// --- TAB VISIBILITY BGM SMOOTH FADE OUT & FADE IN ---
	document.addEventListener('visibilitychange', () => {
		const videoModal = document.getElementById('videoModal');
		const isModalActive = videoModal && videoModal.classList.contains('active');

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

			// Smoothly pause showreel video if it's currently active and playing
			const showreelVideo = document.getElementById('showreelVideo');
			if (isModalActive && showreelVideo && !showreelVideo.paused) {
				showreelVideo.pause();
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
