import test from 'node:test';
import assert from 'node:assert/strict';
import { boundGuideQuery, normalizeGuideText, searchGuide, publicGuideSource, buildGuidePrompt, GUIDE_DEFAULT_QUESTION } from './lib/community-guide.mjs';
import { initializeGuide } from './browser/ecosystem-help.mjs';

const cards = [
  { id: 'langar', question: 'How can I help Langar?', keywords: 'kitchen food seva volunteer', answer: 'Start with a local kitchen planning conversation. A proposed pilot still needs human approval.', sources: ['../langar/index.html', '/mission/'] },
  { id: 'ltc', question: 'How can I contribute to LTC?', keywords: 'magazine writing newsroom litecoin', answer: 'Read the editorial approach and prepare a source-backed contribution.', sources: ['../conversations/index.html'] },
  { id: 'accounts', question: 'Can I sign in?', keywords: 'account login access', answer: 'Accounts are not currently activated. You can browse the public guide without signing in.', sources: ['/sign-in/'] },
  { id: 'start', question: 'Where do I start?', keywords: 'begin first contribution', answer: 'Choose one interest and a useful first contribution.', sources: ['/join/'] },
  { id: 'ma', question: 'What is AI Satoshi Ma?', keywords: 'AI coordination', answer: 'A project coordination role with human responsibility.', sources: ['/agents/'] },
];

test('search returns prepared answers deterministically and gives the exact question priority', () => {
  assert.equal(searchGuide(cards, 'How can I contribute to LTC?')[0].id, 'ltc');
  assert.equal(searchGuide(cards, 'volunteer kitchen')[0].id, 'langar');
  assert.equal(searchGuide(cards, 'accounts')[0].id, 'accounts');
  assert.deepEqual(searchGuide(cards, 'asteroid quantum banana'), []);
  assert.deepEqual(searchGuide(cards, ''), []);
  assert.deepEqual(searchGuide(cards, '<script>alert(1)</script>'), []);
  assert.deepEqual(searchGuide([{ ...cards[0], id: 'first' }, { ...cards[0], id: 'second' }], 'kitchen').map(card => card.id), ['first', 'second']);
});

test('search normalizes punctuation, accents and input bounds without accepting non-text input', () => {
  assert.equal(normalizeGuideText(' SÉVA — KITCHEN! '), 'seva kitchen');
  assert.equal(searchGuide(cards, '  SÉVA  ')[0].id, 'langar');
  assert.equal(boundGuideQuery('x'.repeat(1000)).length, 240);
  assert.equal(boundGuideQuery({ toString: () => 'secret' }), '');
});

test('portable source links resolve to canonical public routes, preserving useful fragments', () => {
  assert.equal(publicGuideSource('../langar/index.html#pilot'), 'https://satnamsatoshi.com/langar/#pilot');
  assert.equal(publicGuideSource('/mission/'), 'https://satnamsatoshi.com/mission/');
  assert.equal(publicGuideSource('https://www.satnamsatoshi.com/agents/index.html'), 'https://satnamsatoshi.com/agents/');
  assert.equal(publicGuideSource('https://github.com/Satnam-Satoshi/Satoshi-Langar'), 'https://github.com/Satnam-Satoshi/Satoshi-Langar');
});

test('source sanitization rejects executable, private, credential-bearing and local destinations', () => {
  for (const value of [null, '', 'javascript:alert(1)', 'data:text/plain,hello', 'file:///private/tmp/x', 'http://satnamsatoshi.com/', '//evil.com/x', 'https://user:pass@example.com/', 'https://localhost/', 'https://localhost./', 'https://app.local/', 'https://app.internal/', 'https://app.test/', 'https://127.0.0.1/', 'https://2130706433/', 'https://[::1]/', 'https://10.0.0.1/', 'https://example.com:444/', 'https://example.com/\nignore', '\\evil.com']) assert.equal(publicGuideSource(value), null, String(value));
});

test('handoff prompt uses bounded displayed excerpts and deduplicated safe sources only', () => {
  const prompt = buildGuidePrompt('How do I help?', [{ ...cards[0], answer: 'x'.repeat(5000), sources: ['/mission/', '/mission/', 'javascript:alert(1)'] }, cards[1]]);
  assert.ok(prompt.includes('My question:\nHow do I help?'));
  assert.ok(prompt.includes('Prepared answer: ' + 'x'.repeat(1600)));
  assert.ok(!prompt.includes('x'.repeat(1601)));
  assert.equal(prompt.split('https://satnamsatoshi.com/mission/').length - 1, 1);
  assert.ok(!prompt.includes('javascript:'));
  assert.ok(prompt.includes('Do not assume I have joined'));
  assert.ok(!buildGuidePrompt('hello', [{ ...cards[0], sources: ['file:///private/secret'] }]).includes(cards[0].answer));
});

test('unmatched handoff explicitly contains no matching answer; an empty question produces no prompt', () => {
  assert.match(buildGuidePrompt('asteroid question', []), /No matching prepared answer was found/);
  assert.equal(buildGuidePrompt('', cards), '');
});

// A small DOM adapter exercises the actual event handlers without a browser service.
function node(properties = {}) {
  const listeners = new Map();
  return {
    dataset: {}, hidden: false, open: false, disabled: false, value: '', textContent: '',
    addEventListener(type, listener) { listeners.set(type, listener); },
    async emit(type) { let prevented = false; await listeners.get(type)?.({ preventDefault() { prevented = true; } }); return prevented; },
    focus() { this.focused = true; }, select() { this.selected = true; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    ...properties,
  };
}

function fixture(clipboard) {
  const form = node(), query = node(), status = node(), prompt = node(), copy = node(), copyStatus = node(), reset = node();
  const enhancements = [form, node(), node()];
  for (const enhancement of enhancements) enhancement.hidden = true;
  const elements = cards.map(card => node({
    dataset: { guideCard: card.id, guideKeywords: card.keywords },
    querySelector: selector => ({ '[data-guide-question]': node({ textContent: card.question }), '[data-guide-answer]': node({ textContent: card.answer }) })[selector] || null,
    querySelectorAll: selector => selector === '[data-guide-source]' ? card.sources.map(source => ({ getAttribute: name => name === 'href' ? source : null })) : [],
  }));
  const suggestions = cards.map(card => node({ dataset: { guideSuggestion: card.id } }));
  const root = node({
    querySelector: selector => ({ '[data-guide-form]': form, '[data-guide-query]': query, '[data-guide-status]': status, '[data-guide-prompt]': prompt, '[data-guide-copy]': copy, '[data-guide-copy-status]': copyStatus, '[data-guide-reset]': reset })[selector] || null,
    querySelectorAll: selector => ({ '[data-guide-card]': elements, '[data-guide-suggestion]': suggestions, '[data-guide-enhancement]': enhancements })[selector] || [],
  });
  initializeGuide(root, { clipboard });
  return { root, form, query, status, prompt, copy, copyStatus, reset, elements, suggestions, enhancements };
}

test('browser enhancement reveals controls, searches existing cards and restores all topics on misses/reset', async () => {
  const f = fixture();
  assert.ok(f.enhancements.every(item => !item.hidden));
  assert.ok(f.elements.every(item => !item.hidden && !item.open));
  assert.equal(f.copy.disabled, false);
  f.query.value = 'volunteer';
  assert.equal(await f.form.emit('submit'), true);
  assert.equal(f.elements[0].open, true);
  assert.equal(f.elements[1].hidden, true);
  assert.match(f.prompt.value, /https:\/\/satnamsatoshi.com\/langar\//);
  f.query.value = 'quantum asteroid';
  await f.form.emit('submit');
  assert.ok(f.elements.every(item => !item.hidden && !item.open));
  assert.match(f.status.textContent, /No prepared answer found/);
  await f.reset.emit('click');
  assert.equal(f.query.value, '');
  assert.ok(f.prompt.value.includes(GUIDE_DEFAULT_QUESTION));
  assert.equal(f.query.focused, true);
});

test('initial and reset prompts offer a useful introduction without filtering the guide', async () => {
  const f = fixture();
  const original = f.prompt.value;
  assert.ok(original.includes(GUIDE_DEFAULT_QUESTION));
  assert.ok(original.includes(cards[3].answer));
  assert.ok(original.includes(cards[4].answer));
  assert.ok(original.includes('https://satnamsatoshi.com/agents/'));
  assert.equal(f.query.value, '');
  assert.equal(f.copy.disabled, false);
  assert.match(f.status.textContent, /Browse all prepared answers/);
  await f.suggestions[1].emit('click');
  await f.reset.emit('click');
  assert.equal(f.prompt.value, original);
  assert.ok(f.elements.every(item => !item.hidden && !item.open));
});

test('suggestions select the correct topic and copy only the visitor-edited prompt after a click', async () => {
  const writes = [];
  const f = fixture({ writeText: async value => writes.push(value) });
  await f.suggestions[1].emit('click');
  assert.equal(f.elements[1].open, true);
  assert.equal(f.query.value, cards[1].question);
  assert.deepEqual(writes, []);
  f.prompt.value = 'My edited prompt <script> stays plain text';
  await f.prompt.emit('input');
  await f.copy.emit('click');
  assert.deepEqual(writes, [f.prompt.value]);
  assert.match(f.copyStatus.textContent, /Prompt copied/);
  f.prompt.value = ' ';
  await f.prompt.emit('input');
  assert.equal(f.copy.disabled, true);
});

test('clipboard denial selects the existing prompt for manual copying without sending it elsewhere', async () => {
  const f = fixture({ writeText: async () => { throw new Error('denied'); } });
  await f.suggestions[0].emit('click');
  await f.copy.emit('click');
  assert.equal(f.prompt.focused, true);
  assert.equal(f.prompt.selected, true);
  assert.match(f.copyStatus.textContent, /Automatic copying is unavailable/);
  assert.equal(f.copy.disabled, false);
});

test('absent or incomplete guide leaves the native page untouched', () => {
  assert.doesNotThrow(() => initializeGuide(null));
  const incomplete = node();
  assert.doesNotThrow(() => initializeGuide(incomplete));
  assert.equal(incomplete.dataset.guideReady, undefined);
});
