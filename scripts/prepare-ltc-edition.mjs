import { readFile, writeFile, mkdir, readdir, rename, open, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { SOURCE_RULES, RELEASE_RULES, TICKER_RULES, decimal, freshness, tickerFreshness, validateSourceIdentity } from './collect-ltc.mjs';
import { buildPresentation, validatePresentation } from './lib/ltc-presentation.mjs';
import { buildCoverage, validateCoverage } from './lib/ltc-coverage.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const DAY_MS = 86_400_000;
export const POLICY_ID = 'bounded-daily-v1';
export const TIMEZONE = 'America/New_York';
export const digest = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const assert = (condition, code) => { if (!condition) throw new Error(code); };
const isoTime = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 19) === value.slice(0, 19);
const isoDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const numberText = value => { const [whole, fraction] = value.split('.'); return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${fraction === undefined ? '' : `.${fraction}`}`; };
const sourceDateLabel = value => new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));

export function editionDate(now) {
  assert(isoTime(now), 'invalid_run_time');
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
}

export function validatePolicy(policy) {
  assert(policy?.schemaVersion === 1 && policy.policyId === POLICY_ID && policy.timezone === TIMEZONE, 'invalid_publication_policy');
  assert(policy.enabled === true && policy.paused === false, 'publication_paused');
  // Code changes and review are required to widen this policy, not a configuration edit.
  assert(policy.maximumSnapshotAgeHours === 24 && policy.maximumObservationAgeDays === 4 && policy.requiresFreshPrimaryObservation === true && policy.individualHumanReview === false, 'invalid_publication_limits');
  assert(policy.maximumTickerAgeMinutes === 120 && policy.requireCompletePresentation === true, 'invalid_presentation_or_ticker_policy');
}

function normalizeObservations(source, rule, checkedAt) {
  if (source.status !== 'collected') {
    assert(source.observations === null && source.sourceAsOf === null && source.freshness === 'unknown', 'unexpected_unparsed_observation');
    return null;
  }
  assert(rule.parser !== 'source-check-v1', 'reference_cannot_be_metric');
  assert(Array.isArray(source.observations), 'missing_observations');
  const asOf = source.sourceAsOf;
  assert((isoDate(asOf) || isoTime(asOf)) && Date.parse(asOf) <= Date.parse(checkedAt), 'invalid_effective_date');
  const tickerRule = TICKER_RULES[rule.parser];
  assert(source.freshness === (tickerRule ? tickerFreshness(asOf, checkedAt) : freshness(asOf, checkedAt, rule.maxAgeDays)), 'inconsistent_freshness');
  if (tickerRule) {
    assert(isoTime(asOf) && source.observations.length === 1, 'invalid_ticker_observations');
    const item = source.observations[0];
    assert(item?.metric === tickerRule.metric && item.unit === 'USD' && item.effectiveAt === asOf && item.timePrecision === 'second' && item.classification === 'venue-reported', 'invalid_ticker_units');
    const value = decimal(item.value);
    assert(value === item.value && /^\d{1,12}(?:\.\d{1,18})?$/.test(value) && Number(value) > 0, 'invalid_ticker_value');
    return [{ metric: tickerRule.metric, label: `${tickerRule.asset}/USD last trade · Coinbase Exchange`, value, unit: 'USD', effectiveAt: asOf, timePrecision: 'second', classification: 'venue-reported' }];
  }
  if (source.id === 'ibit-holdings') {
    assert(isoDate(asOf) && source.observations.length === 2, 'invalid_ibit_observations');
    const fields = [
      ['fund_btc_quantity', 'IBIT reported BTC holdings', 'BTC'],
      ['fund_shares_outstanding', 'IBIT shares outstanding', 'shares'],
    ];
    return fields.map(([metric, label, unit]) => {
      const items = source.observations.filter(item => item?.metric === metric);
      assert(items.length === 1, 'invalid_ibit_metric');
      const item = items[0];
      assert(item.unit === unit && item.effectiveAt === asOf && item.timePrecision === 'date' && item.classification === 'issuer-reported', 'invalid_ibit_units');
      const value = decimal(item.value);
      assert(value === item.value && Number(value) >= 0, 'invalid_ibit_value');
      if (unit === 'BTC') assert(Number(value) <= 21_000_000, 'impossible_quantity');
      return { metric, label, value, unit, effectiveAt: asOf, timePrecision: 'date', classification: 'issuer-reported' };
    });
  }
  const releaseRule = RELEASE_RULES[rule.parser];
  assert(releaseRule && isoTime(asOf) && source.observations.length === 1, 'invalid_release_observations');
  const item = source.observations[0];
  assert(item?.metric === 'software_release' && releaseRule.pattern.test(item.value) && item.unit === 'version' && item.effectiveAt === asOf && item.timePrecision === 'second' && item.classification === 'upstream-release', 'invalid_release_observation');
  return [{ metric: 'software_release', label: `${releaseRule.name} latest returned release`, value: item.value, unit: 'version', effectiveAt: asOf, timePrecision: 'second', classification: 'upstream-release' }];
}

export function validateSnapshot(snapshot, registry, policy, now, issueDate = editionDate(now)) {
  validatePolicy(policy);
  const localDate = editionDate(now);
  assert(snapshot?.schemaVersion === 1 && snapshot.publication === 'Lunch Time Conversations' && snapshot.timezone === TIMEZONE && snapshot.editorialStatus === 'automated-source-check', 'invalid_snapshot');
  assert(isoTime(snapshot.generatedAt) && Date.parse(snapshot.generatedAt) <= Date.parse(now), 'future_or_invalid_snapshot');
  assert(Date.parse(now) - Date.parse(snapshot.generatedAt) <= policy.maximumSnapshotAgeHours * 3_600_000, 'snapshot_too_old');
  assert(Array.isArray(registry?.sources) && registry.sources.length === Object.keys(SOURCE_RULES).length, 'incomplete_registry');
  registry.sources.forEach(validateSourceIdentity);
  assert(new Set(registry.sources.map(source => source.id)).size === registry.sources.length, 'duplicate_registry_source');
  assert(Array.isArray(snapshot.sources) && snapshot.sources.length === registry.sources.length && snapshot.sourceCount === registry.sources.length, 'incomplete_snapshot');
  assert(new Set(snapshot.sources.map(source => source?.id)).size === snapshot.sources.length, 'duplicate_snapshot_source');
  const sources = registry.sources.map(expected => {
    const source = snapshot.sources.find(item => item?.id === expected.id);
    assert(source && source.url === expected.url && source.kind === expected.kind && source.parserVersion === expected.parser, 'changed_source_identity');
    assert(source.checkedAt === snapshot.generatedAt && isoTime(source.checkedAt), 'inconsistent_check_time');
    assert(['collected', 'reference-retrieved', 'unavailable'].includes(source.status), 'invalid_source_status');
    assert(source.httpStatus === null || (Number.isInteger(source.httpStatus) && source.httpStatus >= 100 && source.httpStatus <= 599), 'invalid_http_status');
    if (source.status === 'unavailable') {
      assert(source.sourceSha256 === null && typeof source.errorCode === 'string' && /^[a-z_]{3,80}$/.test(source.errorCode), 'invalid_failure_record');
    } else {
      assert(source.httpStatus >= 200 && source.httpStatus < 300 && hash(source.sourceSha256) && source.errorCode === null, 'invalid_success_record');
      if (source.status === 'reference-retrieved') assert(expected.parser === 'source-check-v1', 'missing_expected_parser');
    }
    const observations = normalizeObservations(source, SOURCE_RULES[source.id], source.checkedAt);
    if (isoDate(source.sourceAsOf)) assert(source.sourceAsOf <= issueDate, 'future_edition_source_date');
    if (isoTime(source.sourceAsOf)) assert(editionDate(source.sourceAsOf) <= issueDate, 'future_edition_source_date');
    // The collection's age check is evidence; publication freshness advances with the run clock.
    const publicationFreshness = !source.sourceAsOf ? 'unknown' : Object.hasOwn(TICKER_RULES, expected.parser) ? tickerFreshness(source.sourceAsOf, now) : freshness(source.sourceAsOf, `${localDate}T12:00:00Z`, expected.maxAgeDays);
    return { id: expected.id, title: expected.title, url: expected.url, kind: expected.kind, parserVersion: expected.parser, checkedAt: source.checkedAt, status: source.status, httpStatus: source.httpStatus, sourceAsOf: source.sourceAsOf, sourceSha256: source.sourceSha256, freshness: publicationFreshness, observations, errorCode: source.errorCode };
  });
  assert(snapshot.failureCount === sources.filter(source => source.status === 'unavailable').length, 'inconsistent_failure_count');
  const fresh = sources.filter(source => source.kind === 'primary' && source.status === 'collected' && source.observations?.length && (Object.hasOwn(TICKER_RULES, source.parserVersion) ? tickerFreshness(source.sourceAsOf, now) === 'dated-observation' : (Date.parse(localDate) - Date.parse(source.sourceAsOf.slice(0, 10))) / DAY_MS <= policy.maximumObservationAgeDays));
  assert(fresh.length > 0, 'no_fresh_primary_observation');
  return sources;
}

export function prepareEdition(snapshot, registry, policy, { now = new Date().toISOString(), revision = 1, correctionReason = '', correctsEditionId = null, issueDate = null, coverage = null } = {}) {
  const today = editionDate(now);
  const date = issueDate ?? today;
  assert(isoDate(date) && date <= today && (revision > 1 || date === today), 'invalid_correction_date');
  assert(Number.isSafeInteger(revision) && revision >= 1 && revision <= 99, 'invalid_revision');
  assert(revision === 1 ? !correctionReason && correctsEditionId === null : typeof correctionReason === 'string' && correctionReason.trim().length >= 12 && correctionReason.length <= 600 && correctsEditionId === `${date}-r${revision - 1}`, 'correction_requires_reason_and_predecessor');
  const sources = validateSnapshot(snapshot, registry, policy, now, date);
  const briefs = [];
  const tickers = sources.filter(source => source.status === 'collected' && source.freshness === 'dated-observation' && Object.hasOwn(TICKER_RULES, source.parserVersion));
  for (const ticker of tickers) {
    const quote = ticker.observations[0];
    const rule = TICKER_RULES[ticker.parserVersion];
    briefs.push({ id: ticker.id, desk: 'Market snapshot', headline: `${rule.asset}/USD last trade: $${numberText(quote.value)}`, effectiveAt: ticker.sourceAsOf, sourceIds: [ticker.id], paragraphs: [
      `Coinbase Exchange returned a ${rule.asset}/USD last trade of $${numberText(quote.value)}, timestamped ${ticker.sourceAsOf}. This venue-reported trade was retrieved at ${ticker.checkedAt}; the two times are recorded separately.`,
      `This is one exchange’s sampled last trade, not a global reference price, a live quote after publication or a 24-hour closing price. It does not establish a return, market-wide volume or a trend.`,
      `For newcomers: a quote belongs to a venue, a trading pair and a moment. For experienced readers: inspect the exact decimal value, source timestamp and parser in the sourcebook before making comparisons.`,
    ] });
  }
  const ibit = sources.find(source => source.id === 'ibit-holdings' && source.status === 'collected' && source.freshness !== 'stale');
  const releases = sources.filter(source => source.status === 'collected' && Object.hasOwn(RELEASE_RULES, source.parserVersion));
  if (ibit) {
    const btc = ibit.observations.find(item => item.metric === 'fund_btc_quantity');
    const shares = ibit.observations.find(item => item.metric === 'fund_shares_outstanding');
    const dateLabel = sourceDateLabel(ibit.sourceAsOf);
    briefs.push({ id: 'ibit-holdings', desk: 'Wall Street & institutions', headline: `IBIT’s dated holdings record: ${dateLabel}`, effectiveAt: ibit.sourceAsOf, sourceIds: [ibit.id], paragraphs: [
      `The iShares Bitcoin Trust ETF holdings file reports ${numberText(btc.value)} BTC and ${numberText(shares.value)} shares outstanding as of ${dateLabel}. The source supplies a date, not an intraday timestamp.`,
      `This is an issuer-reported balance at a point in time. It is not a live price, independently audited total or measurement of money entering the fund. Holdings changes alone are not ETF flows.`,
      `For newcomers: read the “as of” date before comparing a number. For experienced readers: the source notebook preserves the exact decimal strings, parser version and retrieved-file hash for this observation.`,
    ] });
  }
  for (const release of releases) {
    const version = release.observations[0].value;
    const rule = RELEASE_RULES[release.parserVersion];
    briefs.push({ id: `${release.id}-release`, desk: release.id === 'lnd' ? 'Lightning & builders' : release.id === 'litecoin-core' ? 'Litecoin & proof of work' : 'Bitcoin & builders', headline: `${rule.name} ${version}: the dated upstream record`, effectiveAt: release.sourceAsOf, sourceIds: [release.id], paragraphs: [
      `The official ${rule.name} repository’s latest-release endpoint returned ${version}, published ${sourceDateLabel(release.sourceAsOf)}. This briefing records the endpoint result; it does not present the release as today’s announcement.`,
      `A version announcement describes software, not adoption across a network or a market forecast. Read the upstream notes and verification instructions before deciding whether an update suits your setup.`,
      ...(release.id === 'lnd' ? ['LND uses a beta suffix in the version name returned by its latest-release endpoint. Our parser preserves that suffix and rejects releases marked as drafts or prereleases by GitHub, as well as release-candidate tags. This is a description of the upstream channel, not a safety certification.'] : []),
    ] });
  }
  const coverageGaps = sources.filter(source => source.status !== 'collected').map(source => source.status === 'unavailable'
    ? `${source.title}: unavailable during this collection${source.httpStatus ? ` (HTTP ${source.httpStatus})` : ''}. No claim or metric is supplied from this source.`
    : `${source.title}: reference page retrieved only; no headline, holding, flow or valuation metric was parsed or verified.`);
  for (const source of sources.filter(source => source.status === 'collected' && source.freshness === 'stale')) coverageGaps.push(Object.hasOwn(TICKER_RULES, source.parserVersion)
    ? `${source.title}: the returned last trade is more than two hours old at edition preparation. It is excluded from price briefs and remains a dated historical observation only.`
    : `${source.title}: its source-effective date exceeds the four-calendar-day observation window. It remains dated historical context, not a fresh reading.`);
  coverageGaps.push('No independently measured network telemetry, ETF/ETP flow series, company mNAV, Litecoin treasury total, consolidated live price, 24-hour return, new political headline or community event report is produced by this bounded edition.');
  const presentation = buildPresentation({ date, briefs });
  return {
    schemaVersion: 1, id: `${date}-r${revision}`, date, revision,
    title: presentation.cover.title,
    dek: presentation.cover.subtitle,
    preparedAt: now, publishedAt: now, timezone: TIMEZONE, status: 'published',
    classification: 'Automated source briefing', byline: 'AI-prepared by LTC Media',
    humanReview: 'Not individually reviewed by a human editor',
    sourceSnapshotSha256: digest(snapshot), publicationPolicy: POLICY_ID,
    briefs, sources, coverageGaps, presentation,
    ...(coverage ? { coverage: buildCoverage({ catalog: coverage.catalog, mapping: coverage.mapping, sources, generatedAt: now }) } : {}),
    corrections: revision === 1 ? [] : [{ reason: correctionReason.trim(), correctsEditionId }],
  };
}

export async function readEditionArchive(directory) {
  await mkdir(directory, { recursive: true });
  const names = (await readdir(directory)).filter(name => /^\d{4}-\d{2}-\d{2}-r[1-9]\d?\.json$/.test(name));
  const editions = await Promise.all(names.map(async name => {
    const edition = JSON.parse(await readFile(path.join(directory, name), 'utf8'));
    assert(edition.id === name.slice(0, -5) && edition.status === 'published' && edition.publicationPolicy === POLICY_ID, 'invalid_archived_edition');
    return edition;
  }));
  return editions.sort((a, b) => b.date.localeCompare(a.date) || b.revision - a.revision);
}

async function writeIndex(directory, editions) {
  const temporary = path.join(directory, `.index-${process.pid}.json`);
  await writeFile(temporary, `${JSON.stringify(editions, null, 2)}\n`, { flag: 'wx' });
  await rename(temporary, path.join(directory, 'index.json'));
}

export async function publishEdition(edition, { directory, policy }) {
  validatePolicy(policy);
  assert(edition.publicationPolicy === POLICY_ID && edition.status === 'published' && edition.id === `${edition.date}-r${edition.revision}` && /^\d{4}-\d{2}-\d{2}-r[1-9]\d?$/.test(edition.id), 'invalid_edition');
  await mkdir(directory, { recursive: true });
  const lockPath = path.join(directory, '.publish-lock');
  let lock;
  try { lock = await open(lockPath, 'wx'); } catch (error) { if (error.code === 'EEXIST') throw new Error('publication_already_running'); throw error; }
  try {
    const archived = await readEditionArchive(directory);
    const sameDay = archived.filter(item => item.date === edition.date);
    const existing = archived.find(item => item.id === edition.id);
    if (existing) {
      // A normal repeated run never replaces the first edition, even when the source changes.
      await writeIndex(directory, archived);
      const current = edition.revision === 1 ? sameDay[0] : existing;
      return { status: 'unchanged', id: current.id, edition: current };
    }
    validatePresentation(edition.presentation, edition);
    if (edition.coverage) validateCoverage(edition.coverage, { sources: edition.sources, generatedAt: edition.preparedAt });
    if (edition.revision === 1) assert(sameDay.length === 0, 'edition_revision_conflict');
    else assert(sameDay[0]?.revision === edition.revision - 1 && edition.corrections[0]?.correctsEditionId === sameDay[0].id && edition.corrections[0]?.reason?.trim().length >= 12, 'missing_correction_predecessor');
    await writeFile(path.join(directory, `${edition.id}.json`), `${JSON.stringify(edition, null, 2)}\n`, { flag: 'wx' });
    await writeIndex(directory, [edition, ...archived].sort((a, b) => b.date.localeCompare(a.date) || b.revision - a.revision));
    return { status: 'published-locally', id: edition.id, edition };
  } finally { await lock.close(); await unlink(lockPath); }
}

function argumentsFor(args) {
  const result = { snapshot: '', output: '', publish: false, revision: 1, correctionReason: '', issueDate: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--publish') { result.publish = true; continue; }
    const fields = { '--snapshot': 'snapshot', '--output': 'output', '--revision': 'revision', '--correction-reason': 'correctionReason', '--correct-date': 'issueDate' };
    const field = fields[args[i]];
    assert(field && typeof args[i + 1] === 'string' && !args[i + 1].startsWith('--'), 'invalid_arguments');
    result[field] = field === 'revision' ? Number(args[++i]) : args[++i];
  }
  assert(result.snapshot, 'snapshot_argument_required');
  assert(!result.issueDate || result.revision > 1, 'correction_date_requires_revision');
  return result;
}

async function main() {
  const args = argumentsFor(process.argv.slice(2));
  const [snapshot, registry, policy, catalog, mapping] = await Promise.all([
    readFile(path.resolve(args.snapshot), 'utf8').then(JSON.parse),
    readFile(path.join(root, 'config/ltc-sources.json'), 'utf8').then(JSON.parse),
    readFile(path.join(root, 'config/ltc-publication.json'), 'utf8').then(JSON.parse),
    readFile(path.join(root, 'content/ltc-desks.json'), 'utf8').then(JSON.parse),
    readFile(path.join(root, 'config/ltc-coverage.json'), 'utf8').then(JSON.parse),
  ]);
  const now = new Date().toISOString();
  const edition = prepareEdition(snapshot, registry, policy, { now, revision: args.revision, issueDate: args.issueDate, correctionReason: args.correctionReason, correctsEditionId: args.revision > 1 ? `${args.issueDate ?? editionDate(now)}-r${args.revision - 1}` : null, coverage: { catalog, mapping } });
  const candidate = { ...edition, status: 'candidate', publishedAt: null };
  if (args.output) { const output = path.resolve(args.output); await mkdir(path.dirname(output), { recursive: true }); await writeFile(output, `${JSON.stringify(candidate, null, 2)}\n`); }
  if (args.publish) {
    const result = await publishEdition(edition, { directory: path.join(root, 'content/ltc'), policy });
    console.log(JSON.stringify({ status: result.status, id: result.id, sourceSnapshotSha256: result.edition.sourceSnapshotSha256, deployed: false }));
  } else if (!args.output) process.stdout.write(`${JSON.stringify(candidate, null, 2)}\n`);
  else console.log(JSON.stringify({ status: 'candidate', id: edition.id, deployed: false }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(error => { console.error(`LTC edition withheld: ${error.message}`); process.exitCode = 1; });
