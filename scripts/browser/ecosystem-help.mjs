import { boundGuideQuery, buildGuidePrompt, searchGuide, GUIDE_DEFAULT_QUESTION } from '../lib/community-guide.mjs';

// Prepared answers only. No storage, requests, model service or automatic handoff.
export function initializeGuide(root, { clipboard = globalThis.navigator?.clipboard } = {}) {
  if (!root || root.dataset.guideReady) return;
  const form = root.querySelector('[data-guide-form]');
  const query = root.querySelector('[data-guide-query]');
  const status = root.querySelector('[data-guide-status]');
  const prompt = root.querySelector('[data-guide-prompt]');
  const copy = root.querySelector('[data-guide-copy]');
  const copyStatus = root.querySelector('[data-guide-copy-status]');
  const cards = [...root.querySelectorAll('[data-guide-card]')].map(element => ({
    id: element.dataset.guideCard,
    question: element.querySelector('[data-guide-question]')?.textContent?.trim() || '',
    answer: element.querySelector('[data-guide-answer]')?.textContent?.trim() || '',
    keywords: element.dataset.guideKeywords || '',
    sources: [...element.querySelectorAll('[data-guide-source]')].map(link => link.getAttribute('href')),
    element,
  })).filter(card => card.id && card.question && card.answer);
  if (!form || !query || !status || !prompt || !copy || !copyStatus || !cards.length) return;
  root.dataset.guideReady = 'true';

  function display(matches, question) {
    const selected = new Set(matches);
    for (const card of cards) {
      card.element.hidden = matches.length > 0 && !selected.has(card);
      card.element.open = card === matches[0];
    }
    prompt.value = buildGuidePrompt(question || GUIDE_DEFAULT_QUESTION, question ? matches : cards.filter(card => card.id === 'start' || card.id === 'ma'));
    copy.disabled = !prompt.value.trim();
    copyStatus.textContent = '';
    status.textContent = !question
      ? 'Browse all prepared answers. Search stays in this browser and is not saved.'
      : matches.length
        ? `${matches.length} prepared ${matches.length === 1 ? 'answer' : 'answers'} found. The best match is open. Search stays in this browser and is not saved.`
        : 'No prepared answer found. All guide topics remain available below. You can edit a prompt to use separately in ChatGPT.';
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    query.value = boundGuideQuery(query.value);
    display(searchGuide(cards, query.value), query.value);
  });
  for (const button of root.querySelectorAll('[data-guide-suggestion]')) {
    button.addEventListener('click', event => {
      event.preventDefault();
      const card = cards.find(item => item.id === button.dataset.guideSuggestion);
      if (!card) return;
      query.value = boundGuideQuery(card.question);
      display([card], query.value);
    });
  }
  root.querySelector('[data-guide-reset]')?.addEventListener('click', event => {
    event.preventDefault();
    query.value = '';
    display([], '');
    query.focus();
  });
  prompt.addEventListener('input', () => {
    copy.disabled = !prompt.value.trim();
    copyStatus.textContent = '';
  });
  copy.addEventListener('click', async event => {
    event.preventDefault();
    if (!prompt.value.trim()) return;
    const value = prompt.value;
    copy.disabled = true;
    copyStatus.textContent = '';
    try {
      if (!clipboard?.writeText) throw new Error('Clipboard unavailable');
      await clipboard.writeText(value);
      copyStatus.textContent = 'Prompt copied. Open ChatGPT, then paste and send it when you are ready.';
    } catch {
      prompt.focus();
      prompt.select();
      copyStatus.textContent = 'Automatic copying is unavailable. The prompt is selected; use your device’s Copy action, then paste it into ChatGPT.';
    } finally {
      copy.disabled = !prompt.value.trim();
    }
  });
  for (const enhancement of root.querySelectorAll('[data-guide-enhancement]')) enhancement.hidden = false;
  display([], '');
}

if (typeof document !== 'undefined') {
  for (const root of document.querySelectorAll('[data-ecosystem-help]')) initializeGuide(root);
}
