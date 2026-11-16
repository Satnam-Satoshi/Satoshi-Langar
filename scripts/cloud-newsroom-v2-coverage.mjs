import { createHash } from 'node:crypto';

const fail = message => { throw new Error(`Coverage contract: ${message}`); };
const object = (x, label) => { if (!x || typeof x !== 'object' || Array.isArray(x)) fail(label); return x; };
const array = (x, label) => { if (!Array.isArray(x)) fail(label); return x; };
const id = x => typeof x === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$/.test(x);
const sha = x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
export function canonical(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  object(value, 'non-JSON value');
  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) fail('non-plain JSON object');
  return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
}
export const digest = value => createHash('sha256').update(canonical(value)).digest('hex');
export const bytesDigest = bytes => createHash('sha256').update(bytes).digest('hex');
const index = (rows, label, valid = id) => {
  const result = new Map();
  for (const row of array(rows, label)) {
    object(row, label);
    if (!valid(row.id) || result.has(row.id)) fail(`${label} invalid/duplicate ID`);
    result.set(row.id, row);
  }
  return result;
};
const time = (value, now, label) => {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)) fail(`${label} ISO UTC date required`);
  const n = Date.parse(value);
  if (!Number.isFinite(n) || new Date(n).toISOString() !== value || n > now) fail(`${label} invalid/future date`);
  return n;
};
const frozen = x => { if (x && typeof x === 'object') { Object.values(x).forEach(frozen); Object.freeze(x); } return x; };
const worst = values => ['not-attempted', 'unavailable', 'needs-extraction', 'verified-stale', 'verified-current'].find(s => values.includes(s)) ?? 'not-attempted';

/** Pure report. Inputs must be supplied by a trusted adapter; this is not a verifier or publisher. */
export function compileCoverage(input) {
  object(input, 'input');
  const { registry, expectedRegistryDigest, scan, extractions, outline, marketing, now } = input;
  const clock = time(now, Infinity, 'now');
  object(registry, 'registry');
  const productionShape = registry.generation === 'cloud-newsroom-v2';
  const actualPin = productionShape ? bytesDigest(JSON.stringify(registry)) : digest(registry);
  if (!sha(expectedRegistryDigest) || actualPin !== expectedRegistryDigest) fail('registry pin mismatch');
  if (productionShape && registry.schemaVersion !== 1) fail('registry schema');
  const declaredSources = array(registry.sources, 'sources');
  const deskDeclarations = productionShape ? [...new Set(declaredSources.map(s => s.desk))].map(id => ({id})) : registry.desks;
  const desks = index(deskDeclarations, 'desks', v => typeof v === 'string' && v.trim() === v && v.length > 0 && v.length <= 160);
  const sources = index(productionShape ? declaredSources.map(s => ({...s,deskId:s.desk,maxAgeMs:s.maxCheckAgeHours*3600000})) : declaredSources, 'sources');
  if (!desks.size || !sources.size) fail('empty registry');
  for (const source of sources.values()) {
    if (!desks.has(source.deskId)) fail('unknown source desk');
    if (!Number.isSafeInteger(source.maxAgeMs) || source.maxAgeMs <= 0) fail('source freshness window');
  }
  for (const envelope of [scan, extractions, outline, marketing]) {
    object(envelope, 'envelope');
    if ((envelope === scan && productionShape ? envelope.registrySha256 : envelope.registryDigest) !== expectedRegistryDigest) fail('envelope registry mismatch');
  }
  if (productionShape && (scan.mode !== 'read-only-source-scan' || scan.schemaVersion !== 1 || scan.generation !== 'cloud-newsroom-v2')) fail('scan schema');
  const scanRows = productionShape ? array(scan.observations, 'observations').map(o => {
    const source = sources.get(o.sourceId);
    if (!source || o.url !== source.url) fail('scan URL/source mismatch');
    if (!['retrieved-uninterpreted','unavailable','redirect-needs-review','unsupported-media'].includes(o.status)) fail('unknown retrieval status');
    return {id:o.sourceId,attemptedAt:o.checkedAt,outcome:o.status === 'retrieved-uninterpreted' ? 'retrieved' : 'unavailable',contentDigest:o.sha256,retrievalExpiresAt:o.retrievalExpiresAt,retrievalStatus:o.status,reason:o.reason ?? null};
  }) : scan.sources;
  const scans = index(scanRows, 'scan sources');
  const records = index(extractions.sources, 'extraction sources');
  for (const key of [...scans.keys(), ...records.keys()]) if (!sources.has(key)) fail('unknown source ID');
  const sourceRows = [...sources.values()].map(source => {
    const attempt = scans.get(source.id), record = records.get(source.id);
    let status = 'not-attempted', change = 'unknown', evidence = null;
    if (attempt) {
      const attemptedAt = time(attempt.attemptedAt, clock, 'attempt');
      if (!['unavailable', 'retrieved'].includes(attempt.outcome)) fail('unknown scan outcome');
      status = attempt.outcome === 'unavailable' ? 'unavailable' : 'needs-extraction';
      if (attempt.outcome === 'retrieved' && !sha(attempt.contentDigest)) fail('retrieval evidence digest missing');
      const retrievalExpiresAt = attempt.outcome === 'retrieved' ? time(attempt.retrievalExpiresAt, Infinity, 'retrieval expiry') : null;
      if (retrievalExpiresAt !== null && retrievalExpiresAt <= attemptedAt) fail('retrieval expiry must follow retrieval');
      if (attempt.outcome === 'unavailable' && (attempt.contentDigest != null || record)) fail('unavailable source carries extraction/content evidence');
      if (record) {
        if (record.verification !== 'independently-verified' || !id(record.parserId) || typeof record.evidenceLocator !== 'string' || !record.evidenceLocator.trim()) fail('independent extraction evidence missing');
        if (typeof record.observedBytes !== 'string' || record.observedBytes.length === 0) fail('observed bytes missing');
        if (!sha(record.contentDigest) || bytesDigest(record.observedBytes) !== record.contentDigest || record.contentDigest !== attempt.contentDigest) fail('evidence digest mismatch');
        const retrievedAt = time(record.retrievedAt, clock, 'retrieved');
        const observedAt = time(record.observedAt, clock, 'observed');
        const verifiedAt = time(record.verifiedAt, clock, 'verified');
        if (retrievedAt !== attemptedAt || observedAt > retrievedAt || verifiedAt < retrievedAt) fail('inconsistent evidence chronology');
        object(record.material, 'material extraction missing');
        if (!Object.keys(record.material).length) fail('empty material extraction');
        const materialDigest = digest(record.material);
        if (!sha(record.materialDigest) || materialDigest !== record.materialDigest) fail('material digest mismatch');
        if (record.previousMaterialDigest != null && !sha(record.previousMaterialDigest)) fail('invalid prior material digest');
        change = record.previousMaterialDigest == null ? 'first-observation' : record.previousMaterialDigest === materialDigest ? 'retrieval-only' : 'material-change';
        const policyExpiresAt = time(record.expiresAt, Infinity, 'independent extraction-policy expiry');
        if (policyExpiresAt <= observedAt) fail('extraction-policy expiry must follow observation');
        const effectiveExpiresAt = Math.min(observedAt + source.maxAgeMs, retrievalExpiresAt, policyExpiresAt);
        status = clock < effectiveExpiresAt ? 'verified-current' : 'verified-stale';
        evidence = { contentDigest: record.contentDigest, materialDigest, observedAt: record.observedAt, retrievedAt: record.retrievedAt, verifiedAt: record.verifiedAt, retrievalExpiresAt: attempt.retrievalExpiresAt, policyExpiresAt: record.expiresAt, effectiveExpiresAt: new Date(effectiveExpiresAt).toISOString() };
      }
    } else if (record) fail('extraction without retrieval');
    return { id: source.id, deskId: source.deskId, status, retrievalStatus: attempt?.retrievalStatus ?? attempt?.outcome ?? 'not-attempted', reason: attempt?.reason ?? null, change, evidence };
  });
  const sourceIndex = new Map(sourceRows.map(row => [row.id, row]));
  const stories = index(outline.stories, 'stories');
  if (!sha(input.expectedOutlineDigest) || digest(outline) !== input.expectedOutlineDigest) fail('trusted outline pin mismatch');
  const platforms = array(outline.platforms, 'outline platforms');
  if (!platforms.length || new Set(platforms).size !== platforms.length || platforms.some(p => !id(p))) fail('invalid/duplicate required platform');
  const reportRows = [];
  for (const batch of array(marketing.batches, 'marketing batches')) {
    object(batch, 'marketing batch');
    reportRows.push(...array(batch.stories, 'marketing stories'));
  }
  const reports = new Map();
  for (const report of reportRows) {
    object(report, 'marketing report');
    if (!stories.has(report.id) || !platforms.includes(report.platform)) fail('unknown marketing story/platform');
    const key = JSON.stringify([report.id, report.platform]);
    if (reports.has(key)) fail('duplicate marketing story/platform');
    reports.set(key, report);
  }
  const storyRows = [...stories.values()].map(story => {
    if (!desks.has(story.deskId) || !sha(story.storyDigest)) fail('invalid story desk/digest');
    const refs = array(story.sourceIds, 'story sources');
    if (!refs.length || new Set(refs).size !== refs.length || refs.some(ref => !sources.has(ref))) fail('unknown/duplicate/missing story source');
    if (!['pending', 'prepared'].includes(story.editorialState)) fail('story editorial state');
    const status = worst(refs.map(ref => sourceIndex.get(ref).status));
    const campaigns = platforms.map(platform => {
    const report = reports.get(JSON.stringify([story.id, platform]));
    if (report) {
      if (report.storyDigest !== story.storyDigest) fail('marketing story digest mismatch');
      if (!['pending', 'prepared'].includes(report.assetState) || !['pending', 'queued', 'published'].includes(report.postState)) fail('marketing state');
      if (report.assetState === 'prepared' && !sha(report.assetDigest)) fail('asset digest missing');
      if (report.postState !== 'pending' && (report.assetState !== 'prepared' || typeof report.receiptId !== 'string' || !report.receiptId.trim())) fail('marketing receipt missing');
      time(report.reportedAt, clock, 'marketing report');
    }
    return { platform, assetState: report?.assetState === 'prepared' ? 'prepared-reported' : 'pending',
      postState: report && report.postState !== 'pending' ? `${report.postState}-reported` : 'pending',
      publicationVerified: false };
    });
    return { id: story.id, deskId: story.deskId, storyDigest: story.storyDigest, sourceIds: [...refs], status,
      storyState: story.editorialState === 'prepared' && status === 'verified-current' ? 'prepared' : 'pending', campaigns };
  });
  const deskRows = [...desks.values()].map(desk => {
    const ownSources = sourceRows.filter(row => row.deskId === desk.id);
    const ownStories = storyRows.filter(row => row.deskId === desk.id);
    return { id: desk.id, status: worst(ownSources.map(row => row.status)), sourceIds: ownSources.map(row => row.id), storyIds: ownStories.map(row => row.id), gaps: ownSources.filter(row => row.status !== 'verified-current').map(row => row.id), editorialReady: ownSources.length > 0 && ownStories.length > 0 && ownSources.every(row => row.status === 'verified-current') && ownStories.every(row => row.storyState === 'prepared') };
  });
  return frozen({ schemaVersion: 1, evaluatedAt: now, registryDigest: expectedRegistryDigest, outlineDigest: input.expectedOutlineDigest, operational: false, publishAllowed: false, effects: [], desks: deskRows, sources: sourceRows, stories: storyRows });
}

