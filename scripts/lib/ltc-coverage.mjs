import { createHash } from 'node:crypto';

const assert = (condition, code) => { if (!condition) throw new Error(code); };
const text = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 20_000;
const identifier = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const instant = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 19) === value.slice(0, 19);
const unique = values => new Set(values).size === values.length;
const strings = value => Array.isArray(value) && value.every(text);
const ids = value => Array.isArray(value) && value.every(identifier) && unique(value);
const jsonCopy = value => JSON.parse(JSON.stringify(value));
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const kinds = ['desk', 'front-cover', 'contents', 'sourcebook', 'back-cover'];
export const COVERAGE_STATUSES = ['sampled-observations', 'dated-upstream-record', 'reference-only', 'not-monitored', 'edition-design'];

function safeUrl(value) {
  if (typeof value !== 'string' || /[\s\\]/.test(value)) return false;
  try { const parsed = new URL(value); return parsed.protocol === 'https:' && Boolean(parsed.hostname) && !parsed.username && !parsed.password; } catch { return false; }
}
function safeHref(value) {
  return typeof value === 'string' && (/^#[a-z][a-z0-9-]*$/.test(value) || /^\/conversations\/(?:[a-z0-9-]+\/)*$/.test(value));
}

function sourceChecks(sourceIds, sources, generatedAt) {
  assert(ids(sourceIds), 'invalid_coverage_source_ids');
  return sourceIds.map(id => {
    const source = sources.find(item => item?.id === id);
    assert(source && instant(source.checkedAt) && Date.parse(source.checkedAt) <= Date.parse(generatedAt), 'unknown_or_future_coverage_source');
    assert(['collected', 'reference-retrieved', 'unavailable'].includes(source.status), 'invalid_coverage_source_status');
    assert(['dated-observation', 'dated-event', 'stale', 'unknown'].includes(source.freshness), 'invalid_coverage_source_freshness');
    assert(source.sourceAsOf === null || ((date(source.sourceAsOf) || instant(source.sourceAsOf)) && Date.parse(source.sourceAsOf) <= Date.parse(source.checkedAt)), 'invalid_coverage_source_date');
    assert(source.status === 'collected' ? Array.isArray(source.observations) && source.observations.length > 0 : source.observations === null, 'invalid_coverage_observations');
    const metricLabels = (source.observations ?? []).map(item => { assert(text(item.label) && identifier(item.metric.replaceAll('_', '-')), 'invalid_coverage_metric'); return item.label; });
    const onlyUpstreamReleases = source.status === 'collected' && source.observations.every(item => item.metric === 'software_release');
    return { id, checkedAt: source.checkedAt, sourceAsOf: source.sourceAsOf, status: source.status, freshness: source.freshness, metricLabels, onlyUpstreamReleases };
  });
}

function evidenceStatus(checks, references) {
  if (checks.some(check => check.status === 'collected' && check.freshness === 'dated-observation' && !check.onlyUpstreamReleases)) return 'sampled-observations';
  if (checks.some(check => check.status === 'collected' && check.onlyUpstreamReleases)) return 'dated-upstream-record';
  if (checks.some(check => check.status === 'reference-retrieved') || (!checks.length && references.length)) return 'reference-only';
  return 'not-monitored';
}

function summaryFor(status, checks) {
  if (status === 'sampled-observations') {
    const labels = checks.filter(check => check.status === 'collected' && check.freshness === 'dated-observation' && !check.onlyUpstreamReleases).flatMap(check => check.metricLabels);
    return `Accepted dated observations: ${labels.join('; ')}. These observations do not validate every field in this desk; its archived limits still apply.`;
  }
  if (status === 'dated-upstream-record') return 'An official software release record was collected with its original publication date. It is dated context, not a claim of a new announcement today or a measurement of network activity.';
  if (status === 'reference-only') return checks.some(check => check.status === 'reference-retrieved')
    ? 'A reference page was retrieved without a validated numerical parser. The archived educational context and citations are not fresh metrics or new headlines.'
    : 'This issue preserves dated educational context and source links. Those links were not queried by this edition’s collector; no current metric or news verification is claimed.';
  return 'No accepted current observation was available from this desk’s mapped collector sources. Unavailable or stale data remains missing, never zero; educational context is preserved separately.';
}

function validateContext(context, references, generatedAt) {
  assert(context && date(context.reviewedAt) && context.reviewedAt <= generatedAt.slice(0, 10), 'invalid_coverage_review_date');
  assert(strings(context.intro) && Array.isArray(context.sections) && strings(context.checks) && text(context.limits), 'invalid_coverage_context');
  for (const section of context.sections) {
    assert(text(section.heading) && strings(section.paragraphs) && ids(section.sourceIds) && section.sourceIds.every(id => references.some(source => source.id === id)), 'invalid_coverage_section');
  }
}

function validateReferences(references) {
  assert(Array.isArray(references) && unique(references.map(source => source?.id)), 'invalid_coverage_references');
  for (const source of references) assert(identifier(source.id) && text(source.label) && text(source.kind) && safeUrl(source.url) && !Object.hasOwn(source, 'checkedAt'), 'invalid_coverage_reference');
}

export function buildCoverage({ catalog, mapping, sources, generatedAt }) {
  assert(instant(generatedAt) && Array.isArray(sources) && unique(sources.map(source => source?.id)), 'invalid_coverage_clock_or_sources');
  assert(catalog?.schemaVersion === 1 && instant(catalog.updatedAt) && Date.parse(catalog.updatedAt) <= Date.parse(generatedAt) && Array.isArray(catalog.desks), 'invalid_coverage_catalog');
  assert(mapping?.schemaVersion === 1 && date(mapping.referenceDate) && mapping.referenceDate <= generatedAt.slice(0, 10) && Array.isArray(mapping.pages), 'invalid_coverage_mapping');
  assert(unique(catalog.desks.map(desk => desk?.id)), 'duplicate_coverage_desk');
  for (const desk of catalog.desks) {
    assert(identifier(desk.id) && text(desk.title) && text(desk.dek) && Array.isArray(desk.referencePages) && desk.referencePages.every(Number.isSafeInteger) && unique(desk.referencePages), 'invalid_coverage_desk');
    validateReferences(desk.sources);
    validateContext(desk, desk.sources, generatedAt);
    assert(ids(desk.collectorSourceIds) && desk.collectorSourceIds.every(id => sources.some(source => source.id === id)), 'unknown_coverage_collector');
    const mappedPages = mapping.pages.filter(page => page.deskId === desk.id).map(page => page.page).sort((a, b) => a - b);
    assert(JSON.stringify([...desk.referencePages].sort((a, b) => a - b)) === JSON.stringify(mappedPages), 'coverage_desk_page_mismatch');
  }
  const pages = mapping.pages.map(page => {
    assert(page && text(page.title) && kinds.includes(page.kind) && safeHref(page.href), 'invalid_coverage_page');
    if (page.kind !== 'desk') {
      assert(page.deskId === null, 'unexpected_coverage_desk');
      return { page: page.page, title: page.title, href: page.href, deskId: null, kind: page.kind, status: 'edition-design', summary: page.kind === 'sourcebook' ? 'This issue’s dated source records and coverage gaps; no extra market observation is implied.' : 'This issue’s archived design and navigation; no market observation is implied.', sourceIds: [], sources: [], sourceChecks: [] };
    }
    const desk = catalog.desks.find(item => item.id === page.deskId);
    assert(desk, 'unknown_coverage_desk');
    const references = desk.sources.map(({ id, label, url, kind }) => ({ id, label, url, kind }));
    const checks = sourceChecks(desk.collectorSourceIds, sources, generatedAt);
    const status = evidenceStatus(checks, references);
    return { page: page.page, title: page.title, deskTitle: desk.title, href: page.href, deskId: desk.id, kind: 'desk', status, summary: summaryFor(status, checks), sourceIds: [...desk.collectorSourceIds], sources: references, sourceChecks: checks, context: jsonCopy({ reviewedAt: desk.reviewedAt, intro: desk.intro, sections: desk.sections, checks: desk.checks, limits: desk.limits }) };
  });
  const result = { schemaVersion: 1, referenceDate: mapping.referenceDate, generatedAt, catalogSha256: hash({ catalog, mapping }), pages };
  validateCoverage(result, { sources, generatedAt });
  return result;
}

export function validateCoverage(coverage, { sources, generatedAt }) {
  assert(coverage?.schemaVersion === 1 && instant(generatedAt) && coverage.generatedAt === generatedAt && date(coverage.referenceDate) && coverage.referenceDate <= generatedAt.slice(0, 10) && /^[a-f0-9]{64}$/.test(coverage.catalogSha256), 'invalid_coverage_manifest');
  assert(Array.isArray(coverage.pages) && coverage.pages.length === 29 && coverage.pages.every((page, index) => page.page === index + 1), 'incomplete_coverage_pages');
  const designKinds = { 1: 'front-cover', 2: 'contents', 28: 'sourcebook', 29: 'back-cover' };
  for (const page of coverage.pages) {
    assert(text(page.title) && safeHref(page.href) && kinds.includes(page.kind) && COVERAGE_STATUSES.includes(page.status) && text(page.summary), 'invalid_coverage_page');
    assert(page.kind === (designKinds[page.page] ?? 'desk'), 'invalid_coverage_page_kind');
    validateReferences(page.sources);
    assert(ids(page.sourceIds) && Array.isArray(page.sourceChecks), 'invalid_coverage_source_ids');
    const checks = sourceChecks(page.sourceIds, sources, generatedAt);
    assert(JSON.stringify(page.sourceChecks) === JSON.stringify(checks), 'changed_coverage_source_checks');
    if (page.kind !== 'desk') {
      assert(page.deskId === null && page.status === 'edition-design' && page.sourceIds.length === 0 && page.sources.length === 0 && !page.context, 'invalid_coverage_design');
    } else {
      assert(identifier(page.deskId) && text(page.deskTitle) && page.status === evidenceStatus(checks, page.sources) && page.summary === summaryFor(page.status, checks), 'inconsistent_coverage_status');
      validateContext(page.context, page.sources, generatedAt);
    }
  }
  return true;
}
