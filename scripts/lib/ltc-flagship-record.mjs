import { createHash } from 'node:crypto';
import { validateIntelligence } from './ltc-intelligence.mjs';
import { validatePolicySnapshot } from './ltc-policy.mjs';

const assert = (ok, code) => { if (!ok) throw new Error(code); };
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const validInstant = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 19) === value.slice(0, 19);
const text = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 3000;
const localPath = value => typeof value === 'string' && /^\/[a-z0-9/?=._-]+$/i.test(value) && !value.startsWith('//');
const sourceUrl = value => { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return localPath(value); } };
const dateInNewYork = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function validateFeatures(value, date, { now } = {}) {
  assert(validDate(date) && value?.schemaVersion === 1 && validDate(value.issueDate) && value.issueDate <= date && validDate(value.checkedAt) && value.checkedAt <= date && validInstant(value.preparedAt) && dateInNewYork(value.preparedAt) <= date, 'invalid_feature_date');
  if (now !== undefined) assert(validInstant(now) && Date.parse(value.preparedAt) <= Date.parse(now), 'future_feature_preparation');
  assert(value.timezone === 'America/New_York' && value.editorialStatus === 'AI-prepared and source-checked', 'invalid_feature_provenance');
  assert(Array.isArray(value.stories) && value.stories.length >= 1 && value.stories.length <= 10 && Array.isArray(value.sources), 'invalid_features');
  assert(new Set(value.sources.map(source => source.id)).size === value.sources.length, 'duplicate_feature_source');
  for (const source of value.sources) {
    assert(typeof source.id === 'string' && sourceUrl(source.url) && text(source.title) && text(source.publisher) && text(source.note) && validDate(source.checkedAt) && source.checkedAt <= date && (source.publishedAt === null || ((validDate(source.publishedAt) || validInstant(source.publishedAt)) && source.publishedAt.slice(0, 10) <= date)), 'invalid_feature_source');
    if (now !== undefined && validInstant(source.publishedAt)) assert(Date.parse(source.publishedAt) <= Date.parse(now), 'future_feature_source_publication');
  }
  assert(new Set(value.stories.map(story => story.id)).size === value.stories.length, 'duplicate_feature_story');
  for (const story of value.stories) {
    assert(/^[a-z0-9-]+$/.test(story.id) && ['title', 'desk', 'classification', 'dek', 'status', 'takeaway', 'discussionPrompt'].every(key => text(story[key])) && Array.isArray(story.paragraphs) && story.paragraphs.length > 0 && story.paragraphs.every(paragraph => typeof paragraph === 'string' && paragraph.length > 20 && paragraph.length < 3000), 'invalid_feature_story');
    assert(Array.isArray(story.sourceIds) && story.sourceIds.length > 0 && story.sourceIds.every(id => value.sources.some(source => source.id === id)), 'missing_feature_source');
    assert(Array.isArray(story.eventDates) && story.eventDates.every(event => validDate(event.date) && event.date <= date && text(event.label)), 'invalid_feature_event_date');
  }
  return true;
}

// Rebuilds check the saved preparation clock, never today's clock. They must not
// refresh or rewrite immutable historical observations merely because time passed.
export function validateFlagshipRecord(edition) {
  const fields = ['flagship', 'intelligence', 'policyRecords', 'features'];
  const isFlagship = edition?.presentation?.artDirection?.version === 2;
  const hasEvidence = fields.some(key => Object.hasOwn(edition ?? {}, key));
  if (!isFlagship && !hasEvidence) return true;
  assert(isFlagship && fields.every(key => edition[key] && typeof edition[key] === 'object'), 'incomplete_flagship_evidence');
  assert(validDate(edition.date) && edition.date >= '2026-10-05' && validInstant(edition.preparedAt) && edition.date <= dateInNewYork(edition.preparedAt), 'invalid_flagship_preparation');
  const record = edition.flagship;
  assert(record.schemaVersion === 1 && record.series === 'Proof of Work' && Object.keys(record).sort().join(',') === ['schemaVersion', 'series', 'intelligenceSha256', 'policySha256', 'featuresSha256'].sort().join(','), 'invalid_flagship_record');
  const now = edition.preparedAt;
  validateIntelligence(edition.intelligence, { now, editionDate: edition.date });
  assert(Date.parse(edition.intelligence.evaluatedAt) === Date.parse(now), 'flagship_freshness_not_evaluated_at_preparation');
  validatePolicySnapshot(edition.policyRecords, { now });
  validateFeatures(edition.features, edition.date, { now });
  for (const [field, digestField] of [['intelligence', 'intelligenceSha256'], ['policyRecords', 'policySha256'], ['features', 'featuresSha256']]) {
    assert(typeof record[digestField] === 'string' && /^[a-f0-9]{64}$/.test(record[digestField]) && record[digestField] === hash(edition[field]), 'flagship_evidence_digest_mismatch');
  }
  return true;
}
