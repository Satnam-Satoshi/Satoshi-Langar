import { createHash } from 'node:crypto';

export const COVER_MOTIFS = Object.freeze(['orbits', 'timechain', 'signal', 'constellation', 'ledger', 'horizon', 'weave']);
export const COVER_PALETTES = Object.freeze(['ember', 'cobalt', 'forest', 'ochre']);
export const EDITION_LAYOUTS = Object.freeze(['folio', 'atlas', 'dispatch']);
export const EDITORIAL_ART = Object.freeze(['litecoin-open-network.jpg', 'mweb-private-public.jpg', 'open-builders-workshop.jpg', 'open-table-editorial.jpg']);
const DAY_MS = 86_400_000;
const assert = (value, code) => { if (!value) throw new Error(code); };
const dateIsValid = date => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
const mod = (value, base) => ((value % base) + base) % base;

// Original educational framing, not purported headlines or reports of real-world events.
const THEMES = Object.freeze([
  { theme: 'Perspective', title: 'A wider view. A closer look.', backTitle: 'Change the scale', prompt: 'Which detail changes your understanding when you step back from the headline?', practice: 'Choose one number in this edition. Write its unit, source date and what it does not measure. Compare those notes with a friend’s reading.', closingLine: 'Keep the curiosity. Bring it back to the table.' },
  { theme: 'Time', title: 'Read the date. Then the number.', backTitle: 'Keep three clocks', prompt: 'When did the event happen, when was it recorded, and when did you read it?', practice: 'Find a source-effective date and a collection time in the sourcebook. Explain the difference in one sentence a newcomer can understand.', closingLine: 'A good record leaves room for tomorrow.' },
  { theme: 'Attention', title: 'Follow the signal.', backTitle: 'Make room to listen', prompt: 'What evidence would make you change your mind?', practice: 'Pick one claim you agree with. Write a fair question that could challenge it, then look for a primary record that might answer the question.', closingLine: 'Less noise. More useful questions.' },
  { theme: 'Connection', title: 'Open questions. Shared understanding.', backTitle: 'Connect two readers', prompt: 'What could an experienced reader and a newcomer teach each other today?', practice: 'Take one unfamiliar term from this issue. Write a plain-language explanation and ask someone to identify the part that is still unclear.', closingLine: 'Understanding grows when it can be shared.' },
  { theme: 'Evidence', title: 'Keep the record.', backTitle: 'Show your working', prompt: 'Could another reader retrace the path from your conclusion to its source?', practice: 'Open a cited source. Note one directly stated fact and one interpretation you might add. Keep them in separate sentences.', closingLine: 'Leave the next reader a path to check.' },
  { theme: 'Patience', title: 'Small steps. Long horizons.', backTitle: 'Practice without pressure', prompt: 'What is one useful thing you can learn without buying anything?', practice: 'Choose a lesson, a software release note or a method in this issue. Spend ten minutes reading it and write down one question for tomorrow.', closingLine: 'Learning has a longer horizon than a ticker.' },
  { theme: 'Service', title: 'One table. Better questions.', backTitle: 'Turn learning into service', prompt: 'Who could use a clearer explanation or a more welcoming first step?', practice: 'Offer one small contribution: explain a term, improve a source link or draft an accessible summary. Ask for feedback before speaking for another person.', closingLine: 'Let knowledge make someone’s next step easier.' },
]);

export const BACK_PAGE_EXERCISES = Object.freeze([
  ...THEMES.map(({ prompt, practice }) => ({ prompt, practice })),
  { prompt: 'Which two quantities look similar but answer different questions?', practice: 'Choose two labels in the sourcebook. Explain what each counts, and write one reason comparing them directly could mislead a reader.' },
  { prompt: 'What would a one-day delay change about this story?', practice: 'Read an older issue beside this one. Find the publication dates and source dates before comparing their contents. Do not infer a cause from a change alone.' },
  { prompt: 'Which missing detail would make a claim easier to check?', practice: 'Draft a source request with three fields: the exact claim, the evidence that would help and a clear question. Keep private information out of public submissions.' },
  { prompt: 'How would you explain this topic to someone with a different first language?', practice: 'Rewrite one short paragraph using familiar words. Keep the source link and qualifications. Ask a fluent reader to check any translation before sharing it.' },
  { prompt: 'Where does the direct observation end and your interpretation begin?', practice: 'Take one brief and make two columns: what the source states and what you are tempted to conclude. Leave unsupported conclusions as questions.' },
  { prompt: 'What can you learn by reading a source slowly?', practice: 'Choose one linked release note or methodology page. Read its date, scope and limitations before its summary. Write down one point you want to investigate further.' },
  { prompt: 'What would make the first five minutes more welcoming?', practice: 'Review one community page as if you had never heard its technical terms. Suggest one clearer label or simpler next step without assuming the reader owns a wallet.' },
  { prompt: 'Which part of a chart would you inspect before its shape?', practice: 'Find a public chart you already use. Identify its units, time interval and source. If any are missing, record that gap rather than guessing.' },
  { prompt: 'Could two accurate records describe different moments?', practice: 'Choose a source observation and the time it was collected. Describe a situation in which their dates differ, without changing either date to make them match.' },
  { prompt: 'Which question invites evidence instead of an argument?', practice: 'Rewrite one strongly worded claim as a specific question. Include what evidence could support it and what evidence could challenge it.' },
  { prompt: 'What should an AI assistant ask a human before speaking for them?', practice: 'Write a small task card for an agent: purpose, public inputs, permitted actions and a stop condition. Give responsibility to a real human owner; do not invent one.' },
  { prompt: 'What is the smallest useful correction you could make?', practice: 'Inspect a source link or technical term in an issue. If it needs correction, describe the precise change and cite evidence. If it does not, leave the record intact.' },
  { prompt: 'What would you keep learning if the price ticker disappeared?', practice: 'Choose one concept from a course or source note. Write a question about how it works, then set aside ten minutes to investigate without making a financial decision.' },
  { prompt: 'Who should decide whether a story about a community is ready to share?', practice: 'Draft a short consent checklist for a fictional community story. Include whose words are used, what remains private and how someone could request a correction.' },
]);

export function buildPresentation({ date, briefs }) {
  assert(dateIsValid(date), 'invalid_presentation_date');
  assert(Array.isArray(briefs) && briefs.length > 0 && new Set(briefs.map(item => item.id)).size === briefs.length, 'presentation_requires_unique_briefs');
  assert(briefs.every(brief => typeof brief.id === 'string' && /^[a-z0-9-]+$/.test(brief.id) && typeof brief.headline === 'string' && brief.headline.length > 0 && Array.isArray(brief.sourceIds) && brief.sourceIds.length > 0), 'presentation_requires_source_briefs');
  const day = Math.floor(Date.parse(date) / DAY_MS);
  const theme = THEMES[mod(day, THEMES.length)];
  const exercise = BACK_PAGE_EXERCISES[mod(day, BACK_PAGE_EXERCISES.length)];
  const start = mod(day, briefs.length);
  const readingOrder = [...briefs.slice(start), ...briefs.slice(0, start)].map(brief => brief.id);
  const dateLabel = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
  const seed = createHash('sha256').update(`ltc-presentation-v1:${date}`).digest('hex').slice(0, 16);
  // Reuse accepted factual brief titles rather than deriving news from a design theme.
  const subtitle = `${briefs.length} sourced ${briefs.length === 1 ? 'brief' : 'briefs'}. ${briefs.slice(0, 2).map(brief => brief.headline).join(' · ')}`;
  const result = {
    schemaVersion: 1,
    artDirection: { version: 1, layout: EDITION_LAYOUTS[mod(day, EDITION_LAYOUTS.length)], coverAsset: EDITORIAL_ART[mod(day, EDITORIAL_ART.length)], backAsset: EDITORIAL_ART[mod(day + 2, EDITORIAL_ART.length)], spreadOffset: mod(day, 3) },
    cover: {
      theme: theme.theme, palette: COVER_PALETTES[mod(day + Math.floor(day / 7), COVER_PALETTES.length)], motif: COVER_MOTIFS[mod(day, COVER_MOTIFS.length)],
      title: theme.title, subtitle, kicker: `LTC / DAILY SOURCE EDITION / ${dateLabel}`, seed,
    },
    backPage: { title: theme.backTitle, prompt: exercise.prompt, practice: exercise.practice, closingLine: theme.closingLine },
    readingOrder,
  };
  validatePresentation(result, { date, briefs });
  return result;
}

export function validatePresentation(presentation, { date, briefs }) {
  assert(presentation?.schemaVersion === 1 && dateIsValid(date), 'invalid_presentation');
  assert(presentation.cover && presentation.backPage && Array.isArray(presentation.readingOrder), 'incomplete_presentation');
  assert(COVER_MOTIFS.includes(presentation.cover.motif) && COVER_PALETTES.includes(presentation.cover.palette), 'unknown_presentation_treatment');
  const expectedSeed = createHash('sha256').update(`ltc-presentation-v1:${date}`).digest('hex').slice(0, 16);
  assert(presentation.cover.seed === expectedSeed, 'presentation_date_seed_mismatch');
  for (const key of ['theme', 'title', 'subtitle', 'kicker']) assert(typeof presentation.cover[key] === 'string' && presentation.cover[key].trim().length > 0 && presentation.cover[key].length <= 700, 'incomplete_presentation_copy');
  for (const key of ['title', 'prompt', 'practice', 'closingLine']) assert(typeof presentation.backPage[key] === 'string' && presentation.backPage[key].trim().length > 0 && presentation.backPage[key].length <= 700, 'incomplete_back_page');
  // Older archived editions predate artDirection and retain their saved artwork.
  if (presentation.artDirection !== undefined) {
    const art = presentation.artDirection;
    const day = Math.floor(Date.parse(date) / DAY_MS);
    assert(art?.version === 1 && EDITION_LAYOUTS.includes(art.layout) && EDITORIAL_ART.includes(art.coverAsset) && EDITORIAL_ART.includes(art.backAsset) && Number.isInteger(art.spreadOffset) && art.spreadOffset >= 0 && art.spreadOffset < 3, 'invalid_editorial_art_direction');
    assert(art.layout === EDITION_LAYOUTS[mod(day,3)] && art.coverAsset === EDITORIAL_ART[mod(day,4)] && art.backAsset === EDITORIAL_ART[mod(day+2,4)] && art.spreadOffset === mod(day,3), 'art_direction_date_mismatch');
  }
  const ids = briefs.map(brief => brief.id);
  assert(presentation.readingOrder.length === ids.length && new Set(presentation.readingOrder).size === ids.length && presentation.readingOrder.every(id => ids.includes(id)), 'invalid_presentation_reading_order');
  return true;
}
