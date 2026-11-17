const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { Readable } = require('node:stream');
const test = require('node:test');
const vm = require('node:vm');

const root = join(__dirname, '..');

function loadClient({ cards, currentId, currentToken, search = '', hash = '', withModal = false }) {
	const values = new Map([['mehul-visitor-cards-v2', JSON.stringify(cards)]]);
	if (currentId) values.set('mehul-visitor-current-card-id', currentId);
	if (currentToken) values.set('mehul-visitor-current-card-token', currentToken);
	const localStorage = {
		getItem: key => values.get(key) || null,
		setItem: (key, value) => values.set(key, value),
		removeItem: key => values.delete(key)
	};
	const context = vm.createContext({
		console: { warn() {} },
		document: {
			body: { classList: { toggle() {}, remove() {} } },
			getElementById: id => withModal && id === 'visitorEntryModal'
				? { classList: { toggle() {} }, setAttribute() {} }
				: null,
			querySelectorAll: () => []
		},
		fetch: async () => { throw new Error('offline'); },
		localStorage,
		URLSearchParams,
		window: {
			crypto: { randomUUID: () => 'fresh-id' },
			location: { search, hash }
		}
	});
	vm.runInContext(readFileSync(join(root, 'visitor-card.js'), 'utf8'), context);
	const result = JSON.parse(JSON.stringify(vm.runInContext('({ id: state.id, editingCard })', context)));
	if (withModal) result.modalOpen = vm.runInContext('shouldShowEntryModal()', context);
	return result;
}

function loadApi(initialCards = []) {
	let storedCards = initialCards;
	const module = { exports: {} };
	const context = vm.createContext({
		Buffer,
		module,
		console,
		process: { env: { BLOB_READ_WRITE_TOKEN: 'test-token' } },
		require: name => name === '@vercel/blob'
			? {
				list: async () => ({ blobs: storedCards.length ? [{ pathname: 'visitor-cards/cards.json', url: 'https://blob.test/cards' }] : [] }),
				put: async (_path, value) => { storedCards = JSON.parse(value); }
			}
			: require(name),
		fetch: async () => ({ ok: true, json: async () => storedCards })
	});
	vm.runInContext(readFileSync(join(root, 'api/visitor-cards.js'), 'utf8'), context);

	return async (method, body) => {
		const request = Readable.from(body ? [JSON.stringify(body)] : []);
		request.method = method;
		const response = {
			statusCode: 200,
			setHeader() {},
			end(value) { this.payload = JSON.parse(value); }
		};
		await module.exports(request, response);
		return { status: response.statusCode, ...response.payload };
	};
}

test('backfills dated Indian-name cards once without changing existing visitors', async () => {
	const createdAt = Date.parse('2026-10-23T12:00:00.000Z');
	const request = loadApi([
		{ id: 'anusha-card', name: 'Anusha', number: 1006, createdAt },
		{ id: 'yash-card', name: 'Yash', number: 1005, createdAt },
		{ id: 'harsh-card', name: 'Harsh Tyagi', number: 1004, createdAt }
	]);
	const first = await request('GET');
	const second = await request('GET');
	assert.equal(first.status, 200);
	assert.equal(first.stats.total, 9);
	assert.equal(second.stats.total, 9);
	assert.equal(new Set(first.cards.map(card => card.id)).size, 9);
	assert.equal(first.cards.find(card => card.id === 'anusha-card').number, 1006);
	const seeded = first.cards.filter(card => card.seeded);
	assert.equal(seeded.length, 6);
	assert.deepEqual(new Set(seeded.map(card => card.name)), new Set([
		'Ananya Sharma', 'Arjun Mehta', 'Priya Nair',
		'Rohan Verma', 'Kavya Rao', 'Devika Patel'
	]));
	assert.equal(seeded.find(card => card.name === 'Ananya Sharma').issued, '08/21/26');
	assert.equal(seeded.find(card => card.name === 'Devika Patel').issued, '11/08/26');
	assert.ok(seeded.every(card => card.createdAt >= Date.parse('2026-08-01') && card.createdAt <= Date.parse('2026-11-17')));
});

test('a new browser never adopts the first public gallery card', () => {
	const cards = [{ id: 'anusha-card', name: 'Anuu', color: 'onyx', pattern: 'monogram' }];
	assert.deepEqual(loadClient({ cards }), { id: 'fresh-id', editingCard: false });
	assert.deepEqual(loadClient({ cards, currentId: 'anusha-card' }), { id: 'fresh-id', editingCard: false });
	assert.deepEqual(loadClient({ cards, currentId: 'anusha-card', search: '?editVisitor=1' }), { id: 'fresh-id', editingCard: false });
	assert.deepEqual(loadClient({ cards, currentId: 'anusha-card', currentToken: 'secret', search: '?editVisitor=1' }), { id: 'anusha-card', editingCard: true });
});

test('the entry modal opens only for new visitors or explicit create and edit links', () => {
	const cards = [{ id: 'my-card', name: 'Mehul', color: 'onyx', pattern: 'monogram' }];
	assert.equal(loadClient({ cards: [], withModal: true }).modalOpen, true);
	assert.equal(loadClient({ cards, currentId: 'my-card', currentToken: 'secret', withModal: true }).modalOpen, false);
	assert.equal(loadClient({ cards, currentId: 'my-card', withModal: true }).modalOpen, false);
	assert.equal(loadClient({ cards, currentId: 'my-card', search: '?visitor=1', withModal: true }).modalOpen, true);
	assert.equal(loadClient({ cards, currentId: 'my-card', currentToken: 'secret', search: '?editVisitor=1', withModal: true }).modalOpen, true);
	assert.equal(loadClient({ cards: [], search: '?skipVisitor=1', withModal: true }).modalOpen, false);
	assert.equal(loadClient({ cards: [], hash: '#hero-section', withModal: true }).modalOpen, false);
});

test('creates always get new server IDs while explicit edits retain the original card', async () => {
	const request = loadApi();
	const first = await request('POST', { action: 'create', card: { id: 'shared-id', name: 'Anuu' } });
	const second = await request('POST', { action: 'create', card: { id: first.card.id, name: 'As K' } });
	const third = await request('POST', { card: { id: second.card.id, name: 'Harsh' } });

	assert.equal(first.status, 201);
	assert.equal(second.status, 201);
	assert.equal(third.status, 201);
	assert.match(second.ownerToken, /^[a-f0-9]{64}$/);
	assert.equal(second.card.ownerTokenHash, undefined);
	assert.equal(third.cards.length, 9);
	assert.equal(new Set(third.cards.map(card => card.id)).size, 9);
	assert.ok(['Anuu', 'As K', 'Harsh'].every(name => third.cards.some(card => card.name === name)));

	const denied = await request('POST', { action: 'update', card: { id: second.card.id, name: 'Wrong Owner' } });
	assert.equal(denied.status, 403);
	const edited = await request('POST', { action: 'update', ownerToken: second.ownerToken, card: { id: second.card.id, name: 'As K Updated' } });
	assert.equal(edited.status, 200);
	assert.equal(edited.ownerToken, undefined);
	assert.equal(edited.cards.length, 9);
	assert.equal(edited.cards.find(card => card.id === first.card.id).name, 'Anuu');
	assert.equal(edited.cards.find(card => card.id === second.card.id).name, 'As K Updated');

	const missing = await request('POST', { action: 'update', card: { id: 'missing', name: 'Unknown' } });
	assert.equal(missing.status, 404);
	assert.equal(missing.cards, undefined);
	assert.equal((await request('DELETE', { id: first.card.id })).status, 403);
	const deleted = await request('DELETE', { id: first.card.id, ownerToken: first.ownerToken });
	assert.equal(deleted.status, 200);
	assert.equal(deleted.cards.length, 8);
});

test('saving returns to the hero and a stale gallery refresh keeps the new card visible', async () => {
	const values = new Map();
	const localStorage = {
		getItem: key => values.get(key) || null,
		setItem: (key, value) => values.set(key, value),
		removeItem: key => values.delete(key)
	};
	const savedCard = {
		id: 'saved-card', name: 'New Visitor', signature: '', color: 'onyx',
		pattern: 'monogram', number: 1001, issued: '10/23/26', createdAt: Date.now()
	};
	let galleryCards = [];
	let destination = '';
	let heroScrolls = 0;
	let retries = 0;
	const cardGrid = { innerHTML: '', scrollIntoView() {} };
	const createContext = isGallery => vm.createContext({
		console: { warn() {} },
		document: {
			body: { classList: { toggle() {}, remove() {} } },
			getElementById: id => isGallery && id === 'visitorCardGrid' ? cardGrid
				: !isGallery && id === 'hero-section' ? { scrollIntoView() { heroScrolls += 1; } } : null,
			querySelectorAll: () => []
		},
		fetch: async (_url, options = {}) => ({
			ok: true,
			json: async () => options.method === 'POST'
				? { ok: true, card: savedCard, cards: [savedCard], ownerToken: 'token' }
				: { ok: true, configured: true, cards: galleryCards }
		}),
		localStorage,
		URLSearchParams,
		window: {
			crypto: { randomUUID: () => 'draft-id' },
			history: { replaceState: (_state, _title, url) => { destination = url; } },
			location: { search: '', hash: '', assign: value => { destination = value; } },
			setTimeout: () => { retries += 1; }
		}
	});

	const editor = createContext(false);
	vm.runInContext(readFileSync(join(root, 'visitor-card.js'), 'utf8'), editor);
	vm.runInContext('state.name = "New Visitor"', editor);
	await vm.runInContext('saveDraft()', editor);
	assert.equal(destination, 'index.html?skipVisitor=1#hero-section');
	assert.equal(heroScrolls, 1);
	assert.equal(values.get('mehul-visitor-current-card-id'), savedCard.id);

	const gallery = createContext(true);
	vm.runInContext(readFileSync(join(root, 'visitor-card.js'), 'utf8'), gallery);
	await vm.runInContext('syncBackendCards()', gallery);
	assert.match(cardGrid.innerHTML, /New Visitor/);
	assert.ok(retries > 0);

	galleryCards = [savedCard];
	await vm.runInContext('syncBackendCards()', gallery);
	assert.equal(values.has('mehul-visitor-pending-card-sync'), false);
	assert.match(cardGrid.innerHTML, /New Visitor/);
});
