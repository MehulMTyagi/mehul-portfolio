const STORAGE_KEY = 'mehul-visitor-cards-v2';
const LEGACY_KEY = 'mehul-visitor-card';
const CURRENT_ID_KEY = 'mehul-visitor-current-card-id';
const API_URL = '/api/visitor-cards';
const BASE_GUEST_COUNT = 1000;

const colorMap = {
	onyx: '#f5f1e8',
	emerald: '#64f28a',
	violet: '#b996ff',
	champagne: '#e6c27a'
};

const colorAliases = {
	teal: 'onyx',
	green: 'emerald',
	pink: 'violet',
	orange: 'champagne'
};

const sampleNames = [
	'Pixel Lantern',
	'Neon Compass',
	'Code Signal',
	'Vector Orbit',
	'Cloud Runner',
	'Binary Bloom',
	'Logic Spark',
	'Circuit Wave'
];

const blockedTerms = [
	'fuck',
	'shit',
	'bitch',
	'asshole',
	'bastard',
	'cunt',
	'dick',
	'pussy',
	'nigger',
	'nigga',
	'chink',
	'paki',
	'fag',
	'faggot',
	'slut',
	'whore',
	'rape',
	'porn',
	'sex',
	'nazi',
	'hitler',
	'terrorist',
	'kill',
	'kys',
	'madarchod',
	'madchod',
	'mc',
	'behenchod',
	'bhenchod',
	'bc',
	'bsdk',
	'bhosdike',
	'bhosdi',
	'chutiya',
	'chutia',
	'chut',
	'gaand',
	'gandu',
	'harami',
	'kutta',
	'kamina',
	'kamine',
	'randi',
	'raand',
	'jhaatu',
	'jhatu',
	'lavde',
	'laude',
	'loda',
	'lodaa',
	'lund',
	'choot',
	'chod',
	'chodu',
	'chakka',
	'hijra',
	'bokachoda'
];

const cardDefaults = {
	name: 'Visitor',
	signature: '',
	color: 'onyx',
	pattern: 'monogram'
};

const dom = {
	entryModal: document.getElementById('visitorEntryModal'),
	editor: document.getElementById('visitorEditor'),
	nameInput: document.getElementById('visitorNameInput'),
	signatureInput: document.getElementById('visitorSignatureInput'),
	safetyMessage: document.getElementById('visitorSafetyMessage'),
	preview: document.getElementById('visitorCardPreview'),
	cardGrid: document.getElementById('visitorCardGrid'),
	colorStats: document.getElementById('visitorColorStats'),
	guestCount: document.getElementById('visitorGuestCount'),
	totalStat: document.getElementById('visitorTotalStat'),
	signedStat: document.getElementById('visitorSignedStat'),
	latestStat: document.getElementById('visitorLatestStat'),
	statsLine: document.getElementById('visitorStatsLine'),
	saveButton: document.getElementById('visitorSaveCard'),
	deleteButton: document.getElementById('visitorClearCard')
};

let state = createDraft();
let backendCards = null;
let backendConfigured = false;

function createId() {
	if (window.crypto && typeof window.crypto.randomUUID === 'function') {
		return window.crypto.randomUUID();
	}
	return `card-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createDraft(source = {}) {
	return {
		id: source.id || createId(),
		name: cleanDisplayValue(source.name || cardDefaults.name, 24),
		signature: cleanDisplayValue(source.signatureText || source.signature || cardDefaults.signature, 28),
		color: normalizeColor(source.color || cardDefaults.color),
		pattern: source.pattern || cardDefaults.pattern,
		number: source.number || BASE_GUEST_COUNT + 1,
		issued: source.issued || formatDate(Date.now()),
		createdAt: source.createdAt || Date.now(),
		updatedAt: Date.now()
	};
}

function readCards() {
	if (Array.isArray(backendCards)) return backendCards;
	return readLocalCards();
}

function readLocalCards() {
	migrateLegacyCard();
	try {
		const cards = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
		return Array.isArray(cards)
			? cards
				.filter(card => card && card.id && card.name && validateStoredCard(card))
				.map(card => ({ ...card, color: normalizeColor(card.color) }))
			: [];
	} catch (error) {
		console.warn('Visitor cards could not be read.', error);
		return [];
	}
}

function writeCards(cards) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

function migrateLegacyCard() {
	if (localStorage.getItem(STORAGE_KEY) || !localStorage.getItem(LEGACY_KEY)) return;

	try {
		const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
		if (!legacy || !legacy.name) return;

		const migrated = createDraft({
			...legacy,
			id: createId(),
			signatureText: legacy.name,
			number: BASE_GUEST_COUNT + 1
		});

		writeCards([migrated]);
		localStorage.setItem(CURRENT_ID_KEY, migrated.id);
	} catch (error) {
		console.warn('Old visitor card could not be migrated.', error);
	}
}

async function saveDraft() {
	const validation = validateDraft(state);
	if (!validation.ok) {
		renderSafety(validation.message);
		return;
	}

	if (dom.saveButton) dom.saveButton.disabled = true;
	renderSafety('Saving your card...');

	const backendResult = await saveCardToBackend(state);
	if (backendResult && backendResult.ok) {
		backendCards = backendResult.cards || [];
		backendConfigured = true;
		writeCards(backendCards);
		localStorage.setItem(CURRENT_ID_KEY, backendResult.card.id);
		state = createDraft(backendResult.card);
		syncInputs();
		renderAll();
		closeEntryModal();
		document.querySelector('.visitor-gallery-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		return;
	}

	const localResult = upsertLocalCard(state);
	writeCards(localResult.cards);
	localStorage.setItem(CURRENT_ID_KEY, localResult.card.id);
	state = createDraft(localResult.card);
	syncInputs();
	renderAll();
	closeEntryModal();
	document.querySelector('.visitor-gallery-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function saveCardToBackend(card) {
	try {
		const response = await fetch(API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json'
			},
			body: JSON.stringify({
				card: {
					id: card.id,
					name: card.name,
					signature: card.signature,
					color: card.color,
					pattern: card.pattern
				}
			})
		});

		const payload = await response.json().catch(() => null);
		if (!response.ok || !payload || !payload.ok) {
			renderSafety(payload && payload.error ? `${payload.error} Saved locally for now.` : 'Saved locally for now.');
			return null;
		}

		return payload;
	} catch (error) {
		console.warn('Visitor backend save failed; using local fallback.', error);
		renderSafety('Backend unavailable. Saved locally for now.');
		return null;
	}
}

async function deleteCardFromBackend(id) {
	try {
		const response = await fetch(API_URL, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json'
			},
			body: JSON.stringify({ id })
		});

		const payload = await response.json().catch(() => null);
		if (!response.ok || !payload || !payload.ok) {
			renderSafety(payload && payload.error ? payload.error : 'Card could not be deleted from the shared gallery.');
			return null;
		}

		return payload;
	} catch (error) {
		console.warn('Visitor backend delete failed.', error);
		renderSafety('Backend unavailable. Card was not deleted from the shared gallery.');
		return null;
	}
}

function upsertLocalCard(draft) {
	const cards = readLocalCards();
	const existingIndex = cards.findIndex(card => card.id === draft.id);
	const now = Date.now();
	const card = {
		...draft,
		name: cleanDisplayValue(draft.name, 24),
		signature: cleanDisplayValue(draft.signature, 28),
		color: normalizeColor(draft.color),
		number: existingIndex >= 0 ? cards[existingIndex].number : nextLocalCardNumber(cards),
		issued: existingIndex >= 0 ? cards[existingIndex].issued : formatDate(now),
		createdAt: existingIndex >= 0 ? cards[existingIndex].createdAt : now,
		updatedAt: now
	};

	if (existingIndex >= 0) {
		cards[existingIndex] = card;
	} else {
		cards.unshift(card);
	}

	return {
		card,
		cards: cards.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
	};
}

function nextLocalCardNumber(cards) {
	return cards.reduce((max, card) => Math.max(max, Number(card.number || 0)), BASE_GUEST_COUNT) + 1;
}

async function clearCurrentCard() {
	const currentId = localStorage.getItem(CURRENT_ID_KEY);
	if (!currentId) {
		renderSafety('No saved card to delete yet.');
		return;
	}

	if (!window.confirm('Delete your visitor card?')) return;

	if (dom.deleteButton) dom.deleteButton.disabled = true;
	renderSafety('Deleting your card...');

	if (backendConfigured) {
		const backendResult = await deleteCardFromBackend(currentId);
		if (!backendResult) {
			if (dom.deleteButton) dom.deleteButton.disabled = false;
			return;
		}

		backendCards = backendResult.cards || [];
		writeCards(backendCards);
		localStorage.removeItem(CURRENT_ID_KEY);
		state = createDraft({ number: BASE_GUEST_COUNT + backendCards.length + 1 });
		syncInputs();
		renderAll();
		renderSafety('Card deleted. You can make a new one anytime.');
		return;
	}

	const cards = readCards().filter(card => card.id !== currentId);
	writeCards(cards);
	localStorage.removeItem(CURRENT_ID_KEY);
	state = createDraft({ number: BASE_GUEST_COUNT + cards.length + 1 });
	syncInputs();
	renderAll();
	renderSafety('Card deleted. You can make a new one anytime.');
}

function normalizeColor(color) {
	return colorMap[color] ? color : (colorAliases[color] || cardDefaults.color);
}

function loadCurrentDraft() {
	const currentId = localStorage.getItem(CURRENT_ID_KEY);
	const cards = readLocalCards();
	const current = cards.find(card => card.id === currentId) || cards[0];
	state = current ? createDraft(current) : createDraft({ number: BASE_GUEST_COUNT + cards.length + 1 });
	syncInputs();
}

function formatDate(time) {
	return new Date(time).toLocaleDateString('en-US', {
		month: '2-digit',
		day: '2-digit',
		year: '2-digit'
	});
}

function escapeHtml(value) {
	return String(value).replace(/[&<>"']/g, char => ({
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#39;'
	}[char]));
}

function cleanDisplayValue(value, maxLength) {
	return String(value || '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, maxLength);
}

function normalizeForSafety(value) {
	return String(value || '')
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[0]/g, 'o')
		.replace(/[1!|]/g, 'i')
		.replace(/[3]/g, 'e')
		.replace(/[4@]/g, 'a')
		.replace(/[5$]/g, 's')
		.replace(/[7]/g, 't')
		.replace(/[^a-z]/g, '');
}

function containsBlockedTerm(value) {
	const normalized = normalizeForSafety(value);
	return blockedTerms.some(term => normalized.includes(term));
}

function validateStoredCard(card) {
	const name = cleanDisplayValue(card.name, 24);
	const signature = cleanDisplayValue(card.signature, 28);
	return Boolean(
		name &&
		hasAllowedCharacters(name) &&
		!containsBlockedTerm(name) &&
		(!signature || (hasAllowedCharacters(signature) && !containsBlockedTerm(signature)))
	);
}

function hasAllowedCharacters(value) {
	return /^[a-zA-Z0-9 ._' -]+$/.test(value);
}

function validateDraft(draft) {
	const name = cleanDisplayValue(draft.name, 24);
	const signature = cleanDisplayValue(draft.signature, 28);

	if (name.length < 2) {
		return { ok: false, message: 'Use at least 2 characters for the name.' };
	}

	if (!hasAllowedCharacters(name) || (signature && !hasAllowedCharacters(signature))) {
		return { ok: false, message: 'Use letters, numbers, spaces, dots, hyphens, or apostrophes only.' };
	}

	if (containsBlockedTerm(name) || containsBlockedTerm(signature)) {
		return { ok: false, message: 'That name or signature is not allowed. Please keep the card respectful.' };
	}

	return { ok: true, message: signature ? 'Looks good. Your card can be saved.' : 'Looks good. Signature is optional.' };
}

function renderSafety(message) {
	if (!dom.safetyMessage) return;
	dom.safetyMessage.textContent = message;
}

function patternSvg(pattern) {
	const paths = {
		monogram: '<path d="M98 224V92l72 94 72-94v132M314 224V92h92c38 0 64 22 64 54s-26 54-64 54h-48"/>',
		stars: '<path d="M306 34l18 54 56 2-44 34 16 54-46-31-47 31 17-54-44-34 56-2zM108 146l12 35 36 1-29 22 11 34-30-20-31 20 11-34-28-22 35-1zM432 172l10 30 32 1-25 19 9 30-26-17-26 17 9-30-25-19 32-1z"/>',
		orbit: '<path d="M82 190c82-96 228-132 332-78 76 40 72 118-8 146-98 34-252-14-308-92M126 104c84 128 212 180 314 126 78-42 72-136-18-168-100-36-236 4-296 42M268 82c62 30 96 82 80 132-15 47-70 68-126 48-62-23-96-82-74-130 19-43 68-62 120-50z"/>',
		mesh: '<path d="M78 236c80-90 190-118 322-82M94 96c96 74 206 108 338 106M148 270c42-126 120-198 236-216M398 68c-6 102-54 174-146 218M124 150c64-22 116-20 158 6M318 174c54-16 96-12 126 12"/>',
		signal: '<path d="M76 214h78l34-96 64 156 54-216 52 156h106M112 90c42-38 92-56 150-54M418 90c-44-37-95-55-152-54M166 280c72 28 142 28 210 0"/>'
	};

	return `<svg viewBox="0 0 540 320" aria-hidden="true">${paths[pattern] || paths.monogram}</svg>`;
}

function cardMarkup(card, isMine = false) {
	const safeSignature = cleanDisplayValue(card.signature, 28);

	return `
		<div class="visitor-card-frame${isMine ? ' is-mine' : ''}">
			<article class="visitor-card" data-color="${escapeHtml(card.color)}">
				<div class="visitor-card-art">${patternSvg(card.pattern)}</div>
				<div class="visitor-card-content">
					<div class="visitor-card-brand">Mehul's World</div>
					<div class="visitor-card-meta">
						<span class="visitor-card-label">Visitor</span>
						<strong class="visitor-card-name">${escapeHtml(card.name)}</strong>
						<span class="visitor-card-label">Issued on</span>
						<strong class="visitor-card-date">${escapeHtml(card.issued)}</strong>
					</div>
					<div class="visitor-card-footer">
						<span>No. ${escapeHtml(card.number)}</span>
						<span>X</span>
						<div class="visitor-signature">
							${safeSignature ? `<span class="visitor-signature-text">${escapeHtml(safeSignature)}</span>` : ''}
						</div>
					</div>
				</div>
			</article>
		</div>
	`;
}

function renderPreview() {
	if (!dom.preview) return;
	const previewCard = {
		...state,
		name: safePreviewText(state.name, 'Respectful guest'),
		signature: state.signature ? safePreviewText(state.signature, '') : ''
	};
	dom.preview.innerHTML = cardMarkup(previewCard);
}

function safePreviewText(value, fallback) {
	const text = cleanDisplayValue(value, 28);
	if (!text || containsBlockedTerm(text) || !hasAllowedCharacters(text)) {
		return fallback;
	}
	return text;
}

function renderGallery(cards = readCards()) {
	if (!dom.cardGrid) return;

	const currentId = localStorage.getItem(CURRENT_ID_KEY);
	if (!cards.length) {
		dom.cardGrid.innerHTML = '<div class="visitor-empty-state">No cards saved in this browser yet. Create yours from the portfolio entry screen.</div>';
		return;
	}

	dom.cardGrid.innerHTML = cards.map(card => cardMarkup(card, card.id === currentId)).join('');
}

function renderStats(cards = readCards()) {
	const total = cards.length;
	const signed = cards.filter(card => cleanDisplayValue(card.signature, 28).length > 1).length;
	const latest = cards.reduce((max, card) => Math.max(max, Number(card.createdAt || 0)), 0);

	if (dom.guestCount) {
		dom.guestCount.textContent = backendConfigured ? `${BASE_GUEST_COUNT + total} visitors` : `${BASE_GUEST_COUNT + total} saved locally`;
	}

	if (dom.totalStat) {
		dom.totalStat.textContent = `${total} card${total === 1 ? '' : 's'}`;
	}

	if (dom.signedStat) {
		dom.signedStat.textContent = total ? `${Math.round((signed / total) * 100)}%` : '0%';
	}

	if (dom.latestStat) {
		dom.latestStat.textContent = total ? relativeTime(latest) : 'None';
	}

	renderColorStats(cards);
	renderStatsLine(cards);
}

function renderColorStats(cards) {
	if (!dom.colorStats) return;

	const total = Math.max(cards.length, 1);
	dom.colorStats.innerHTML = Object.entries(colorMap).map(([color, hex]) => {
		const count = cards.filter(card => card.color === color).length;
		const percent = Math.round((count / total) * 100);
		return `
			<div class="visitor-color-row">
				<span style="color:${hex}">${color}</span>
				<div class="visitor-color-track"><div class="visitor-color-fill" style="--fill:${hex};width:${percent}%"></div></div>
				<span>${percent}%</span>
			</div>
		`;
	}).join('');
}

function renderStatsLine(cards) {
	if (!dom.statsLine) return;

	if (!cards.length) {
		dom.statsLine.setAttribute('points', '0,96 640,96');
		return;
	}

	const days = new Map();
	const now = Date.now();
	for (let i = 13; i >= 0; i -= 1) {
		const key = new Date(now - i * 86400000).toDateString();
		days.set(key, 0);
	}

	cards.forEach(card => {
		const key = new Date(card.createdAt || now).toDateString();
		if (days.has(key)) days.set(key, days.get(key) + 1);
	});

	const values = [...days.values()];
	const max = Math.max(...values, 1);
	const points = values.map((value, index) => {
		const x = (index / Math.max(values.length - 1, 1)) * 640;
		const y = 98 - (value / max) * 72;
		return `${x.toFixed(1)},${y.toFixed(1)}`;
	}).join(' ');

	dom.statsLine.setAttribute('points', points);
}

function relativeTime(time) {
	const diff = Date.now() - time;
	if (diff < 60000) return 'Now';
	if (diff < 3600000) return `${Math.max(1, Math.round(diff / 60000))}m ago`;
	if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`;
	return `${Math.round(diff / 86400000)}d ago`;
}

function renderAll() {
	const validation = validateDraft(state);
	renderSafety(validation.message);
	if (dom.saveButton) dom.saveButton.disabled = !validation.ok;
	renderPreview();
	const cards = readCards();
	renderStats(cards);
	renderGallery(cards);
	syncControls();
}

async function syncBackendCards() {
	try {
		const response = await fetch(API_URL, {
			headers: { 'Accept': 'application/json' },
			cache: 'no-store'
		});
		const payload = await response.json().catch(() => null);

		if (!response.ok || !payload || !payload.ok || !payload.configured || !Array.isArray(payload.cards)) return;

		backendCards = payload.cards;
		backendConfigured = true;
		writeCards(backendCards);
		renderAll();
	} catch (error) {
		console.warn('Visitor backend sync failed; using local cards.', error);
	}
}

function syncInputs() {
	if (dom.nameInput) dom.nameInput.value = state.name;
	if (dom.signatureInput) dom.signatureInput.value = state.signature;
}

function syncControls() {
	document.querySelectorAll('[data-card-color]').forEach(button => {
		button.classList.toggle('is-active', button.dataset.cardColor === state.color);
	});
	document.querySelectorAll('[data-card-pattern]').forEach(button => {
		button.classList.toggle('is-active', button.dataset.cardPattern === state.pattern);
	});
	if (dom.deleteButton) {
		const currentId = localStorage.getItem(CURRENT_ID_KEY);
		dom.deleteButton.disabled = !currentId;
	}
}

function updateDraft(partial) {
	state = { ...state, ...partial, updatedAt: Date.now() };
	renderAll();
}

function randomVisitorName() {
	return sampleNames[Math.floor(Math.random() * sampleNames.length)];
}

function bindEvents() {
	dom.nameInput?.addEventListener('input', () => {
		const name = cleanDisplayValue(dom.nameInput.value, 24);
		updateDraft({
			name
		});
	});

	dom.signatureInput?.addEventListener('input', () => {
		updateDraft({ signature: cleanDisplayValue(dom.signatureInput.value, 28) });
	});

	document.getElementById('visitorRandomName')?.addEventListener('click', () => {
		const name = randomVisitorName();
		updateDraft({ name });
		syncInputs();
	});

	document.querySelectorAll('[data-card-color]').forEach(button => {
		button.addEventListener('click', () => updateDraft({ color: button.dataset.cardColor }));
	});

	document.querySelectorAll('[data-card-pattern]').forEach(button => {
		button.addEventListener('click', () => updateDraft({ pattern: button.dataset.cardPattern }));
	});

	document.getElementById('visitorSaveCard')?.addEventListener('click', saveDraft);
	document.getElementById('visitorClearCard')?.addEventListener('click', clearCurrentCard);
	document.querySelectorAll('[data-visitor-close]').forEach(button => {
		button.addEventListener('click', closeEntryModal);
	});
	document.getElementById('visitorOpenEditor')?.addEventListener('click', () => {
		dom.editor?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		dom.nameInput?.focus({ preventScroll: true });
	});

	document.getElementById('visitorShuffleCards')?.addEventListener('click', () => {
		if (!dom.cardGrid) return;
		[...dom.cardGrid.children]
			.sort(() => Math.random() - 0.5)
			.forEach(card => dom.cardGrid.appendChild(card));
	});
}

function closeEntryModal() {
	if (!dom.entryModal) return;
	dom.entryModal.classList.remove('is-open');
	dom.entryModal.setAttribute('aria-hidden', 'true');
}

loadCurrentDraft();
bindEvents();
renderAll();
syncBackendCards();
