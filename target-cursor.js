(() => {
	const targetSelector = [
		'.cursor-target',
		'a',
		'button',
		'input',
		'textarea',
		'select',
		'summary',
		'[role="button"]',
		'#card-3 .box'
	].join(', ');

	const config = {
		hoverDuration: 0.16,
		parallaxOn: false,
		cursorColor: '#b2eaff',
		cursorColorOnTarget: '#00d5fb',
		borderWidth: 3,
		cornerSize: 12
	};

	const defaultCornerPositions = [
		{ x: -18, y: -18 },
		{ x: 6, y: -18 },
		{ x: 6, y: 6 },
		{ x: -18, y: 6 }
	];

	function initTargetCursor() {
		const cursor = document.querySelector('.target-cursor-wrapper');
		if (!cursor || window.matchMedia('(hover: none), (pointer: coarse)').matches) return;

		const dot = cursor.querySelector('.target-cursor-dot');
		const corners = Array.from(cursor.querySelectorAll('.target-cursor-corner'));
		if (!dot || corners.length !== 4 || typeof window.gsap === 'undefined') return;

		document.documentElement.classList.add('has-custom-cursor');
		document.documentElement.classList.add('has-target-cursor');

		let activeTarget = null;
		let currentLeaveHandler = null;
		let resumeTimeout = null;
		let targetCornerPositions = null;
		let cursorVisible = false;
		let pointerFrame = 0;
		let latestX = window.innerWidth / 2;
		let latestY = window.innerHeight / 2;
		const activeStrength = { value: 0 };

		gsap.set(cursor, {
			xPercent: -50,
			yPercent: -50,
			x: window.innerWidth / 2,
			y: window.innerHeight / 2
		});
		gsap.set(corners, {
			borderColor: config.cursorColor
		});
		gsap.set(dot, {
			backgroundColor: config.cursorColor
		});
		resetCorners(0);

		const setCursorX = gsap.quickSetter(cursor, 'x', 'px');
		const setCursorY = gsap.quickSetter(cursor, 'y', 'px');
		const setCornerX = corners.map(corner => gsap.quickSetter(corner, 'x', 'px'));
		const setCornerY = corners.map(corner => gsap.quickSetter(corner, 'y', 'px'));

		function resetCorners(duration = 0.28) {
			corners.forEach((corner, index) => {
				gsap.to(corner, {
					x: defaultCornerPositions[index].x,
					y: defaultCornerPositions[index].y,
					duration,
					ease: duration ? 'power3.out' : 'none',
					overwrite: 'auto'
				});
			});
		}

		function setCursorColor(color, duration = 0.15) {
			gsap.to(corners, {
				borderColor: color,
				duration,
				ease: 'power2.out',
				overwrite: 'auto'
			});
			gsap.to(dot, {
				backgroundColor: color,
				duration,
				ease: 'power2.out',
				overwrite: 'auto'
			});
		}

		function moveCursor(x, y) {
			if (!cursorVisible) {
				cursor.classList.add('is-visible');
				cursorVisible = true;
			}
			latestX = x;
			latestY = y;

			if (pointerFrame) return;
			pointerFrame = requestAnimationFrame(() => {
				pointerFrame = 0;
				setCursorX(latestX);
				setCursorY(latestY);
			});
		}

		function updateTargetCorners() {
			if (!activeTarget) return;
			const rect = activeTarget.getBoundingClientRect();
			targetCornerPositions = [
				{ x: rect.left - config.borderWidth, y: rect.top - config.borderWidth },
				{ x: rect.right + config.borderWidth - config.cornerSize, y: rect.top - config.borderWidth },
				{ x: rect.right + config.borderWidth - config.cornerSize, y: rect.bottom + config.borderWidth - config.cornerSize },
				{ x: rect.left - config.borderWidth, y: rect.bottom + config.borderWidth - config.cornerSize }
			];
		}

		function ticker() {
			if (!targetCornerPositions || !activeTarget) return;

			updateTargetCorners();
			const cursorX = Number(gsap.getProperty(cursor, 'x')) || 0;
			const cursorY = Number(gsap.getProperty(cursor, 'y')) || 0;
			const strength = Math.max(0.12, activeStrength.value);

			corners.forEach((corner, index) => {
				const currentX = Number(gsap.getProperty(corner, 'x')) || 0;
				const currentY = Number(gsap.getProperty(corner, 'y')) || 0;
				const targetX = targetCornerPositions[index].x - cursorX;
				const targetY = targetCornerPositions[index].y - cursorY;

				setCornerX[index](currentX + (targetX - currentX) * strength);
				setCornerY[index](currentY + (targetY - currentY) * strength);
			});
		}

		function cleanupTarget(target) {
			if (currentLeaveHandler && target) {
				target.removeEventListener('mouseleave', currentLeaveHandler);
			}
			currentLeaveHandler = null;
		}

		function leaveActiveTarget() {
			if (!activeTarget) return;

			gsap.ticker.remove(ticker);
			cleanupTarget(activeTarget);
			activeTarget = null;
			targetCornerPositions = null;
			cursor.classList.remove('is-on-target');

			gsap.killTweensOf(activeStrength);
			gsap.set(activeStrength, { value: 0 });
			setCursorColor(config.cursorColor);
			resetCorners(0.28);

			if (resumeTimeout) clearTimeout(resumeTimeout);
			resumeTimeout = null;
		}

		function enterTarget(target) {
			if (!target || activeTarget === target) return;
			if (activeTarget) leaveActiveTarget();
			if (resumeTimeout) {
				clearTimeout(resumeTimeout);
				resumeTimeout = null;
			}

			activeTarget = target;
			cursor.classList.add('is-on-target');
			gsap.set(cursor, { rotation: 0 });
			setCursorColor(config.cursorColorOnTarget);
			updateTargetCorners();

			gsap.ticker.add(ticker);
			gsap.to(activeStrength, {
				value: 1,
				duration: config.hoverDuration,
				ease: 'power2.out',
				overwrite: true
			});

			currentLeaveHandler = leaveActiveTarget;
			target.addEventListener('mouseleave', currentLeaveHandler);
		}

		window.addEventListener('pointermove', event => {
			moveCursor(event.clientX, event.clientY);
		}, { passive: true });

		window.addEventListener('mousedown', () => {
			gsap.to(dot, { scale: 0.72, duration: 0.18, ease: 'power2.out' });
			gsap.to(cursor, { scale: 0.92, duration: 0.18, ease: 'power2.out' });
		});

		window.addEventListener('mouseup', () => {
			gsap.to(dot, { scale: 1, duration: 0.2, ease: 'power2.out' });
			gsap.to(cursor, { scale: 1, duration: 0.2, ease: 'power2.out' });
		});

		document.addEventListener('mouseleave', () => {
			cursor.classList.remove('is-visible');
			cursorVisible = false;
			leaveActiveTarget();
		});

		document.addEventListener('mouseover', event => {
			const target = event.target.closest(targetSelector);
			if (!target || cursor.contains(target)) return;
			enterTarget(target);
		});

		window.addEventListener('scroll', () => {
			if (!activeTarget) return;
			const cursorX = Number(gsap.getProperty(cursor, 'x')) || 0;
			const cursorY = Number(gsap.getProperty(cursor, 'y')) || 0;
			const elementUnderMouse = document.elementFromPoint(cursorX, cursorY);
			const stillOnTarget = elementUnderMouse && (
				elementUnderMouse === activeTarget ||
				elementUnderMouse.closest(targetSelector) === activeTarget
			);
			if (!stillOnTarget) leaveActiveTarget();
		}, { passive: true });
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initTargetCursor);
	} else {
		initTargetCursor();
	}
})();
