const { list, put } = require('@vercel/blob');

const STORE_PATH = 'visitor-cards/cards.json';
const MAX_CARDS = 500;
const BASE_GUEST_COUNT = 1000;

const allowedColors = new Set(['onyx', 'emerald', 'violet', 'champagne']);
const allowedPatterns = new Set(['monogram', 'orbit', 'mesh', 'signal']);

const blockedTerms = [
	'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'dick', 'pussy',
	'nigger', 'nigga', 'chink', 'paki', 'fag', 'faggot', 'slut', 'whore',
	'rape', 'porn', 'sex', 'nazi', 'hitler', 'terrorist', 'kill', 'kys',
	'madarchod', 'madchod', 'mc', 'behenchod', 'bhenchod', 'bc', 'bsdk',
	'bhosdike', 'bhosdi', 'chutiya', 'chutia', 'chut', 'gaand', 'gandu',
	'harami', 'kutta', 'kamina', 'kamine', 'randi', 'raand', 'jhaatu',
	'jhatu', 'lavde', 'laude', 'loda', 'lodaa', 'lund', 'choot', 'chod',
	'chodu', 'chakka', 'hijra', 'bokachoda'
];

module.exports = async function handler(req, res) {
	setNoStore(res);

	try {
		if (req.method === 'GET') {
			const cards = await readCards();
			return sendJson(res, 200, {
				ok: true,
				configured: isConfigured(),
				cards,
				stats: buildStats(cards)
			});
		}

		if (req.method === 'POST') {
			if (!isConfigured()) {
				return sendJson(res, 503, {
					ok: false,
					error: 'Visitor backend is not configured yet.'
				});
			}

			const body = await readJsonBody(req);
			const result = normalizeIncomingCard(body && body.card ? body.card : body);

			if (!result.ok) {
				return sendJson(res, 400, {
					ok: false,
					error: result.error
				});
			}

			const cards = await readCards();
			const next = upsertCard(cards, result.card);
			await writeCards(next.cards);

			return sendJson(res, 200, {
				ok: true,
				card: next.card,
				cards: next.cards,
				stats: buildStats(next.cards)
			});
		}

		if (req.method === 'DELETE') {
			if (!isConfigured()) {
				return sendJson(res, 503, {
					ok: false,
					error: 'Visitor backend is not configured yet.'
				});
			}

			const body = await readJsonBody(req);
			const id = cleanText(body && body.id, 80);

			if (!id) {
				return sendJson(res, 400, {
					ok: false,
					error: 'Missing card id.'
				});
			}

			const cards = await readCards();
			const nextCards = cards.filter(card => card.id !== id);

			if (nextCards.length === cards.length) {
				return sendJson(res, 404, {
					ok: false,
					error: 'Card not found.'
				});
			}

			await writeCards(nextCards);

			return sendJson(res, 200, {
				ok: true,
				cards: nextCards,
				stats: buildStats(nextCards)
			});
		}

		res.setHeader('Allow', 'GET, POST, DELETE');
		return sendJson(res, 405, {
			ok: false,
			error: 'Method not allowed.'
		});
	} catch (error) {
		console.error('Visitor cards API error:', error);
		return sendJson(res, 500, {
			ok: false,
			error: 'Visitor backend failed.'
		});
	}
};

function isConfigured() {
	return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function readCards() {
	if (!isConfigured()) return [];

	const { blobs } = await list({
		prefix: STORE_PATH,
		limit: 1
	});

	const blob = blobs.find(item => item.pathname === STORE_PATH);
	if (!blob) return [];

	const response = await fetch(blob.url, { cache: 'no-store' });
	if (!response.ok) return [];

	const data = await response.json().catch(() => []);
	if (!Array.isArray(data)) return [];

	return data
		.filter(card => card && typeof card === 'object')
		.map(normalizeStoredCard)
		.filter(Boolean)
		.slice(0, MAX_CARDS);
}

async function writeCards(cards) {
	await put(STORE_PATH, JSON.stringify(cards, null, 2), {
		access: 'public',
		allowOverwrite: true,
		contentType: 'application/json'
	});
}

function upsertCard(cards, incoming) {
	const now = Date.now();
	const index = cards.findIndex(card => card.id === incoming.id);

	if (index >= 0) {
		const existing = cards[index];
		const card = {
			...existing,
			name: incoming.name,
			signature: incoming.signature,
			color: incoming.color,
			pattern: incoming.pattern,
			updatedAt: now
		};

		const nextCards = [...cards];
		nextCards[index] = card;
		return { card, cards: sortCards(nextCards) };
	}

	const card = {
		...incoming,
		number: nextCardNumber(cards),
		issued: formatDate(now),
		createdAt: now,
		updatedAt: now
	};

	return {
		card,
		cards: sortCards([card, ...cards]).slice(0, MAX_CARDS)
	};
}

function sortCards(cards) {
	return cards.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
}

function nextCardNumber(cards) {
	const highest = cards.reduce((max, card) => Math.max(max, Number(card.number || 0)), BASE_GUEST_COUNT);
	return highest + 1;
}

function normalizeIncomingCard(card) {
	const id = cleanText(card && card.id, 80) || createId();
	const name = cleanText(card && card.name, 24);
	const signature = cleanText(card && card.signature, 28);
	const color = normalizeColor(card && card.color);
	const pattern = normalizePattern(card && card.pattern);

	if (name.length < 2) {
		return { ok: false, error: 'Use at least 2 characters for the name.' };
	}

	if (!hasAllowedCharacters(name) || (signature && !hasAllowedCharacters(signature))) {
		return { ok: false, error: 'Use letters, numbers, spaces, dots, hyphens, or apostrophes only.' };
	}

	if (containsBlockedTerm(name) || containsBlockedTerm(signature)) {
		return { ok: false, error: 'That name or signature is not allowed.' };
	}

	return {
		ok: true,
		card: {
			id,
			name,
			signature,
			color,
			pattern
		}
	};
}

function normalizeStoredCard(card) {
	const normalized = normalizeIncomingCard(card);
	if (!normalized.ok) return null;

	return {
		...normalized.card,
		number: Number(card.number || BASE_GUEST_COUNT + 1),
		issued: cleanText(card.issued, 12) || formatDate(Number(card.createdAt || Date.now())),
		createdAt: Number(card.createdAt || Date.now()),
		updatedAt: Number(card.updatedAt || card.createdAt || Date.now())
	};
}

function buildStats(cards) {
	const total = cards.length;
	const signed = cards.filter(card => cleanText(card.signature, 28).length > 1).length;
	const latest = cards.reduce((max, card) => Math.max(max, Number(card.createdAt || 0)), 0);
	const colors = {};

	for (const color of allowedColors) {
		colors[color] = cards.filter(card => card.color === color).length;
	}

	return {
		total,
		guestCount: BASE_GUEST_COUNT + total,
		signedPercent: total ? Math.round((signed / total) * 100) : 0,
		latest,
		colors
	};
}

function cleanText(value, maxLength) {
	return String(value || '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, maxLength);
}

function normalizeColor(value) {
	return allowedColors.has(value) ? value : 'onyx';
}

function normalizePattern(value) {
	return allowedPatterns.has(value) ? value : 'monogram';
}

function hasAllowedCharacters(value) {
	return /^[a-zA-Z0-9 ._' -]+$/.test(value);
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

function formatDate(time) {
	return new Date(time).toLocaleDateString('en-US', {
		month: '2-digit',
		day: '2-digit',
		year: '2-digit'
	});
}

function createId() {
	return `card-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readJsonBody(req) {
	return new Promise((resolve, reject) => {
		let body = '';
		req.on('data', chunk => {
			body += chunk;
			if (body.length > 16_384) {
				reject(new Error('Body too large'));
				req.destroy();
			}
		});
		req.on('end', () => {
			try {
				resolve(body ? JSON.parse(body) : {});
			} catch (error) {
				reject(error);
			}
		});
		req.on('error', reject);
	});
}

function setNoStore(res) {
	res.setHeader('Cache-Control', 'no-store, max-age=0');
}

function sendJson(res, statusCode, payload) {
	res.statusCode = statusCode;
	res.setHeader('Content-Type', 'application/json; charset=utf-8');
	res.end(JSON.stringify(payload));
}
