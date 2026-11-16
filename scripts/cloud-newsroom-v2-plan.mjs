/**
 * Pure admission planner for a NEW publisher generation. No IO, clocks, locks,
 * credentials, writes or publication are performed here. External proofs are
 * caller-supplied attestations: the future effect runner must obtain/verify them
 * independently and recheck CAS/production identity immediately before effects.
 * `draft-ready` is not publication approval or evidence that anything ran.
 */
export const GENERATION = 'cloud-newsroom-v2';
export const PRIMARY_HOSTS = Object.freeze([
  'litecoin.com', 'litecoin.org', 'github.com', 'api.exchange.coinbase.com',
  'litecoinregister.com', 'docs.litvm.com', 'testnet.litvm.com',
  'greywick.digital', 'www.lithiumlend.com', 'litestrategy.gcs-web.com',
  'www.dtcc.com', 'blog.digitalasset.com', 'canton.foundation',
  'www.sec.gov', 'www.cftc.gov', 'api.blockcypher.com',
  'explorer.testnet.liteforge.zeeve.net',
]);
const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40}$/;
const ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PROOF_AGE_MS = 5 * 60_000;
const MAX_CHECK_AGE_SECONDS = 86_400;
const matches = (pattern, value) => typeof value === 'string' && pattern.test(value);
const obj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const validDay = x => typeof x === 'string' && DAY.test(x) &&
  Number.isFinite(Date.parse(`${x}T00:00:00Z`)) && new Date(`${x}T00:00:00Z`).toISOString().slice(0, 10) === x;
const stamp = x => typeof x === 'string' && validDay(x.slice(0, 10)) && Number(x.slice(11, 13)) < 24 && Number(x.slice(14, 16)) < 60 && Number(x.slice(17, 19)) < 60 && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(x) ? Date.parse(x) : NaN;
function nyDay(ms) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(ms).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function primaryUrl(value) {
  try {
    if (typeof value !== 'string') return false;
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password && !u.port &&
      PRIMARY_HOSTS.includes(u.hostname) && !u.hash;
  } catch { return false; }
}
/** See fixture in test-cloud-newsroom-v2-plan.mjs for the explicit input schema. */
export function planCloudNewsroomV2(input) {
  const errors = [], withheld = [];
  let disposition = 'admission-blocked';
  const fail = code => { if (!errors.includes(code)) errors.push(code); };
  const finish = outputs => ({
    schemaVersion: 1, generation: GENERATION,
    status: errors.length ? 'blocked' : 'draft-ready',
    disposition: errors.length ? disposition : 'new-generation-draft',
    reasons: errors, withheldCoverage: withheld,
    idempotencyKey: validDay(input?.editionDate) && matches(SHA, input?.artifactSha256 ?? '') ? `${GENERATION}:${input.editionDate}:${input.artifactSha256}` : null,
    outputs: errors.length ? [] : outputs,
    effects: [],
    limitations: ['External attestations are not independently verified by this pure function.', 'Draft readiness never authorizes or executes publication. Revalidate every gate at action time.'],
  });
  if (!obj(input)) { fail('invalid_input'); return finish([]); }
  if (input.schemaVersion !== 1 || input.generation !== GENERATION) fail('new_generation_required');
  const now = stamp(input.now);
  if (!Number.isFinite(now)) fail('invalid_now');
  if (!validDay(input.editionDate) || (Number.isFinite(now) && input.editionDate !== nyDay(now))) fail('edition_date_not_current_new_york_day');
  if (!matches(COMMIT, input.sourceCommit ?? '')) fail('invalid_source_commit');
  if (!matches(SHA, input.implementationSha256 ?? '')) fail('invalid_implementation_digest');
  if (!matches(SHA, input.artifactSha256 ?? '')) fail('invalid_artifact_digest');
  const base = input.baseProduction;
  if (!obj(base) || !matches(ID, base.deploymentId ?? '') || !matches(COMMIT, base.sourceCommit ?? '')) fail('invalid_production_baseline');
  // Same canonical artifact is a no-op, even if an upstream writer calls it a
  // different run. Different bytes require an explicit new correction revision.
  const existing = input.existingDailyIssue;
  let correction = false;
  if (existing !== null) {
    if (!obj(existing) || !validDay(existing.editionDate) || !matches(SHA, existing.artifactSha256 ?? '') || !['draft', 'published'].includes(existing.status)) fail('invalid_existing_daily_issue');
    else if (existing.editionDate > input.editionDate) fail('existing_issue_in_future');
    else if (existing.editionDate === input.editionDate) {
      if (existing.artifactSha256 === input.artifactSha256) {
        disposition = 'duplicate-no-op'; fail('canonical_daily_artifact_already_exists');
      } else correction = true;
    }
  }
  const required = input.requiredCoverage;
  if (!Array.isArray(required) || required.length === 0 || required.some(id => typeof id !== 'string' || !matches(ID, id)) || new Set(required).size !== required.length) fail('invalid_required_coverage');
  const observations = input.observations;
  if (!Array.isArray(observations) || observations.length === 0) fail('missing_observations');
  else {
    const seen = new Set();
    for (const o of observations) {
      const id = obj(o) && typeof o.id === 'string' && matches(ID, o.id) ? o.id : '<invalid>';
      const reasons = [];
      if (id === '<invalid>' || seen.has(id)) reasons.push('invalid_or_duplicate_id');
      seen.add(id);
      if (!obj(o)) reasons.push('malformed_observation');
      else {
        const checked = stamp(o.checkedAt), asOf = stamp(o.sourceAsOf);
        const checkAge = o.maxCheckAgeSeconds, sourceAge = o.maxSourceAgeSeconds;
        if (!primaryUrl(o.url) || o.primary !== true) reasons.push('primary_https_source_required');
        if (o.status !== 'verified' || o.claimVerified !== true || (!['string', 'number', 'boolean'].includes(typeof o.value) || (typeof o.value === 'number' && !Number.isFinite(o.value)) || (typeof o.value === 'string' && !o.value.trim()))) reasons.push('unverified_or_missing_value');
        if (!['current', 'historical'].includes(o.classification)) reasons.push('invalid_classification');
        if (!Number.isSafeInteger(checkAge) || checkAge <= 0 || checkAge > MAX_CHECK_AGE_SECONDS) reasons.push('invalid_check_age_bound');
        if (!Number.isFinite(checked) || checked > now || now - checked > checkAge * 1000) reasons.push('stale_or_future_check');
        if (!Number.isFinite(asOf) || asOf > now || asOf > checked) reasons.push('missing_or_future_source_date');
        if (o.publishedAt !== null) {
          const published = stamp(o.publishedAt);
          if (!Number.isFinite(published) || published > now || published > checked) reasons.push('invalid_or_future_publication_date');
        }
        if (o.classification === 'current' && (!Number.isSafeInteger(sourceAge) || sourceAge <= 0 || sourceAge > MAX_CHECK_AGE_SECONDS || now - asOf > sourceAge * 1000)) reasons.push('stale_current_observation');
        if (o.classification === 'historical' && (o.label !== 'Dated historical observation; not current' || o.maxSourceAgeSeconds !== null)) reasons.push('historical_date_label_required');
      }
      if (reasons.length) {
        // No stale/unverified raw value or prose is ever returned in a blocked plan.
        withheld.push({ id, value: null, reasons }); fail(`coverage_withheld:${id}`);
      }
    }
    if (Array.isArray(required)) for (const id of required) if (!seen.has(id)) { withheld.push({ id, value: null, reasons: ['coverage_gap'] }); fail(`coverage_gap:${id}`); }
  }
  const gates = obj(input.gates) ? input.gates : {};
  const proof = (name, extra) => {
    const p = gates[name], at = stamp(p?.checkedAt);
    if (!obj(p) || p.verified !== true || !Number.isFinite(at) || at > now || now - at > MAX_PROOF_AGE_MS ||
      p.sourceCommit !== input.sourceCommit || p.implementationSha256 !== input.implementationSha256 || p.artifactSha256 !== input.artifactSha256 || !extra(p)) fail(`gate_failed:${name}`);
  };
  proof('durableSource', p => p.reviewed === true && p.durable === true && p.immutable === true);
  proof('oldWriters', p => p.disabled === true && p.activeRuns === 0 && p.completeInventory === true);
  proof('cloudLease', p => p.isolated === true && p.casAcquired === true && p.generation === GENERATION &&
    matches(ID, p.ownerId ?? '') && matches(ID, p.fencingToken ?? '') && stamp(p.acquiredAt) <= now &&
    stamp(p.acquiredAt) <= stamp(p.checkedAt) && stamp(p.expiresAt) > now && stamp(p.expiresAt) - now <= 15 * 60_000);
  proof('productionComparison', p => obj(base) && p.exactCandidate === true &&
    p.expectedDeploymentId === base.deploymentId && p.actualDeploymentId === base.deploymentId &&
    p.expectedDeployedSource === base.sourceCommit && p.actualDeployedSource === base.sourceCommit &&
    p.candidateSourceCommit === input.sourceCommit && p.candidateArtifactSha256 === input.artifactSha256);
  proof('historyIsolation', p => p.oldLedgerMutation === false && p.historicalDocumentsMutation === false && p.newGenerationOnly === true);
  proof('researchCredentials', p => p.productionCredentialsAvailable === false && p.credentialBoundaryEnforced === true);
  if (correction) proof('correction', p => p.approved === true && matches(ID, p.approvalId ?? '') &&
    p.editionDate === input.editionDate && p.replacesArtifactSha256 === existing.artifactSha256 &&
    p.newArtifactSha256 === input.artifactSha256 && p.preservePublishedOriginal === true);
  if (!Number.isFinite(now)) fail('invalid_now');
  return finish([
    { kind: correction ? 'new-correction-revision' : 'new-daily-record', namespace: GENERATION,
      editionDate: input.editionDate, artifactSha256: input.artifactSha256, sourceCommit: input.sourceCommit,
      preservePriorArtifacts: true },
    { kind: 'current-pointer-proposal', namespace: GENERATION,
      targets: ['community-home', 'magazine-home', 'daily-index', 'archive-current', 'shared-navigation', 'desk-current-issue', 'promotional-links'],
      editionDate: input.editionDate, artifactSha256: input.artifactSha256,
      historicalDocuments: 'untouched', oldLedgers: 'untouched' },
  ]);
}
