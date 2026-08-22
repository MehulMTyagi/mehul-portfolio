(function () {
	'use strict';

	const container = document.querySelector('[data-gradient-waves]');
	if (!container) return;

	const canvas = document.createElement('canvas');
	canvas.className = 'hero-gradient-waves-canvas';
	container.appendChild(canvas);

	const ctx = canvas.getContext('2d', { alpha: true });
	if (!ctx) {
		container.classList.add('hero-gradient-waves-fallback');
		return;
	}

	const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const state = {
		width: 1,
		height: 1,
		dpr: 1,
		raf: 0,
		lastFrame: 0,
		visible: true,
		pageVisible: !document.hidden,
		scrolling: false,
		mouseX: 0,
		mouseY: 0,
		targetMouseX: 0,
		targetMouseY: 0
	};

	const layers = [
		{ y: 0.38, amp: 28, speed: 0.00018, color: 'rgba(132, 168, 255, 0.42)', blur: 16 },
		{ y: 0.50, amp: 34, speed: 0.00024, color: 'rgba(95, 234, 218, 0.35)', blur: 22 },
		{ y: 0.64, amp: 46, speed: 0.00014, color: 'rgba(118, 95, 255, 0.30)', blur: 28 },
		{ y: 0.76, amp: 58, speed: 0.00020, color: 'rgba(178, 234, 255, 0.28)', blur: 34 }
	];

	function resize() {
		const rect = container.getBoundingClientRect();
		state.dpr = Math.min(window.devicePixelRatio || 1, 1.15);
		state.width = Math.max(1, Math.floor(rect.width));
		state.height = Math.max(1, Math.floor(rect.height));
		canvas.width = Math.floor(state.width * state.dpr);
		canvas.height = Math.floor(state.height * state.dpr);
		canvas.style.width = `${state.width}px`;
		canvas.style.height = `${state.height}px`;
		ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
		draw(performance.now(), true);
	}

	function drawLayer(layer, time, index) {
		const width = state.width;
		const height = state.height;
		const baseY = height * layer.y + state.mouseY * 14 * (index + 1);
		const amp = layer.amp + Math.sin(time * 0.00025 + index) * 8;
		const phase = time * layer.speed + index * 1.8 + state.mouseX * 0.18;
		const step = Math.max(42, width / 28);

		ctx.save();
		ctx.filter = state.scrolling ? 'none' : `blur(${layer.blur}px)`;
		ctx.beginPath();
		ctx.moveTo(-step, height + 80);

		for (let x = -step; x <= width + step; x += step) {
			const y =
				baseY +
				Math.sin(x * 0.006 + phase * 4.2) * amp +
				Math.sin(x * 0.014 - phase * 2.6) * amp * 0.48;
			ctx.lineTo(x, y);
		}

		ctx.lineTo(width + step, height + 80);
		ctx.closePath();

		const gradient = ctx.createLinearGradient(0, baseY - amp * 2, 0, height);
		gradient.addColorStop(0, layer.color);
		gradient.addColorStop(0.42, layer.color.replace(/[\d.]+\)$/u, '0.15)'));
		gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
		ctx.fillStyle = gradient;
		ctx.fill();
		ctx.restore();
	}

	function draw(time, force) {
		if (!force && time - state.lastFrame < (state.scrolling ? 90 : 48)) {
			state.raf = requestAnimationFrame(draw);
			return;
		}

		state.lastFrame = time;
		state.mouseX += (state.targetMouseX - state.mouseX) * 0.045;
		state.mouseY += (state.targetMouseY - state.mouseY) * 0.045;

		ctx.clearRect(0, 0, state.width, state.height);

		const sky = ctx.createLinearGradient(0, 0, 0, state.height);
		sky.addColorStop(0, '#04071a');
		sky.addColorStop(0.46, '#0a1730');
		sky.addColorStop(1, '#030507');
		ctx.fillStyle = sky;
		ctx.fillRect(0, 0, state.width, state.height);

		const glow = ctx.createRadialGradient(
			state.width * (0.48 + state.mouseX * 0.035),
			state.height * (0.58 - state.mouseY * 0.035),
			0,
			state.width * 0.5,
			state.height * 0.62,
			Math.max(state.width, state.height) * 0.66
		);
		glow.addColorStop(0, 'rgba(178, 234, 255, 0.24)');
		glow.addColorStop(0.42, 'rgba(63, 201, 188, 0.12)');
		glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
		ctx.fillStyle = glow;
		ctx.fillRect(0, 0, state.width, state.height);

		layers.forEach((layer, index) => drawLayer(layer, reduceMotion ? 0 : time, index));

		if (!reduceMotion) state.raf = requestAnimationFrame(draw);
	}

	function start() {
		if (!state.raf && state.visible && state.pageVisible && !reduceMotion) {
			state.raf = requestAnimationFrame(draw);
		}
	}

	function stop() {
		if (state.raf) {
			cancelAnimationFrame(state.raf);
			state.raf = 0;
		}
	}

	const resizeObserver = new ResizeObserver(resize);
	resizeObserver.observe(container);
	resize();

	container.addEventListener('pointermove', (event) => {
		const rect = container.getBoundingClientRect();
		state.targetMouseX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
		state.targetMouseY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
	});

	container.addEventListener('pointerleave', () => {
		state.targetMouseX = 0;
		state.targetMouseY = 0;
	});

	window.addEventListener('portfolio-scroll-state', (event) => {
		state.scrolling = Boolean(event.detail?.scrolling);
	}, { passive: true });

	const intersectionObserver = new IntersectionObserver(([entry]) => {
		state.visible = entry.isIntersecting;
		state.visible ? start() : stop();
	});
	intersectionObserver.observe(container);

	document.addEventListener('visibilitychange', () => {
		state.pageVisible = !document.hidden;
		state.pageVisible ? start() : stop();
	});

	if (!reduceMotion) start();
}());
